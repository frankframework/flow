package org.frankframework.flow.noncanvascomponent;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.Map;
import org.frankframework.flow.exception.ApiException;
import org.frankframework.flow.filesystem.FileSystemStorage;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.api.io.TempDir;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;

@ExtendWith(MockitoExtension.class)
class NonCanvasComponentServiceTest {

	@Mock
	private FileSystemStorage fileSystemStorage;

	private NonCanvasComponentService nonCanvasComponentService;

	@TempDir
	Path tempDir;

	private static final String CONFIGURATION = """
			<Configuration name="Main">
				<Adapter name="MyAdapter">
					<Pipeline>
						<SenderPipe name="pipe"/>
					</Pipeline>
				</Adapter>
				<Scheduler>
					<Job name="daily"/>
				</Scheduler>
				<Monitoring name="monitor" enabled="true"/>
			</Configuration>
			""";

	@BeforeEach
	void setUp() {
		nonCanvasComponentService = new NonCanvasComponentService(fileSystemStorage);
	}

	private void stubToAbsolutePath() {
		when(fileSystemStorage.toAbsolutePath(anyString())).thenAnswer(invocation -> {
			String path = invocation.getArgument(0);
			Path candidate = Path.of(path);
			return candidate.isAbsolute() ? candidate : tempDir.resolve(candidate);
		});
	}

	private void stubReadFile() throws IOException {
		when(fileSystemStorage.readFile(anyString())).thenAnswer(invocation -> {
			String path = invocation.getArgument(0);
			return Files.readString(Path.of(path), StandardCharsets.UTF_8);
		});
	}

	private void stubWriteFile() throws IOException {
		doAnswer(invocation -> {
			String path = invocation.getArgument(0);
			String content = invocation.getArgument(1);
			Files.writeString(Path.of(path), content, StandardCharsets.UTF_8);
			return null;
		})
				.when(fileSystemStorage)
				.writeFile(anyString(), anyString());
	}

	private Path writeConfiguration(String content) throws IOException {
		Path file = tempDir.resolve("configuration.xml");
		Files.writeString(file, content, StandardCharsets.UTF_8);
		return file;
	}

	@Test
	void getNonCanvasComponents_returnsDirectChildrenExcludingAdapters() throws Exception {
		stubToAbsolutePath();
		stubReadFile();
		Path file = writeConfiguration(CONFIGURATION);

		List<NonCanvasComponentDTO> components = nonCanvasComponentService.getNonCanvasComponents(file.toString());

		assertEquals(2, components.size());
		assertEquals("Scheduler", components.get(0).tagName());
		assertNull(components.get(0).name());
		assertEquals("Monitoring", components.get(1).tagName());
		assertEquals("monitor", components.get(1).name());
		assertEquals("true", components.get(1).attributes().get("enabled"));
	}

	@Test
	void getNonCanvasComponents_assignsOccurrenceIndexPerTagName() throws Exception {
		stubToAbsolutePath();
		stubReadFile();
		Path file = writeConfiguration("""
				<Configuration>
					<Scheduler name="first"/>
					<Monitoring name="monitor"/>
					<Scheduler name="second"/>
				</Configuration>
				""");

		List<NonCanvasComponentDTO> components = nonCanvasComponentService.getNonCanvasComponents(file.toString());

		assertEquals(3, components.size());
		assertEquals(0, components.get(0).index());
		assertEquals("first", components.get(0).name());
		assertEquals(0, components.get(1).index());
		assertEquals(1, components.get(2).index());
		assertEquals("second", components.get(2).name());
	}

	@Test
	void getNonCanvasComponents_blankPath_throwsBadRequest() {
		ApiException exception =
				assertThrows(ApiException.class, () -> nonCanvasComponentService.getNonCanvasComponents("  "));
		assertEquals(HttpStatus.BAD_REQUEST, exception.getStatus());
	}

	@Test
	void getNonCanvasComponents_fileNotFound_throwsNotFound() {
		stubToAbsolutePath();
		String path = tempDir.resolve("missing.xml").toString();

		ApiException exception =
				assertThrows(ApiException.class, () -> nonCanvasComponentService.getNonCanvasComponents(path));
		assertEquals(HttpStatus.NOT_FOUND, exception.getStatus());
	}

	@Test
	void getNonCanvasComponents_pathIsDirectory_throwsNotFound() throws IOException {
		stubToAbsolutePath();
		Path directory = Files.createDirectory(tempDir.resolve("subdir"));

		ApiException exception =
				assertThrows(ApiException.class, () -> nonCanvasComponentService.getNonCanvasComponents(directory.toString()));
		assertEquals(HttpStatus.NOT_FOUND, exception.getStatus());
	}

