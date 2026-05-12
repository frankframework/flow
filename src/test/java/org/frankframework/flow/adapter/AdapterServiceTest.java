package org.frankframework.flow.adapter;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import org.frankframework.flow.configuration.ConfigurationFile;
import org.frankframework.flow.configuration.ConfigurationNotFoundException;
import org.frankframework.flow.configuration.ConfigurationXmlDTO;
import org.frankframework.flow.exception.ApiException;
import org.frankframework.flow.filesystem.FileSystemStorage;
import org.frankframework.flow.project.ConfigurationProject;
import org.frankframework.flow.project.ConfigurationProjectService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.api.io.TempDir;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;

@ExtendWith(MockitoExtension.class)
class AdapterServiceTest {

	private AdapterService adapterService;

	@Mock
	private ConfigurationProjectService configurationProjectService;

	@Mock
	private FileSystemStorage fileSystemStorage;

	@TempDir
	Path tempDir;

	@BeforeEach
	void setUp() {
		adapterService = new AdapterService(configurationProjectService, fileSystemStorage);
	}

	@Test
	void getAdapter_returnsXmlDtoContainingAdapterContent() throws Exception {
		String xml = "<ConfigurationFile><Adapter name=\"MyAdapter\"><SomePipe/></Adapter></ConfigurationFile>";
		ConfigurationFile config = configWith("config.xml", xml);
		ConfigurationProject configurationProject = projectWith("proj", config);

		when(configurationProjectService.getProject("proj")).thenReturn(configurationProject);

		ConfigurationXmlDTO result = adapterService.getAdapter("proj", "config.xml", "MyAdapter");

		assertNotNull(result);
		assertTrue(result.xmlContent().contains("MyAdapter"));
		assertTrue(result.xmlContent().contains("SomePipe"));
	}

	@Test
	void getAdapter_throwsProjectNotFound_whenProjectDoesNotExist() throws Exception {
		when(configurationProjectService.getProject("missing"))
				.thenThrow(new ApiException("Project not found: missing", HttpStatus.NOT_FOUND));

		assertThrows(
				ApiException.class,
				() -> adapterService.getAdapter("missing", "config.xml", "SomeAdapter")
		);
	}

	@Test
	void getAdapter_throwsConfigurationNotFound_whenNoMatchingConfigPath() throws Exception {
		ConfigurationProject configurationProject = new ConfigurationProject("proj", "/path");
		when(configurationProjectService.getProject("proj")).thenReturn(configurationProject);

		assertThrows(
				ConfigurationNotFoundException.class,
				() -> adapterService.getAdapter("proj", "nonexistent.xml", "SomeAdapter")
		);
	}

	@Test
	void getAdapter_throwsConfigurationNotFound_whenConfigPathMismatch_evenIfOtherConfigsPresent() throws Exception {
		ConfigurationFile config = configWith("config1.xml", "<ConfigurationFile><Adapter name=\"A\"/></ConfigurationFile>");
		ConfigurationProject configurationProject = projectWith("proj", config);

		when(configurationProjectService.getProject("proj")).thenReturn(configurationProject);

		assertThrows(ConfigurationNotFoundException.class, () -> adapterService.getAdapter("proj", "config2.xml", "A"));
	}

	@Test
	void getAdapter_throwsAdapterNotFound_whenAdapterNameDoesNotExist() throws Exception {
		String xml = "<ConfigurationFile><Adapter name=\"ExistingAdapter\"/></ConfigurationFile>";
		ConfigurationFile config = configWith("config.xml", xml);
		ConfigurationProject configurationProject = projectWith("proj", config);

		when(configurationProjectService.getProject("proj")).thenReturn(configurationProject);

		assertThrows(
				AdapterNotFoundException.class, () -> adapterService.getAdapter("proj", "config.xml", "NonExistent"));
	}

	@Test
	void getAdapter_throwsAdapterNotFound_whenConfigXmlHasNoAdapters() throws Exception {
		ConfigurationFile config = configWith("config.xml", "<ConfigurationFile/>");
		ConfigurationProject configurationProject = projectWith("proj", config);

		when(configurationProjectService.getProject("proj")).thenReturn(configurationProject);

		assertThrows(
				AdapterNotFoundException.class, () -> adapterService.getAdapter("proj", "config.xml", "AnyAdapter"));
	}

