package org.frankframework.flow.configuration;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import org.frankframework.flow.exception.ApiException;
import org.frankframework.flow.filesystem.FileSystemStorage;
import org.frankframework.flow.project.Project;
import org.frankframework.flow.project.ProjectNotFoundException;
import org.frankframework.flow.project.ProjectService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.api.io.TempDir;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class ConfigurationServiceTest {

	@Mock
	private FileSystemStorage fileSystemStorage;

	@Mock
	private ProjectService projectService;

	private ConfigurationService configurationService;

	@TempDir
	Path tempDir;

	@BeforeEach
	void setUp() {
		configurationService = new ConfigurationService(fileSystemStorage, projectService);
	}

	private void stubToAbsolutePath() {
		when(fileSystemStorage.toAbsolutePath(anyString())).thenAnswer(invocation -> {
			String path = invocation.getArgument(0);
			Path p = Path.of(path);
			return p.isAbsolute() ? p : tempDir.resolve(p);
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
			Path filePath = Path.of(path);
			Files.createDirectories(filePath.getParent());
			Files.writeString(filePath, content, StandardCharsets.UTF_8);
			return null;
		})
				.when(fileSystemStorage)
				.writeFile(anyString(), anyString());
	}

	@Test
	void getConfigurationContent_Success() throws Exception {
		stubToAbsolutePath();
		stubReadFile();

		Path file = tempDir.resolve("config.xml");
		Files.writeString(file, "<config/>", StandardCharsets.UTF_8);

		ConfigurationDTO result = configurationService.getConfigurationContent("test", file.toString());

		assertEquals("<config/>", result.content());
	}

	@Test
	void getConfigurationContent_FileNotFound_ThrowsConfigurationNotFoundException() {
		stubToAbsolutePath();

		String path = tempDir.resolve("missing.xml").toString();

		assertThrows(ApiException.class, () -> configurationService.getConfigurationContent("test", path));
	}

	@Test
	void getConfigurationContent_IsDirectory_ThrowsConfigurationNotFoundException() throws IOException {
		stubToAbsolutePath();

		Path dir = Files.createDirectory(tempDir.resolve("subdir"));

		assertThrows(
				ApiException.class,
				() -> configurationService.getConfigurationContent("test", dir.toString())
		);
	}

	@Test
	void updateConfiguration_Success() throws Exception {
		stubToAbsolutePath();
		stubWriteFile();

		Path file = tempDir.resolve("config.xml");
		Files.writeString(file, "<old/>", StandardCharsets.UTF_8);

		configurationService.updateConfiguration("test", file.toString(), "<new/>");

		String result = Files.readString(file, StandardCharsets.UTF_8).trim();
		assertEquals("<new/>", result);
		verify(fileSystemStorage).writeFile(eq(file.toString()), anyString());
	}

	@Test
	void updateConfiguration_FileNotFound_ThrowsConfigurationNotFoundException() {
		stubToAbsolutePath();

		String path = tempDir.resolve("missing.xml").toString();

		assertThrows(
				ApiException.class,
				() -> configurationService.updateConfiguration("test", path, "<new/>")
		);
	}

	@Test
	void addConfiguration_Success() throws Exception {
		stubToAbsolutePath();
		stubWriteFile();

		Path projectDir = tempDir.resolve("myproject");
		Files.createDirectories(projectDir);
		Project project = new Project("myproject", projectDir.toString());

		when(projectService.getProject("myproject")).thenReturn(project);

		String result = configurationService.addConfiguration("myproject", "NewConfig.xml");

		assertNotNull(result);

		Path expectedFile = projectDir.resolve("src/main/configurations/NewConfig.xml");
		assertTrue(Files.exists(expectedFile), "NewConfig.xml should be created on disk");
	}

	@Test
	void addConfiguration_ProjectNotFound_ThrowsException() throws ProjectNotFoundException {
		when(projectService.getProject("unknown")).thenThrow(new ProjectNotFoundException("not found"));

		assertThrows(
				ProjectNotFoundException.class, () -> configurationService.addConfiguration("unknown", "Config.xml"));
	}

	@Test
	void addConfiguration_PathTraversal_ThrowsSecurityException() throws Exception {
		stubToAbsolutePath();

		Path projectDir = tempDir.resolve("myproject");
		Files.createDirectories(projectDir);
		Project project = new Project("myproject", projectDir.toString());
		when(projectService.getProject("myproject")).thenReturn(project);

		assertThrows(
				ApiException.class, () -> configurationService.addConfiguration("myproject", "../../../evil.xml"));
	}
}