	@Test
	void getNonCanvasComponents_malformedXml_throwsInternalServerError() throws Exception {
		stubToAbsolutePath();
		stubReadFile();
		Path file = writeConfiguration("<Configuration><unclosed></Configuration>");

		ApiException exception =
				assertThrows(ApiException.class, () -> nonCanvasComponentService.getNonCanvasComponents(file.toString()));
		assertEquals(HttpStatus.INTERNAL_SERVER_ERROR, exception.getStatus());
	}

	@Test
	void addNonCanvasComponent_appendsComponentAndPersists() throws Exception {
		stubToAbsolutePath();
		stubReadFile();
		stubWriteFile();
		Path file = writeConfiguration("<Configuration name=\"Main\"/>");

		List<NonCanvasComponentDTO> components = nonCanvasComponentService.addNonCanvasComponent(
				file.toString(), "Monitoring", Map.of("name", "monitor", "enabled", "true"));

		assertEquals(1, components.size());
		assertEquals("Monitoring", components.getFirst().tagName());
		assertEquals("monitor", components.getFirst().name());

		verify(fileSystemStorage).writeFile(eq(file.toString()), anyString());
		String persisted = Files.readString(file, StandardCharsets.UTF_8);
		assertTrue(persisted.contains("<Monitoring"));
		assertTrue(persisted.contains("enabled=\"true\""));
	}

	@Test
	void addNonCanvasComponent_blankTagName_throwsBadRequestAndDoesNotWrite() throws IOException {
		ApiException exception = assertThrows(
				ApiException.class,
				() -> nonCanvasComponentService.addNonCanvasComponent("configuration.xml", "  ", Map.of()));

		assertEquals(HttpStatus.BAD_REQUEST, exception.getStatus());
		verify(fileSystemStorage, never()).writeFile(anyString(), anyString());
	}

	@Test
	void updateNonCanvasComponent_replacesAttributesAndPersists() throws Exception {
		stubToAbsolutePath();
		stubReadFile();
		stubWriteFile();
		Path file = writeConfiguration("""
				<Configuration>
					<Monitoring name="monitor" enabled="true"/>
				</Configuration>
				""");

		List<NonCanvasComponentDTO> components = nonCanvasComponentService.updateNonCanvasComponent(
				file.toString(), "Monitoring", 0, Map.of("name", "monitor", "enabled", "false"));

		assertEquals(1, components.size());
		assertEquals("false", components.getFirst().attributes().get("enabled"));
		assertTrue(Files.readString(file, StandardCharsets.UTF_8).contains("enabled=\"false\""));
	}

	@Test
	void updateNonCanvasComponent_notFound_throwsNotFoundAndDoesNotWrite() throws Exception {
		stubToAbsolutePath();
		stubReadFile();
		Path file = writeConfiguration("<Configuration><Monitoring name=\"monitor\"/></Configuration>");

		ApiException exception = assertThrows(
				ApiException.class,
				() -> nonCanvasComponentService.updateNonCanvasComponent(file.toString(), "Scheduler", 0, Map.of("name", "x")));

		assertEquals(HttpStatus.NOT_FOUND, exception.getStatus());
		verify(fileSystemStorage, never()).writeFile(anyString(), anyString());
	}

	@Test
	void deleteNonCanvasComponent_removesComponentAndPersists() throws Exception {
		stubToAbsolutePath();
		stubReadFile();
		stubWriteFile();
		Path file = writeConfiguration("""
				<Configuration>
					<Scheduler name="daily"/>
					<Monitoring name="monitor"/>
				</Configuration>
				""");

		List<NonCanvasComponentDTO> components = nonCanvasComponentService.deleteNonCanvasComponent(file.toString(), "Scheduler", 0);

		assertEquals(1, components.size());
		assertEquals("Monitoring", components.getFirst().tagName());
		assertFalse(Files.readString(file, StandardCharsets.UTF_8).contains("<Scheduler"));
	}

	@Test
	void deleteNonCanvasComponent_notFound_throwsNotFoundAndDoesNotWrite() throws Exception {
		stubToAbsolutePath();
		stubReadFile();
		Path file = writeConfiguration("<Configuration><Monitoring name=\"monitor\"/></Configuration>");

		ApiException exception = assertThrows(
				ApiException.class,
				() -> nonCanvasComponentService.deleteNonCanvasComponent(file.toString(), "Scheduler", 0));

		assertEquals(HttpStatus.NOT_FOUND, exception.getStatus());
		verify(fileSystemStorage, never()).writeFile(anyString(), anyString());
	}
}