	@Test
	void getAdapter_returnsOnlyRequestedAdapter_whenMultipleAdaptersPresent() throws Exception {
		String xml = "<ConfigurationFile>"
				+ "<Adapter name=\"First\"><PipeA/></Adapter>"
				+ "<Adapter name=\"Second\"><PipeB/></Adapter>"
				+ "</ConfigurationFile>";
		ConfigurationFile config = configWith("config.xml", xml);
		ConfigurationProject configurationProject = projectWith("proj", config);

		when(configurationProjectService.getProject("proj")).thenReturn(configurationProject);

		ConfigurationXmlDTO result = adapterService.getAdapter("proj", "config.xml", "Second");

		assertTrue(result.xmlContent().contains("Second"));
		assertTrue(result.xmlContent().contains("PipeB"));
		assertFalse(result.xmlContent().contains("First"), "Should not include unrelated adapter");
		assertFalse(result.xmlContent().contains("PipeA"), "Should not include unrelated adapter content");
	}

	@Test
	void getAdapter_selectsCorrectConfiguration_whenProjectHasMultipleConfigs() throws Exception {
		ConfigurationFile config1 =
				configWith("config1.xml", "<ConfigurationFile><Adapter name=\"AdapterA\"/></ConfigurationFile>");
		ConfigurationFile config2 =
				configWith("config2.xml", "<ConfigurationFile><Adapter name=\"AdapterB\"/></ConfigurationFile>");

		ConfigurationProject configurationProject = new ConfigurationProject("proj", "/path");
		configurationProject.addConfiguration(config1);
		configurationProject.addConfiguration(config2);

		when(configurationProjectService.getProject("proj")).thenReturn(configurationProject);

		ConfigurationXmlDTO result = adapterService.getAdapter("proj", "config2.xml", "AdapterB");

		assertTrue(result.xmlContent().contains("AdapterB"));
		assertFalse(result.xmlContent().contains("AdapterA"), "Should return content from config2 only");
	}

	@Test
	void updateAdapter_returnsTrueAndWritesUpdatedXmlToDisk() throws Exception {
		String original = "<ConfigurationFile><Adapter name=\"MyAdapter\"><OldPipe/></Adapter></ConfigurationFile>";
		String replacement = "<Adapter name=\"MyAdapter\"><NewPipe/></Adapter>";

		Path configFile = tempDir.resolve("config.xml");
		Files.writeString(configFile, original, StandardCharsets.UTF_8);
		when(fileSystemStorage.toAbsolutePath(configFile.toString())).thenReturn(configFile);

		boolean result = adapterService.updateAdapter(configFile, "MyAdapter", replacement);

		assertTrue(result);
		String written = Files.readString(configFile, StandardCharsets.UTF_8);
		assertTrue(written.contains("NewPipe"), "Updated content should be written to disk");
		assertFalse(written.contains("OldPipe"), "Old content should be removed");
	}

	@Test
	void updateAdapter_throwsConfigurationNotFound_whenFileDoesNotExist() throws Exception {
		Path missing = tempDir.resolve("missing.xml");
		when(fileSystemStorage.toAbsolutePath(missing.toString())).thenReturn(missing);

		assertThrows(
				ConfigurationNotFoundException.class,
				() -> adapterService.updateAdapter(missing, "SomeAdapter", "<Adapter name=\"SomeAdapter\"/>")
		);
	}

	@Test
	void updateAdapter_throwsAdapterNotFound_whenAdapterNotPresentInFile() throws Exception {
		String xml = "<ConfigurationFile><Adapter name=\"ExistingAdapter\"/></ConfigurationFile>";
		Path configFile = tempDir.resolve("config.xml");
		Files.writeString(configFile, xml, StandardCharsets.UTF_8);
		when(fileSystemStorage.toAbsolutePath(configFile.toString())).thenReturn(configFile);

		assertThrows(
				AdapterNotFoundException.class,
				() -> adapterService.updateAdapter(configFile, "NonExistent", "<Adapter name=\"NonExistent\"/>")
		);
	}

	@Test
	void updateAdapter_returnsFalse_whenReplacementXmlIsMalformed() throws Exception {
		String xml = "<ConfigurationFile><Adapter name=\"MyAdapter\"/></ConfigurationFile>";
		Path configFile = tempDir.resolve("config.xml");
		Files.writeString(configFile, xml, StandardCharsets.UTF_8);
		when(fileSystemStorage.toAbsolutePath(configFile.toString())).thenReturn(configFile);

		boolean result = adapterService.updateAdapter(configFile, "MyAdapter", "<<not valid xml>>");

		assertFalse(result, "Should return false for malformed replacement XML");
	}

