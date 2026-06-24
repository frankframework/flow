package org.frankframework.flow.noncanvaselement;

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
class NonCanvasElementServiceTest {

	@Mock
	private FileSystemStorage fileSystemStorage;

	private NonCanvasElementService nonCanvasElementService;

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
		nonCanvasElementService = new NonCanvasElementService(fileSystemStorage);
	}

	private void stubToAbsolutePath() {
		when(fileSystemStorage.toAbsolutePath(anyString())).thenAnswer(invocation -> {
			String path = invocation.getArgument(0);
			Path candidate = Path.of(path);
			return candidate.isAbsolute() ? candidate : tempDir.resolve(candidate);
		});
	}

	private void stubReadFile() throws IOException {
		when(fileSystemStorage.readFile(anyString()))
				.thenAnswer(invocation -> Files.readString(Path.of(invocation.getArgument(0)), StandardCharsets.UTF_8));
	}

	private void stubWriteFile() throws IOException {
		doAnswer(invocation -> {
			Path filePath = Path.of(invocation.getArgument(0));
			Files.writeString(filePath, invocation.getArgument(1), StandardCharsets.UTF_8);
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
	void getNonCanvasElements_returnsDirectChildrenExcludingAdapters() throws Exception {
		stubToAbsolutePath();
		stubReadFile();
		Path file = writeConfiguration(CONFIGURATION);

		List<NonCanvasElementDTO> elements = nonCanvasElementService.getNonCanvasElements(file.toString());

		assertEquals(2, elements.size());
		assertEquals("Scheduler", elements.get(0).tagName());
		assertNull(elements.get(0).name());
		assertEquals("Monitoring", elements.get(1).tagName());
		assertEquals("monitor", elements.get(1).name());
		assertEquals("true", elements.get(1).attributes().get("enabled"));
	}

	@Test
	void getNonCanvasElements_assignsOccurrenceIndexPerTagName() throws Exception {
		stubToAbsolutePath();
		stubReadFile();
		Path file = writeConfiguration("""
				<Configuration>
					<Scheduler name="first"/>
					<Monitoring name="monitor"/>
					<Scheduler name="second"/>
				</Configuration>
				""");

		List<NonCanvasElementDTO> elements = nonCanvasElementService.getNonCanvasElements(file.toString());

		assertEquals(3, elements.size());
		assertEquals(0, elements.get(0).index());
		assertEquals("first", elements.get(0).name());
		assertEquals(0, elements.get(1).index());
		assertEquals(1, elements.get(2).index());
		assertEquals("second", elements.get(2).name());
	}

	@Test
	void getNonCanvasElements_blankPath_throwsBadRequest() {
		ApiException exception =
				assertThrows(ApiException.class, () -> nonCanvasElementService.getNonCanvasElements("  "));
		assertEquals(HttpStatus.BAD_REQUEST, exception.getStatus());
	}

	@Test
	void getNonCanvasElements_fileNotFound_throwsNotFound() {
		stubToAbsolutePath();
		String path = tempDir.resolve("missing.xml").toString();

		ApiException exception =
				assertThrows(ApiException.class, () -> nonCanvasElementService.getNonCanvasElements(path));
		assertEquals(HttpStatus.NOT_FOUND, exception.getStatus());
	}

	@Test
	void getNonCanvasElements_pathIsDirectory_throwsNotFound() throws IOException {
		stubToAbsolutePath();
		Path directory = Files.createDirectory(tempDir.resolve("subdir"));

		ApiException exception =
				assertThrows(ApiException.class, () -> nonCanvasElementService.getNonCanvasElements(directory.toString()));
		assertEquals(HttpStatus.NOT_FOUND, exception.getStatus());
	}

	@Test
	void getNonCanvasElements_malformedXml_throwsBadRequest() throws Exception {
		stubToAbsolutePath();
		stubReadFile();
		Path file = writeConfiguration("<Configuration><unclosed></Configuration>");

		ApiException exception =
				assertThrows(ApiException.class, () -> nonCanvasElementService.getNonCanvasElements(file.toString()));
		assertEquals(HttpStatus.BAD_REQUEST, exception.getStatus());
	}

	@Test
	void addNonCanvasElement_appendsElementAndPersists() throws Exception {
		stubToAbsolutePath();
		stubReadFile();
		stubWriteFile();
		Path file = writeConfiguration("<Configuration name=\"Main\"/>");

		List<NonCanvasElementDTO> elements = nonCanvasElementService.addNonCanvasElement(
				file.toString(), "Monitoring", Map.of("name", "monitor", "enabled", "true"));

		assertEquals(1, elements.size());
		assertEquals("Monitoring", elements.getFirst().tagName());
		assertEquals("monitor", elements.getFirst().name());

		verify(fileSystemStorage).writeFile(eq(file.toString()), anyString());
		String persisted = Files.readString(file, StandardCharsets.UTF_8);
		assertTrue(persisted.contains("<Monitoring"));
		assertTrue(persisted.contains("enabled=\"true\""));
	}

	@Test
	void addNonCanvasElement_blankTagName_throwsBadRequestAndDoesNotWrite() throws IOException {
		ApiException exception = assertThrows(
				ApiException.class,
				() -> nonCanvasElementService.addNonCanvasElement("configuration.xml", "  ", Map.of()));

		assertEquals(HttpStatus.BAD_REQUEST, exception.getStatus());
		verify(fileSystemStorage, never()).writeFile(anyString(), anyString());
	}

	@Test
	void updateNonCanvasElement_replacesAttributesAndPersists() throws Exception {
		stubToAbsolutePath();
		stubReadFile();
		stubWriteFile();
		Path file = writeConfiguration("""
				<Configuration>
					<Monitoring name="monitor" enabled="true"/>
				</Configuration>
				""");

		List<NonCanvasElementDTO> elements = nonCanvasElementService.updateNonCanvasElement(
				file.toString(), "Monitoring", 0, Map.of("name", "monitor", "enabled", "false"));

		assertEquals(1, elements.size());
		assertEquals("false", elements.getFirst().attributes().get("enabled"));
		assertTrue(Files.readString(file, StandardCharsets.UTF_8).contains("enabled=\"false\""));
	}

	@Test
	void updateNonCanvasElement_notFound_throwsNotFoundAndDoesNotWrite() throws Exception {
		stubToAbsolutePath();
		stubReadFile();
		Path file = writeConfiguration("<Configuration><Monitoring name=\"monitor\"/></Configuration>");

		ApiException exception = assertThrows(
				ApiException.class,
				() -> nonCanvasElementService.updateNonCanvasElement(file.toString(), "Scheduler", 0, Map.of("name", "x")));

		assertEquals(HttpStatus.NOT_FOUND, exception.getStatus());
		verify(fileSystemStorage, never()).writeFile(anyString(), anyString());
	}

	@Test
	void deleteNonCanvasElement_removesElementAndPersists() throws Exception {
		stubToAbsolutePath();
		stubReadFile();
		stubWriteFile();
		Path file = writeConfiguration("""
				<Configuration>
					<Scheduler name="daily"/>
					<Monitoring name="monitor"/>
				</Configuration>
				""");

		List<NonCanvasElementDTO> elements = nonCanvasElementService.deleteNonCanvasElement(file.toString(), "Scheduler", 0);

		assertEquals(1, elements.size());
		assertEquals("Monitoring", elements.getFirst().tagName());
		assertFalse(Files.readString(file, StandardCharsets.UTF_8).contains("<Scheduler"));
	}

	@Test
	void deleteNonCanvasElement_notFound_throwsNotFoundAndDoesNotWrite() throws Exception {
		stubToAbsolutePath();
		stubReadFile();
		Path file = writeConfiguration("<Configuration><Monitoring name=\"monitor\"/></Configuration>");

		ApiException exception = assertThrows(
				ApiException.class,
				() -> nonCanvasElementService.deleteNonCanvasElement(file.toString(), "Scheduler", 0));

		assertEquals(HttpStatus.NOT_FOUND, exception.getStatus());
		verify(fileSystemStorage, never()).writeFile(anyString(), anyString());
	}
}
