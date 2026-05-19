package org.frankframework.flow.datamapper;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.io.File;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Comparator;
import javax.naming.ConfigurationException;
import org.frankframework.flow.exception.ApiException;
import org.frankframework.flow.file.FileTreeNode;
import org.frankframework.flow.file.FileTreeService;
import org.frankframework.flow.filesystem.FileSystemStorage;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Disabled;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;

@ExtendWith(MockitoExtension.class)
public class DatamapperConfigServiceTest {
	private DatamapperConfigService datamapperConfigService;

	@Mock
	private FileSystemStorage fileSystemStorage;

	@Mock
	private FileTreeService fileTreeService;

	private Path tempProjectRoot;
	private static final String TEST_PROJECT_NAME = "FrankFlowTestProject";

	@BeforeEach
	void init() throws IOException {
		tempProjectRoot = Files.createTempDirectory("flow_unit_test");
		datamapperConfigService = new DatamapperConfigService(fileSystemStorage, fileTreeService);
	}

	@AfterEach
	public void tearDown() throws IOException {
		if (tempProjectRoot != null && Files.exists(tempProjectRoot)) {
			Files.walk(tempProjectRoot)
					.sorted(Comparator.reverseOrder())
					.map(Path::toFile)
					.forEach(File::delete);
		}
	}

	private void stubToAbsolutePath() {
		when(fileSystemStorage.toAbsolutePath(anyString())).thenAnswer(invocation -> {
			String pathStr = invocation.getArgument(0);
			Path path = Paths.get(pathStr);
			return path.isAbsolute() ? path : tempProjectRoot.resolve(path).normalize();
		});
	}

	private void stubReadFile() throws IOException {
		when(fileSystemStorage.readFile(anyString())).thenAnswer(invocation -> {
			String path = invocation.getArgument(0);
			return Files.readString(Paths.get(path));
		});
	}

	private void stubWriteFile() throws IOException {
		doAnswer(invocation -> {
			String path = invocation.getArgument(0);
			String content = invocation.getArgument(1);
			Files.writeString(Paths.get(path), content);
			return null;
		})
				.when(fileSystemStorage)
				.writeFile(anyString(), anyString());
	}

	private void stubCreateFile() throws IOException {
		doAnswer(invocation -> {
			String path = invocation.getArgument(0);
			Path file = Paths.get(path);
			Files.createDirectories(file.getParent());
			Files.createFile(file);
			return null;
		})
				.when(fileSystemStorage)
				.createFile(anyString());
	}

	private void stubGetConfigurationsDirectoryTree() throws IOException {
		when(fileTreeService.getConfigurationsDirectoryTree(anyString())).thenAnswer(invocation -> {
			FileTreeNode fileTreeNode = new FileTreeNode();
			fileTreeNode.setPath(tempProjectRoot.toString());
			return fileTreeNode;
		});
	}

	@Test
	@DisplayName("Should correctly read content from an existing file")
	public void readFileContent_Success() throws IOException {
		stubReadFile();
		stubGetConfigurationsDirectoryTree();
		stubToAbsolutePath();

		Path datamapperDir = tempProjectRoot.resolve("datamapper");
		if (!Files.isDirectory(datamapperDir)) {
			Files.createDirectories(datamapperDir);
		}
		Path file = datamapperDir.resolve("configuration.json");
		String content = "<test>data</test>";

		Files.writeString(file, content, StandardCharsets.UTF_8);

		String result = datamapperConfigService.getConfig(TEST_PROJECT_NAME);
		assertEquals(content, result);
	}

	@Test
	@Disabled("Disabled due to it never throwing NoSuchFileException and creating the file itself when needed")
	@DisplayName("Should throw NoSuchFileException when file does not exist")
	public void readFileContent_FileNotFound() throws IOException {
		stubReadFile();
		stubGetConfigurationsDirectoryTree();
		stubToAbsolutePath();

		assertThrows(ApiException.class, () -> datamapperConfigService.getConfig(TEST_PROJECT_NAME));
	}

	@Test
	@DisplayName("Should successfully overwrite a file with new content")
	public void updateConfigContent_Success() throws IOException, ApiException, ConfigurationException {
		stubToAbsolutePath();
		stubWriteFile();
		stubGetConfigurationsDirectoryTree();

		Path datamapperDir = tempProjectRoot.resolve("datamapper");
		if (!Files.isDirectory(datamapperDir)) {
			Files.createDirectories(datamapperDir);
		}
		Path file = datamapperDir.resolve("configuration.json");
		String content = "<test>data</test>";

		Files.writeString(file, content, StandardCharsets.UTF_8);

		String newContent = "new content";
		datamapperConfigService.updateFileContent(TEST_PROJECT_NAME, newContent);

		assertEquals(newContent, Files.readString(file));
	}