	@Test
	void updateAdapter_returnsFalse_whenConfigFileContainsMalformedXml() throws Exception {
		Path configFile = tempDir.resolve("corrupt.xml");
		Files.writeString(configFile, "<<< this is not xml >>>", StandardCharsets.UTF_8);
		when(fileSystemStorage.toAbsolutePath(configFile.toString())).thenReturn(configFile);

		boolean result = adapterService.updateAdapter(configFile, "SomeAdapter", "<Adapter name=\"SomeAdapter\"/>");

		assertFalse(result, "Should return false when config file itself is invalid XML");
	}

	@Test
	void updateAdapter_preservesOtherAdapters_whenReplacingOneAdapter() throws Exception {
		String original = "<ConfigurationFile>"
				+ "<Adapter name=\"First\"><OldContent/></Adapter>"
				+ "<Adapter name=\"Second\"><KeepThis/></Adapter>"
				+ "</ConfigurationFile>";
		String replacement = "<Adapter name=\"First\"><NewContent/></Adapter>";

		Path configFile = tempDir.resolve("config.xml");
		Files.writeString(configFile, original, StandardCharsets.UTF_8);
		when(fileSystemStorage.toAbsolutePath(configFile.toString())).thenReturn(configFile);

		boolean result = adapterService.updateAdapter(configFile, "First", replacement);

		assertTrue(result);
		String written = Files.readString(configFile, StandardCharsets.UTF_8);
		assertTrue(written.contains("NewContent"), "Replaced adapter should have new content");
		assertFalse(written.contains("OldContent"), "Replaced adapter should not have old content");
		assertTrue(written.contains("Second"), "Unmodified adapter element should be preserved");
		assertTrue(written.contains("KeepThis"), "Unmodified adapter content should be preserved");
	}

	@Test
	void updateAdapter_matchesLowercaseAdapterTag() throws Exception {
		String xml = "<ConfigurationFile><adapter name=\"myAdapter\"><oldPipe/></adapter></ConfigurationFile>";
		String replacement = "<adapter name=\"myAdapter\"><newPipe/></adapter>";

		Path configFile = tempDir.resolve("config.xml");
		Files.writeString(configFile, xml, StandardCharsets.UTF_8);
		when(fileSystemStorage.toAbsolutePath(configFile.toString())).thenReturn(configFile);

		boolean result = adapterService.updateAdapter(configFile, "myAdapter", replacement);

		assertTrue(result);
		String written = Files.readString(configFile, StandardCharsets.UTF_8);
		assertTrue(written.contains("newPipe"), "Should update lowercase adapter tag");
		assertFalse(written.contains("oldPipe"), "Old content should be removed");
	}

	@Test
	void updateAdapter_handlesAdapterWithNestedChildren() throws Exception {
		String original = "<ConfigurationFile>"
				+ "<Adapter name=\"Complex\">"
				+ "<FirstPipe name=\"p1\"/>"
				+ "<SecondPipe name=\"p2\"><SubElement/></SecondPipe>"
				+ "</Adapter>"
				+ "</ConfigurationFile>";
		String replacement = "<Adapter name=\"Complex\"><SinglePipe/></Adapter>";

		Path configFile = tempDir.resolve("config.xml");
		Files.writeString(configFile, original, StandardCharsets.UTF_8);
		when(fileSystemStorage.toAbsolutePath(configFile.toString())).thenReturn(configFile);

		boolean result = adapterService.updateAdapter(configFile, "Complex", replacement);

		assertTrue(result);
		String written = Files.readString(configFile, StandardCharsets.UTF_8);
		assertTrue(written.contains("SinglePipe"));
		assertFalse(written.contains("FirstPipe"));
		assertFalse(written.contains("SecondPipe"));
	}

	private static ConfigurationFile configWith(String path, String xml) {
		ConfigurationFile config = new ConfigurationFile(path, "");
		config.setXmlContent(xml);
		return config;
	}

