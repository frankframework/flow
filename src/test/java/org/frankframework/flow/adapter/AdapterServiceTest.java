package org.frankframework.flow.adapter;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import org.frankframework.flow.configuration.Configuration;
import org.frankframework.flow.configuration.ConfigurationNotFoundException;
import org.frankframework.flow.filesystem.FileSystemStorage;
import org.frankframework.flow.project.Project;
import org.frankframework.flow.project.ProjectNotFoundException;
import org.frankframework.flow.project.ProjectService;
import org.frankframework.flow.xml.XmlDTO;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.api.io.TempDir;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class AdapterServiceTest {

	private AdapterService adapterService;

	@Mock
	private ProjectService projectService;

	@Mock
	private FileSystemStorage fileSystemStorage;

	@TempDir
	Path tempDir;

	@BeforeEach
	void setUp() {
		adapterService = new AdapterService(projectService, fileSystemStorage);
	}

	@Test
	void getAdapter_returnsXmlDtoContainingAdapterContent() throws Exception {
		String xml = "<Configuration><Adapter name=\"MyAdapter\"><SomePipe/></Adapter></Configuration>";
		Configuration config = configWith("config.xml", xml);
		Project project = projectWith("proj", config);

		when(projectService.getProject("proj")).thenReturn(project);

		XmlDTO result = adapterService.getAdapter("proj", "config.xml", "MyAdapter");

		assertNotNull(result);
		assertTrue(result.xmlContent().contains("MyAdapter"));
		assertTrue(result.xmlContent().contains("SomePipe"));
	}

	@Test
	void getAdapter_throwsProjectNotFound_whenProjectDoesNotExist() throws Exception {
		when(projectService.getProject("missing"))
				.thenThrow(new ProjectNotFoundException("Project not found: missing"));

		assertThrows(
				ProjectNotFoundException.class,
				() -> adapterService.getAdapter("missing", "config.xml", "SomeAdapter"));
	}

	@Test
	void getAdapter_throwsConfigurationNotFound_whenNoMatchingConfigPath() throws Exception {
		Project project = new Project("proj", "/path");
		when(projectService.getProject("proj")).thenReturn(project);

		assertThrows(
				ConfigurationNotFoundException.class,
				() -> adapterService.getAdapter("proj", "nonexistent.xml", "SomeAdapter"));
	}

	@Test
	void getAdapter_throwsConfigurationNotFound_whenConfigPathMismatch_evenIfOtherConfigsPresent() throws Exception {
		Configuration config = configWith("config1.xml", "<Configuration><Adapter name=\"A\"/></Configuration>");
		Project project = projectWith("proj", config);

		when(projectService.getProject("proj")).thenReturn(project);

		assertThrows(ConfigurationNotFoundException.class, () -> adapterService.getAdapter("proj", "config2.xml", "A"));
	}

	@Test
	void getAdapter_throwsAdapterNotFound_whenAdapterNameDoesNotExist() throws Exception {
		String xml = "<Configuration><Adapter name=\"ExistingAdapter\"/></Configuration>";
		Configuration config = configWith("config.xml", xml);
		Project project = projectWith("proj", config);

		when(projectService.getProject("proj")).thenReturn(project);

		assertThrows(
				AdapterNotFoundException.class, () -> adapterService.getAdapter("proj", "config.xml", "NonExistent"));
	}

	@Test
	void getAdapter_throwsAdapterNotFound_whenConfigXmlHasNoAdapters() throws Exception {
		Configuration config = configWith("config.xml", "<Configuration/>");
		Project project = projectWith("proj", config);

		when(projectService.getProject("proj")).thenReturn(project);

		assertThrows(
				AdapterNotFoundException.class, () -> adapterService.getAdapter("proj", "config.xml", "AnyAdapter"));
	}

	@Test
	void getAdapter_returnsOnlyRequestedAdapter_whenMultipleAdaptersPresent() throws Exception {
		String xml = "<Configuration>"
				+ "<Adapter name=\"First\"><PipeA/></Adapter>"
				+ "<Adapter name=\"Second\"><PipeB/></Adapter>"
				+ "</Configuration>";
		Configuration config = configWith("config.xml", xml);
		Project project = projectWith("proj", config);

		when(projectService.getProject("proj")).thenReturn(project);

		XmlDTO result = adapterService.getAdapter("proj", "config.xml", "Second");

		assertTrue(result.xmlContent().contains("Second"));
		assertTrue(result.xmlContent().contains("PipeB"));
		assertFalse(result.xmlContent().contains("First"), "Should not include unrelated adapter");
		assertFalse(result.xmlContent().contains("PipeA"), "Should not include unrelated adapter content");
	}

	@Test
	void getAdapter_selectsCorrectConfiguration_whenProjectHasMultipleConfigs() throws Exception {
		Configuration config1 =
				configWith("config1.xml", "<Configuration><Adapter name=\"AdapterA\"/></Configuration>");
		Configuration config2 =
				configWith("config2.xml", "<Configuration><Adapter name=\"AdapterB\"/></Configuration>");

		Project project = new Project("proj", "/path");
		project.addConfiguration(config1);
		project.addConfiguration(config2);

		when(projectService.getProject("proj")).thenReturn(project);

		XmlDTO result = adapterService.getAdapter("proj", "config2.xml", "AdapterB");

		assertTrue(result.xmlContent().contains("AdapterB"));
		assertFalse(result.xmlContent().contains("AdapterA"), "Should return content from config2 only");
	}

	@Test
	void updateAdapter_returnsTrueAndWritesUpdatedXmlToDisk() throws Exception {
		String original = "<Configuration><Adapter name=\"MyAdapter\"><OldPipe/></Adapter></Configuration>";
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
				() -> adapterService.updateAdapter(missing, "SomeAdapter", "<Adapter name=\"SomeAdapter\"/>"));
	}

	@Test
	void updateAdapter_throwsAdapterNotFound_whenAdapterNotPresentInFile() throws Exception {
		String xml = "<Configuration><Adapter name=\"ExistingAdapter\"/></Configuration>";
		Path configFile = tempDir.resolve("config.xml");
		Files.writeString(configFile, xml, StandardCharsets.UTF_8);
		when(fileSystemStorage.toAbsolutePath(configFile.toString())).thenReturn(configFile);

		assertThrows(
				AdapterNotFoundException.class,
				() -> adapterService.updateAdapter(configFile, "NonExistent", "<Adapter name=\"NonExistent\"/>"));
	}

	@Test
	void updateAdapter_returnsFalse_whenReplacementXmlIsMalformed() throws Exception {
		String xml = "<Configuration><Adapter name=\"MyAdapter\"/></Configuration>";
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
		String original = "<Configuration>"
				+ "<Adapter name=\"First\"><OldContent/></Adapter>"
				+ "<Adapter name=\"Second\"><KeepThis/></Adapter>"
				+ "</Configuration>";
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
		String xml = "<configuration><adapter name=\"myAdapter\"><oldPipe/></adapter></configuration>";
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
		String original = "<Configuration>"
				+ "<Adapter name=\"Complex\">"
				+ "<FirstPipe name=\"p1\"/>"
				+ "<SecondPipe name=\"p2\"><SubElement/></SecondPipe>"
				+ "</Adapter>"
				+ "</Configuration>";
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

	private static Configuration configWith(String path, String xml) {
		Configuration config = new Configuration(path);
		config.setXmlContent(xml);
		return config;
	}

	private static Project projectWith(String name, Configuration config) {
		Project project = new Project(name, "/path/to/" + name);
		project.addConfiguration(config);
		return project;
	}
}