	@Test
	@DisplayName("Should successfully create  a new fille ")
	public void updateFileNewConfigContent_Success() throws IOException, ApiException, ConfigurationException {
		stubToAbsolutePath();
		stubWriteFile();
		stubGetConfigurationsDirectoryTree();

		Path datamapperDir = tempProjectRoot.resolve("datamapper");
		if (!Files.isDirectory(datamapperDir)) {
			Files.createDirectories(datamapperDir);
		}
		Path file = datamapperDir.resolve("configuration.json");

		String newContent = "new content";
		datamapperConfigService.updateFileContent(TEST_PROJECT_NAME, newContent);

		assertEquals(newContent, Files.readString(file));
	}

	@Test
	@DisplayName("Should throw when configuration path points to a directory")
	void updateFileContent_WhenConfigPathIsDirectory_ThrowsConfigurationException() throws Exception {
		stubToAbsolutePath();
		stubGetConfigurationsDirectoryTree();

		Path datamapperDir = tempProjectRoot.resolve("datamapper");
		Files.createDirectories(datamapperDir.resolve("configuration.json"));

		ConfigurationException exception = assertThrows(ConfigurationException.class,
				() -> datamapperConfigService.updateFileContent(TEST_PROJECT_NAME, "content"));

		assertTrue(exception.getMessage().contains("path is a directory"));
		verify(fileSystemStorage, never()).writeFile(anyString(), anyString());
	}

	@Test
	@DisplayName("Should throw ApiException when resolving datamapper directory fails")
	void updateFileContent_WhenResolvePathFails_ThrowsApiException() throws Exception {
		when(fileTreeService.getConfigurationsDirectoryTree(anyString())).thenThrow(new IOException("boom"));

		ApiException exception = assertThrows(ApiException.class,
				() -> datamapperConfigService.updateFileContent(TEST_PROJECT_NAME, "content"));

		assertEquals(HttpStatus.NOT_FOUND, exception.getStatus());
	}

	@Test
	@DisplayName("Should throw when writeFile fails")
	void updateFileContent_WhenWriteFails_ThrowsConfigurationException() throws Exception {
		stubToAbsolutePath();
		stubGetConfigurationsDirectoryTree();

		Path datamapperDir = tempProjectRoot.resolve("datamapper");
		Files.createDirectories(datamapperDir);
		doThrow(new IOException("disk error")).when(fileSystemStorage).writeFile(anyString(), anyString());

		ConfigurationException exception = assertThrows(ConfigurationException.class,
				() -> datamapperConfigService.updateFileContent(TEST_PROJECT_NAME, "content"));

		assertTrue(exception.getMessage().contains("Failed to update configuration file"));
	}

	@Test
	@DisplayName("Should create file and return empty content when config does not exist")
	void getConfig_WhenFileMissing_CreatesFileAndReturnsEmptyString() throws Exception {
		stubToAbsolutePath();
		stubGetConfigurationsDirectoryTree();
		stubCreateFile();

		Path datamapperDir = tempProjectRoot.resolve("datamapper");
		Files.createDirectories(datamapperDir);

		String result = datamapperConfigService.getConfig(TEST_PROJECT_NAME);

		assertEquals("", result);
		verify(fileSystemStorage).createFile(datamapperDir.resolve("configuration.json").toString());
	}

	@Test
	@DisplayName("Should wrap read failure in ApiException")
	void getConfig_WhenReadFails_ThrowsApiException() throws Exception {
		stubToAbsolutePath();
		stubGetConfigurationsDirectoryTree();

		Path datamapperDir = tempProjectRoot.resolve("datamapper");
		Files.createDirectories(datamapperDir);
		Path file = datamapperDir.resolve("configuration.json");
		Files.writeString(file, "content", StandardCharsets.UTF_8);
		when(fileSystemStorage.readFile(anyString())).thenThrow(new IOException("cannot read"));

		ApiException exception = assertThrows(ApiException.class, () -> datamapperConfigService.getConfig(TEST_PROJECT_NAME));

		assertEquals(HttpStatus.NOT_FOUND, exception.getStatus());
		assertTrue(exception.getMessage().contains("Failed to resolve configuration file path"));
	}

	@Test
	@DisplayName("Should wrap path resolution failure in ApiException")
	void getConfig_WhenResolvePathFails_ThrowsApiException() throws Exception {
		when(fileTreeService.getConfigurationsDirectoryTree(anyString())).thenThrow(new IOException("boom"));

		ApiException exception = assertThrows(ApiException.class, () -> datamapperConfigService.getConfig(TEST_PROJECT_NAME));

		assertEquals(HttpStatus.NOT_FOUND, exception.getStatus());
	}
}