	@Test
	void createAdapter_createsAdapterInValidConfig() throws Exception {
		String xml = "<ConfigurationFile></ConfigurationFile>";
		Path configFile = tempDir.resolve("config.xml");
		Files.writeString(configFile, xml, StandardCharsets.UTF_8);
		when(fileSystemStorage.toAbsolutePath("config.xml")).thenReturn(configFile);

		adapterService.createAdapter("config.xml", "NewAdapter");

		String written = Files.readString(configFile, StandardCharsets.UTF_8);
		assertTrue(written.contains("NewAdapter"));
		assertTrue(written.contains("Receiver"));
		assertTrue(written.contains("Pipeline"));
	}

	@Test
	void createAdapter_preservesExistingAdapters() throws Exception {
		String xml = "<ConfigurationFile><Adapter name=\"Existing\"><OldPipe/></Adapter></ConfigurationFile>";
		Path configFile = tempDir.resolve("config.xml");
		Files.writeString(configFile, xml, StandardCharsets.UTF_8);
		when(fileSystemStorage.toAbsolutePath("config.xml")).thenReturn(configFile);

		adapterService.createAdapter("config.xml", "NewAdapter");

		String written = Files.readString(configFile, StandardCharsets.UTF_8);
		assertTrue(written.contains("Existing"));
		assertTrue(written.contains("OldPipe"));
		assertTrue(written.contains("NewAdapter"));
	}

	@Test
	void createAdapter_throwsIllegalArgument_whenConfigPathIsEmpty() {
		assertThrows(IllegalArgumentException.class, () -> adapterService.createAdapter("", "SomeAdapter"));
	}

	@Test
	void createAdapter_throwsIllegalArgument_whenConfigPathIsNull() {
		assertThrows(IllegalArgumentException.class, () -> adapterService.createAdapter(null, "SomeAdapter"));
	}

	@Test
	void createAdapter_throwsIllegalArgument_whenAdapterNameIsEmpty() {
		assertThrows(IllegalArgumentException.class, () -> adapterService.createAdapter("config.xml", ""));
	}

	@Test
	void createAdapter_throwsIllegalArgument_whenAdapterNameIsNull() {
		assertThrows(IllegalArgumentException.class, () -> adapterService.createAdapter("config.xml", null));
	}

	@Test
	void createAdapter_throwsConfigurationNotFound_whenFileDoesNotExist() throws IOException {
		Path missing = tempDir.resolve("missing.xml");
		when(fileSystemStorage.toAbsolutePath("missing.xml")).thenReturn(missing);

		assertThrows(
				ConfigurationNotFoundException.class, () -> adapterService.createAdapter("missing.xml", "Adapter"));
	}

	@Test
	void createAdapter_throwsIOException_whenConfigFileIsMalformedXml() throws Exception {
		Path configFile = tempDir.resolve("corrupt.xml");
		Files.writeString(configFile, "<<< not xml >>>", StandardCharsets.UTF_8);
		when(fileSystemStorage.toAbsolutePath("corrupt.xml")).thenReturn(configFile);

		assertThrows(IOException.class, () -> adapterService.createAdapter("corrupt.xml", "Adapter"));
	}

	@Test
	void renameAdapter_renamesExistingAdapter() throws Exception {
		String xml = "<ConfigurationFile><Adapter name=\"OldName\"><Pipe/></Adapter></ConfigurationFile>";
		Path configFile = tempDir.resolve("config.xml");
		Files.writeString(configFile, xml, StandardCharsets.UTF_8);
		when(fileSystemStorage.toAbsolutePath("config.xml")).thenReturn(configFile);

		adapterService.renameAdapter("config.xml", "OldName", "NewName");

		String written = Files.readString(configFile, StandardCharsets.UTF_8);
		assertTrue(written.contains("NewName"));
		assertFalse(written.contains("\"OldName\""));
	}

	@Test
	void renameAdapter_preservesOtherAdapters() throws Exception {
		String xml = "<ConfigurationFile>"
				+ "<Adapter name=\"First\"><PipeA/></Adapter>"
				+ "<Adapter name=\"Second\"><PipeB/></Adapter>"
				+ "</ConfigurationFile>";
		Path configFile = tempDir.resolve("config.xml");
		Files.writeString(configFile, xml, StandardCharsets.UTF_8);
		when(fileSystemStorage.toAbsolutePath("config.xml")).thenReturn(configFile);

		adapterService.renameAdapter("config.xml", "First", "Renamed");

		String written = Files.readString(configFile, StandardCharsets.UTF_8);
		assertTrue(written.contains("Renamed"));
		assertTrue(written.contains("Second"));
		assertTrue(written.contains("PipeB"));
	}

	@Test
	void renameAdapter_throwsIllegalArgument_whenConfigPathIsEmpty() {
		assertThrows(IllegalArgumentException.class, () -> adapterService.renameAdapter("", "OldName", "NewName"));
	}

	@Test
	void renameAdapter_throwsConfigurationNotFound_whenFileDoesNotExist() throws IOException {
		Path missing = tempDir.resolve("missing.xml");
		when(fileSystemStorage.toAbsolutePath("missing.xml")).thenReturn(missing);

		assertThrows(
				ConfigurationNotFoundException.class,
				() -> adapterService.renameAdapter("missing.xml", "OldName", "NewName")
		);
	}

	@Test
	void renameAdapter_throwsAdapterNotFound_whenAdapterDoesNotExist() throws Exception {
		String xml = "<ConfigurationFile><Adapter name=\"Existing\"/></ConfigurationFile>";
		Path configFile = tempDir.resolve("config.xml");
		Files.writeString(configFile, xml, StandardCharsets.UTF_8);
		when(fileSystemStorage.toAbsolutePath("config.xml")).thenReturn(configFile);

		assertThrows(
				AdapterNotFoundException.class,
				() -> adapterService.renameAdapter("config.xml", "NonExistent", "NewName")
		);
	}

	@Test
	void deleteAdapter_removesAdapterFromConfig() throws Exception {
		String xml = "<ConfigurationFile><Adapter name=\"ToDelete\"><Pipe/></Adapter></ConfigurationFile>";
		Path configFile = tempDir.resolve("config.xml");
		Files.writeString(configFile, xml, StandardCharsets.UTF_8);
		when(fileSystemStorage.toAbsolutePath("config.xml")).thenReturn(configFile);

		adapterService.deleteAdapter("config.xml", "ToDelete");

		String written = Files.readString(configFile, StandardCharsets.UTF_8);
		assertFalse(written.contains("ToDelete"));
	}

	@Test
	void deleteAdapter_preservesOtherAdapters() throws Exception {
		String xml = "<ConfigurationFile>"
				+ "<Adapter name=\"Keep\"><PipeA/></Adapter>"
				+ "<Adapter name=\"Remove\"><PipeB/></Adapter>"
				+ "</ConfigurationFile>";
		Path configFile = tempDir.resolve("config.xml");
		Files.writeString(configFile, xml, StandardCharsets.UTF_8);
		when(fileSystemStorage.toAbsolutePath("config.xml")).thenReturn(configFile);

		adapterService.deleteAdapter("config.xml", "Remove");

		String written = Files.readString(configFile, StandardCharsets.UTF_8);
		assertTrue(written.contains("Keep"));
		assertTrue(written.contains("PipeA"));
		assertFalse(written.contains("Remove"));
	}

	@Test
	void deleteAdapter_throwsIllegalArgument_whenConfigPathIsEmpty() {
		assertThrows(IllegalArgumentException.class, () -> adapterService.deleteAdapter("", "SomeAdapter"));
	}

	@Test
	void deleteAdapter_throwsConfigurationNotFound_whenFileDoesNotExist() throws IOException {
		Path missing = tempDir.resolve("missing.xml");
		when(fileSystemStorage.toAbsolutePath("missing.xml")).thenReturn(missing);

		assertThrows(
				ConfigurationNotFoundException.class, () -> adapterService.deleteAdapter("missing.xml", "SomeAdapter"));
	}

	@Test
	void deleteAdapter_throwsAdapterNotFound_whenAdapterDoesNotExist() throws Exception {
		String xml = "<ConfigurationFile><Adapter name=\"Existing\"/></ConfigurationFile>";
		Path configFile = tempDir.resolve("config.xml");
		Files.writeString(configFile, xml, StandardCharsets.UTF_8);
		when(fileSystemStorage.toAbsolutePath("config.xml")).thenReturn(configFile);

		assertThrows(AdapterNotFoundException.class, () -> adapterService.deleteAdapter("config.xml", "NonExistent"));
	}

	private static ConfigurationProject projectWith(String name, ConfigurationFile config) {
		ConfigurationProject configurationProject = new ConfigurationProject(name, "/path/to/" + name);
		configurationProject.addConfiguration(config);
		return configurationProject;
	}
}
