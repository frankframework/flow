package org.frankframework.flow.project;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.stream.Stream;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;
import org.frankframework.flow.exception.ApiException;
import org.frankframework.flow.filesystem.FileSystemStorage;
import org.frankframework.flow.filesystem.FilesystemEntry;
import org.frankframework.flow.projectsettings.FilterType;
import org.frankframework.flow.recentproject.RecentProject;
import org.frankframework.flow.recentproject.RecentProjectsService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.api.io.TempDir;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.web.multipart.MultipartFile;

@ExtendWith(MockitoExtension.class)
public class ConfigurationProjectServiceTest {

	private ConfigurationProjectService configurationProjectService;

	@Mock
	private FileSystemStorage fileSystemStorage;

	@Mock
	private RecentProjectsService recentProjectsService;

	@TempDir
	Path tempDir;

	private final List<RecentProject> recentProjects = new ArrayList<>();

	@BeforeEach
	void init() {
		recentProjects.clear();
		configurationProjectService = new ConfigurationProjectService(fileSystemStorage, recentProjectsService);
	}

	private void stubFileSystemForProjectCreation() throws IOException {
		when(fileSystemStorage.createProjectDirectory(anyString())).thenAnswer(invocation -> {
			String dirName = invocation.getArgument(0);
			Path dirPath = Path.of(dirName);
			String projectName = dirPath.getFileName().toString();
			Path projectDir = tempDir.resolve("src/main/configurations/" + projectName);
			Files.createDirectories(projectDir);
			return projectDir;
		});

		when(fileSystemStorage.toAbsolutePath(anyString())).thenAnswer(invocation -> {
			String path = invocation.getArgument(0);
			Path p = Path.of(path);
			if (p.isAbsolute()) {
				return p;
			}
			return tempDir.resolve(path);
		});

		doAnswer(invocation -> {
			String path = invocation.getArgument(0);
			String content = invocation.getArgument(1);
			Path filePath = Path.of(path);
			if (filePath.getParent() != null) {
				Files.createDirectories(filePath.getParent());
			}
			Files.writeString(filePath, content, StandardCharsets.UTF_8);
			return null;
		})
				.when(fileSystemStorage)
				.writeFile(anyString(), anyString());
	}

	@Test
	public void testAddingProjectToProjectService() throws IOException, ApiException {
		when(fileSystemStorage.isLocalEnvironment()).thenReturn(true);
		when(recentProjectsService.getRecentProjects()).thenReturn(recentProjects);
		stubFileSystemForProjectCreation();

		String projectName = "new_project";

		assertEquals(0, configurationProjectService.getProjects().size());
		assertThrows(ApiException.class, () -> configurationProjectService.getProject(projectName));

		ConfigurationProjectCreateDTO createDTO = new ConfigurationProjectCreateDTO(projectName, "/");
		configurationProjectService.createProjectOnDisk(createDTO);

		assertNotNull(configurationProjectService.getProject(projectName));
	}

	@Test
	public void testCreateProjectOnDiskCreatesDirectoryStructure() throws IOException {
		stubFileSystemForProjectCreation();

		String projectName = "test_proj";
		ConfigurationProjectCreateDTO createDTO = new ConfigurationProjectCreateDTO(projectName, tempDir.toString());
		ConfigurationProject configurationProject = configurationProjectService.createProjectOnDisk(createDTO);

		assertNotNull(configurationProject);
		assertEquals(projectName, configurationProject.getName());

		Path configDir = tempDir.resolve("src/main/configurations/" + projectName);
		assertTrue(Files.exists(configDir), "configurations directory should exist");

		Path configFile = configDir.resolve("Configuration.xml");
		assertTrue(Files.exists(configFile), "Configuration.xml should exist");
		String content = Files.readString(configFile, StandardCharsets.UTF_8);
		assertTrue(content.contains("DefaultConfig"), "Default configuration content should be written");
	}

	@Test
	public void testCreateProjectOnDiskHasConfigurationsInDto() throws IOException, ApiException {
		stubFileSystemForProjectCreation();
		when(fileSystemStorage.toRelativePath(anyString())).thenAnswer(inv -> inv.getArgument(0));

		String projectName = "loaded_proj";
		ConfigurationProjectCreateDTO createDTO = new ConfigurationProjectCreateDTO(projectName, "/");
		configurationProjectService.createProjectOnDisk(createDTO);

		ConfigurationProject configurationProject = configurationProjectService.getProject(projectName);
		assertNotNull(configurationProject);

		ConfigurationProjectDTO dto = configurationProjectService.toDto(configurationProject);
		assertFalse(dto.filepaths().isEmpty(), "Project DTO should dynamically load configurations from disk");
	}

	@Test
	public void testGetProjectThrowsProjectNotFound() {
		when(fileSystemStorage.isLocalEnvironment()).thenReturn(true);
		when(recentProjectsService.getRecentProjects()).thenReturn(recentProjects);

		assertThrows(ApiException.class, () -> configurationProjectService.getProject("missingProject"));
	}

	@Test
	public void testGetProjectsReturnsEmptyListInitially() {
		when(fileSystemStorage.isLocalEnvironment()).thenReturn(true);
		when(recentProjectsService.getRecentProjects()).thenReturn(recentProjects);

		List<ConfigurationProject> configurationProjects = configurationProjectService.getProjects();
		assertEquals(0, configurationProjects.size());
	}

	@Test
	public void testGetProjectsFromRecentList() throws IOException {
		when(fileSystemStorage.isLocalEnvironment()).thenReturn(true);
		when(recentProjectsService.getRecentProjects()).thenReturn(recentProjects);
		stubFileSystemForProjectCreation();

		ConfigurationProjectCreateDTO createDTO = new ConfigurationProjectCreateDTO("my_project", "/");
		configurationProjectService.createProjectOnDisk(createDTO);

		Path projectDir = tempDir.resolve("src/main/configurations/my_project");
		recentProjects.add(new RecentProject("my_project", projectDir.toString(), "2026-01-01T00:00:00Z"));

		configurationProjectService.invalidateCache();

		List<ConfigurationProject> configurationProjects = configurationProjectService.getProjects();
		assertEquals(1, configurationProjects.size());
		assertEquals("my_project", configurationProjects.getFirst().getName());
	}

	@Test
	public void testEnableFilterValid() throws Exception {
		stubFileSystemForProjectCreation();

		ConfigurationProjectCreateDTO createDTO = new ConfigurationProjectCreateDTO("proj", "/");
		configurationProjectService.createProjectOnDisk(createDTO);

		ConfigurationProject configurationProject = configurationProjectService.enableFilter("proj", "ADAPTER");

		assertTrue(configurationProject.getConfigurationSettings().getFilters().get(FilterType.ADAPTER));
	}

	@Test
	public void testDisableFilterValid() throws Exception {
		stubFileSystemForProjectCreation();

		ConfigurationProjectCreateDTO createDTO = new ConfigurationProjectCreateDTO("proj", "/");
		configurationProjectService.createProjectOnDisk(createDTO);

		configurationProjectService.enableFilter("proj", "ADAPTER");
		assertTrue(configurationProjectService
				.getProject("proj")
				.getConfigurationSettings()
				.getFilters()
				.get(FilterType.ADAPTER));

		ConfigurationProject updated = configurationProjectService.disableFilter("proj", "ADAPTER");
		assertFalse(updated.getConfigurationSettings().getFilters().get(FilterType.ADAPTER));
	}

	@Test
	public void testEnableFilterInvalidFilterType() throws IOException {
		stubFileSystemForProjectCreation();

		ConfigurationProjectCreateDTO createDTO = new ConfigurationProjectCreateDTO("proj", "/");
		configurationProjectService.createProjectOnDisk(createDTO);

		ApiException exception = assertThrows(ApiException.class, () -> configurationProjectService.enableFilter("proj", "INVALID_TYPE"));

		assertEquals(
				"Invalid filter type: INVALID_TYPE",
				exception.getMessage()
		);
	}

	@Test
	public void testDisableFilterInvalidFilterType() throws IOException {
		stubFileSystemForProjectCreation();

		ConfigurationProjectCreateDTO createDTO = new ConfigurationProjectCreateDTO("proj", "/");
		configurationProjectService.createProjectOnDisk(createDTO);

		ApiException exception = assertThrows(ApiException.class, () -> configurationProjectService.disableFilter("proj", "INVALID_TYPE"));

		assertEquals(
				"Invalid filter type: INVALID_TYPE",
				exception.getMessage()
		);
	}

	@Test
	public void testEnableFilterProjectNotFound() {
		when(fileSystemStorage.isLocalEnvironment()).thenReturn(true);
		when(recentProjectsService.getRecentProjects()).thenReturn(recentProjects);

		ApiException exception = assertThrows(ApiException.class, () -> configurationProjectService.enableFilter("unknownProject", "ADAPTER"));

		assertTrue(exception.getMessage().contains("unknownProject"));
	}

	@Test
	public void testDisableFilterProjectNotFound() {
		when(fileSystemStorage.isLocalEnvironment()).thenReturn(true);
		when(recentProjectsService.getRecentProjects()).thenReturn(recentProjects);

		ApiException exception = assertThrows(
				ApiException.class, () -> configurationProjectService.disableFilter("unknownProject", "ADAPTER"));

		assertTrue(exception.getMessage().contains("unknownProject"));
	}

	@Test
	public void importProjectFromFilesSuccess() throws Exception {
		when(fileSystemStorage.createProjectDirectory(anyString())).thenAnswer(invocation -> {
			String dirName = invocation.getArgument(0);
			Path dirPath = Path.of(dirName);
			String projectName = dirPath.getFileName().toString();
			Path projectDir = tempDir.resolve(projectName);
			Files.createDirectories(projectDir);
			return projectDir;
		});

		when(fileSystemStorage.toAbsolutePath(anyString())).thenAnswer(invocation -> {
			String pathStr = invocation.getArgument(0);
			Path path = Path.of(pathStr);
			if (path.isAbsolute()) {
				return path;
			}
			return tempDir.resolve(pathStr);
		});

		String projectName = "imported_project";

		MockMultipartFile configFile = new MockMultipartFile(
				"files",
				"Configuration.xml",
				"application/xml",
				"<Configuration><Adapter name='TestAdapter'/></Configuration>".getBytes(StandardCharsets.UTF_8)
		);

		MockMultipartFile propsFile = new MockMultipartFile(
				"files", "application.properties", "text/plain", "key=value".getBytes(StandardCharsets.UTF_8));

		List<MultipartFile> files = List.of(configFile, propsFile);
		List<String> paths =
				List.of("src/main/configurations/Configuration.xml", "src/main/resources/application.properties");

		ConfigurationProject configurationProject = configurationProjectService.importProjectFromFiles(projectName, files, paths);

		assertNotNull(configurationProject);
		assertEquals(projectName, configurationProject.getName());

		Path projectDir = tempDir.resolve(projectName);
		Path writtenConfig = projectDir.resolve("src/main/configurations/Configuration.xml");
		assertTrue(Files.exists(writtenConfig), "Configuration.xml should be written to disk");
		String writtenContent = Files.readString(writtenConfig, StandardCharsets.UTF_8);
		assertTrue(writtenContent.contains("TestAdapter"));

		Path writtenProps = projectDir.resolve("src/main/resources/application.properties");
		assertTrue(Files.exists(writtenProps), "application.properties should be written to disk");
		assertEquals("key=value", Files.readString(writtenProps, StandardCharsets.UTF_8));
	}

	@Test
	void importProjectFromFilesRejectsPathTraversalWithDoubleDots() throws IOException {
		when(fileSystemStorage.createProjectDirectory(anyString())).thenAnswer(invocation -> {
			String dirName = invocation.getArgument(0);
			Path projectDir = tempDir.resolve(dirName);
			Files.createDirectories(projectDir);
			return projectDir;
		});

		String projectName = "traversal_project";

		MockMultipartFile maliciousFile = new MockMultipartFile(
				"files", "evil.xml", "application/xml", "<evil/>".getBytes(StandardCharsets.UTF_8));

		List<MultipartFile> files = List.of(maliciousFile);
		List<String> paths = List.of("../../../etc/evil.xml");

		SecurityException ex = assertThrows(SecurityException.class, () -> configurationProjectService.importProjectFromFiles(projectName, files, paths));

		assertTrue(ex.getMessage().contains("Invalid file path"));
	}

	@Test
	void importProjectFromFilesRejectsAbsolutePath() throws IOException {
		when(fileSystemStorage.createProjectDirectory(anyString())).thenAnswer(invocation -> {
			String dirName = invocation.getArgument(0);
			Path projectDir = tempDir.resolve(dirName);
			Files.createDirectories(projectDir);
			return projectDir;
		});

		String projectName = "abs_path_project";

		MockMultipartFile maliciousFile = new MockMultipartFile(
				"files", "evil.xml", "application/xml", "<evil/>".getBytes(StandardCharsets.UTF_8));

		List<MultipartFile> files = List.of(maliciousFile);
		List<String> paths = List.of("/etc/passwd");

		SecurityException ex = assertThrows(SecurityException.class, () -> configurationProjectService.importProjectFromFiles(projectName, files, paths));

		assertTrue(ex.getMessage().contains("Invalid file path"));
	}

	@Test
	void testInvalidateCacheClearsAllProjects() throws Exception {
		stubFileSystemForProjectCreation();
		when(fileSystemStorage.isLocalEnvironment()).thenReturn(true);
		when(recentProjectsService.getRecentProjects()).thenReturn(recentProjects);

		ConfigurationProjectCreateDTO createDTO1 = new ConfigurationProjectCreateDTO("proj1", "/");
		configurationProjectService.createProjectOnDisk(createDTO1);
		ConfigurationProjectCreateDTO createDTO2 = new ConfigurationProjectCreateDTO("proj2", "/");
		configurationProjectService.createProjectOnDisk(createDTO2);

		assertNotNull(configurationProjectService.getProject("proj1"));
		assertNotNull(configurationProjectService.getProject("proj2"));

		configurationProjectService.invalidateCache();

		assertThrows(ApiException.class, () -> configurationProjectService.getProject("proj1"));
		assertThrows(ApiException.class, () -> configurationProjectService.getProject("proj2"));
	}

	@Test
	void testInvalidateProjectRemovesSingleProject() throws Exception {
		stubFileSystemForProjectCreation();
		when(fileSystemStorage.isLocalEnvironment()).thenReturn(true);
		when(recentProjectsService.getRecentProjects()).thenReturn(recentProjects);

		ConfigurationProjectCreateDTO createDTO1 = new ConfigurationProjectCreateDTO("proj1", "/");
		configurationProjectService.createProjectOnDisk(createDTO1);
		ConfigurationProjectCreateDTO createDTO2 = new ConfigurationProjectCreateDTO("proj2", "/");
		configurationProjectService.createProjectOnDisk(createDTO2);

		configurationProjectService.invalidateProject("proj1");

		assertThrows(ApiException.class, () -> configurationProjectService.getProject("proj1"));
		assertNotNull(configurationProjectService.getProject("proj2"));
	}

	@Test
	void testOpenProjectFromDisk() throws Exception {
		when(fileSystemStorage.toAbsolutePath(anyString())).thenAnswer(invocation -> {
			String pathStr = invocation.getArgument(0);
			Path path = Path.of(pathStr);
			if (path.isAbsolute()) {
				return path;
			}
			return tempDir.resolve(pathStr);
		});

		when(fileSystemStorage.toRelativePath(anyString())).thenAnswer(inv -> inv.getArgument(0));

		String projectName = "manual_project";
		Path projectDir = tempDir.resolve(projectName);
		Files.createDirectories(projectDir.resolve("src/main/configurations"));
		Files.writeString(
				projectDir.resolve("src/main/configurations/TestConfig.xml"),
				"<Configuration name='TestConfig'/>",
				StandardCharsets.UTF_8
		);

		ConfigurationProject configurationProject = configurationProjectService.openProjectFromDisk(projectDir.toString());

		assertNotNull(configurationProject);
		assertEquals(projectName, configurationProject.getName());

		ConfigurationProjectDTO dto = configurationProjectService.toDto(configurationProject);
		assertFalse(dto.filepaths().isEmpty());
	}

	@Test
	void testOpenProjectFromDiskThrowsWhenPathDoesNotExist() throws Exception {
		when(fileSystemStorage.toAbsolutePath(anyString())).thenAnswer(invocation -> {
			String pathStr = invocation.getArgument(0);
			Path path = Path.of(pathStr);
			return path.isAbsolute() ? path : tempDir.resolve(pathStr);
		});

		assertThrows(ApiException.class, () -> configurationProjectService.openProjectFromDisk("nonexistent_project"));
	}

	@Test
	void testOpenProjectFromDiskThrowsWhenPathIsAFile() throws Exception {
		when(fileSystemStorage.toAbsolutePath(anyString())).thenAnswer(invocation -> {
			String pathStr = invocation.getArgument(0);
			Path path = Path.of(pathStr);
			return path.isAbsolute() ? path : tempDir.resolve(pathStr);
		});

		Path file = tempDir.resolve("not_a_directory.xml");
		Files.writeString(file, "<config/>", StandardCharsets.UTF_8);

		assertThrows(ApiException.class, () -> configurationProjectService.openProjectFromDisk(file.toString()));
	}

	@Test
	void testOpenProjectFromDiskLoadsEmptyProject_whenNoConfigurationsDir() throws Exception {
		when(fileSystemStorage.toAbsolutePath(anyString())).thenAnswer(invocation -> {
			String pathStr = invocation.getArgument(0);
			Path path = Path.of(pathStr);
			return path.isAbsolute() ? path : tempDir.resolve(pathStr);
		});

		Path projDir = tempDir.resolve("empty_proj");
		Files.createDirectory(projDir);

		ConfigurationProject configurationProject = configurationProjectService.openProjectFromDisk(projDir.toString());

		assertNotNull(configurationProject);
		assertEquals("empty_proj", configurationProject.getName());

		ConfigurationProjectDTO dto = configurationProjectService.toDto(configurationProject);
		assertTrue(dto.filepaths().isEmpty(), "No configurations dir means empty config list");
	}

	@Test
	void testGetProjectsFromWorkspaceScan() throws Exception {
		when(fileSystemStorage.isLocalEnvironment()).thenReturn(false);

		Path projDir = tempDir.resolve("scanned_proj");
		Files.createDirectories(projDir.resolve("src/main/configurations"));
		Files.writeString(
				projDir.resolve("src/main/configurations/Config.xml"),
				"<Configuration><Adapter name='A'/></Configuration>",
				StandardCharsets.UTF_8
		);

		when(fileSystemStorage.listRoots())
				.thenReturn(List.of(new FilesystemEntry("scanned_proj", projDir.toString(), "directory", true)));

		when(fileSystemStorage.toAbsolutePath(anyString())).thenAnswer(invocation -> {
			String pathStr = invocation.getArgument(0);
			Path path = Path.of(pathStr);
			return path.isAbsolute() ? path : tempDir.resolve(pathStr);
		});

		when(fileSystemStorage.toRelativePath(anyString())).thenAnswer(inv -> inv.getArgument(0));

		List<ConfigurationProject> configurationProjects = configurationProjectService.getProjects();

		assertEquals(1, configurationProjects.size());
		assertEquals("scanned_proj", configurationProjects.getFirst().getName());

		ConfigurationProjectDTO dto = configurationProjectService.toDto(configurationProjects.getFirst());
		assertFalse(dto.filepaths().isEmpty());
	}

	@Test
	void testGetProjectsFromWorkspaceScanSkipsInvalidEntries() throws Exception {
		when(fileSystemStorage.isLocalEnvironment()).thenReturn(false);

		Path validDir = tempDir.resolve("valid_proj");
		Files.createDirectory(validDir);

		Path invalidDir = tempDir.resolve("nonexistent_proj");

		when(fileSystemStorage.listRoots())
				.thenReturn(List.of(
						new FilesystemEntry("valid_proj", validDir.toString(), "directory", true),
						new FilesystemEntry("nonexistent_proj", invalidDir.toString(), "directory", true)
				));

		when(fileSystemStorage.toAbsolutePath(anyString())).thenAnswer(invocation -> {
			String pathStr = invocation.getArgument(0);
			Path path = Path.of(pathStr);
			return path.isAbsolute() ? path : tempDir.resolve(pathStr);
		});

		List<ConfigurationProject> configurationProjects = configurationProjectService.getProjects();

		assertEquals(1, configurationProjects.size(), "Invalid workspace entry should be silently skipped");
		assertEquals("valid_proj", configurationProjects.getFirst().getName());
	}

	@Test
	void testGetProjectsSkipsInvalidRecentProjects() throws Exception {
		when(fileSystemStorage.isLocalEnvironment()).thenReturn(true);
		stubFileSystemForProjectCreation();

		ConfigurationProjectCreateDTO createDTO = new ConfigurationProjectCreateDTO("valid_proj", "/");
		configurationProjectService.createProjectOnDisk(createDTO);
		Path validPath = tempDir.resolve("src/main/configurations/valid_proj");
		Path invalidPath = tempDir.resolve("src/main/configurations/nonexistent_proj");

		recentProjects.add(new RecentProject("valid_proj", validPath.toString(), "2026-01-01T00:00:00Z"));
		recentProjects.add(new RecentProject("nonexistent_proj", invalidPath.toString(), "2026-01-01T00:00:00Z"));

		when(recentProjectsService.getRecentProjects()).thenReturn(recentProjects);

		configurationProjectService.invalidateCache();

		List<ConfigurationProject> configurationProjects = configurationProjectService.getProjects();

		assertEquals(1, configurationProjects.size(), "Stale recent project should be silently skipped");
		assertEquals("valid_proj", configurationProjects.getFirst().getName());
	}

	@Test
	void testExportProjectAsZipContainsProjectFiles() throws Exception {
		stubFileSystemForProjectCreation();

		ConfigurationProjectCreateDTO createDTO = new ConfigurationProjectCreateDTO("export_proj", "/");
		configurationProjectService.createProjectOnDisk(createDTO);

		ByteArrayOutputStream baos = new ByteArrayOutputStream();
		configurationProjectService.exportProjectAsZip("export_proj", baos);

		byte[] zipBytes = baos.toByteArray();
		assertTrue(zipBytes.length > 0, "Zip output should not be empty");

		boolean foundConfigXml = false;
		try (ZipInputStream zis = new ZipInputStream(new ByteArrayInputStream(zipBytes))) {
			ZipEntry entry;
			while ((entry = zis.getNextEntry()) != null) {
				if (entry.getName().contains("Configuration.xml")) {
					foundConfigXml = true;
				}
				zis.closeEntry();
			}
		}
		assertTrue(foundConfigXml, "Zip should contain the default Configuration.xml");
	}

	@Test
	void testExportProjectAsZipThrowsWhenProjectNotFound() {
		when(fileSystemStorage.isLocalEnvironment()).thenReturn(true);
		when(recentProjectsService.getRecentProjects()).thenReturn(recentProjects);

		ByteArrayOutputStream baos = new ByteArrayOutputStream();

		assertThrows(ApiException.class, () -> configurationProjectService.exportProjectAsZip("nonexistent", baos));
	}

	@Test
	void testExportProjectAsZipThrowsWhenDirectoryDeletedAfterCaching() throws Exception {
		stubFileSystemForProjectCreation();

		ConfigurationProjectCreateDTO createDTO = new ConfigurationProjectCreateDTO("deleteme_proj", tempDir.toString());
		configurationProjectService.createProjectOnDisk(createDTO);

		Path projDir = tempDir.resolve("src/main/configurations/deleteme_proj");
		try (Stream<Path> paths = Files.walk(projDir)) {
			paths.sorted(Comparator.reverseOrder()).forEach(path -> {
				try {
					Files.delete(path);
				} catch (IOException e) {
					// ignore
				}
			});
		}

		ByteArrayOutputStream baos = new ByteArrayOutputStream();

		assertThrows(ApiException.class, () -> configurationProjectService.exportProjectAsZip("deleteme_proj", baos));
	}

	@Test
	void testToDtoReturnsCorrectFields() throws Exception {
		stubFileSystemForProjectCreation();
		when(fileSystemStorage.toRelativePath(anyString())).thenAnswer(inv -> inv.getArgument(0));

		ConfigurationProjectCreateDTO createDTO = new ConfigurationProjectCreateDTO("dto_proj", "/");
		configurationProjectService.createProjectOnDisk(createDTO);
		ConfigurationProject configurationProject = configurationProjectService.getProject("dto_proj");

		ConfigurationProjectDTO dto = configurationProjectService.toDto(configurationProject);

		assertNotNull(dto);
		assertEquals("dto_proj", dto.name());
		assertNotNull(dto.rootPath());
		assertFalse(dto.filepaths().isEmpty(), "Should include configuration file paths");
		assertFalse(dto.isGitRepository(), "Plain temp dir should not be detected as git repo");
		assertFalse(dto.hasStoredToken());
	}

	@Test
	void testToDtoDetectsGitRepository() throws Exception {
		stubFileSystemForProjectCreation();
		when(fileSystemStorage.toRelativePath(anyString())).thenAnswer(inv -> inv.getArgument(0));

		ConfigurationProjectCreateDTO createDTO = new ConfigurationProjectCreateDTO("git_proj", "/");
		configurationProjectService.createProjectOnDisk(createDTO);
		ConfigurationProject configurationProject = configurationProjectService.getProject("git_proj");

		Path projAbsPath = fileSystemStorage.toAbsolutePath(configurationProject.getRootPath());
		Files.createDirectory(projAbsPath.resolve(".git"));

		ConfigurationProjectDTO dto = configurationProjectService.toDto(configurationProject);

		assertTrue(dto.isGitRepository(), "Project with .git dir should be detected as git repository");
	}

	@Test
	void testToDtoReportsHasStoredToken_whenTokenIsSet() throws Exception {
		stubFileSystemForProjectCreation();
		when(fileSystemStorage.toRelativePath(anyString())).thenAnswer(inv -> inv.getArgument(0));

		ConfigurationProjectCreateDTO createDTO = new ConfigurationProjectCreateDTO("token_proj", "/");
		configurationProjectService.createProjectOnDisk(createDTO);
		ConfigurationProject configurationProject = configurationProjectService.getProject("token_proj");
		configurationProject.setGitToken("ghp_secrettoken123");

		ConfigurationProjectDTO dto = configurationProjectService.toDto(configurationProject);

		assertTrue(dto.hasStoredToken());
	}

	@Test
	void testToDtoReportsNoStoredToken_whenTokenIsBlank() throws Exception {
		stubFileSystemForProjectCreation();
		when(fileSystemStorage.toRelativePath(anyString())).thenAnswer(inv -> inv.getArgument(0));

		ConfigurationProjectCreateDTO createDTO = new ConfigurationProjectCreateDTO("blank_token_proj", "/");
		configurationProjectService.createProjectOnDisk(createDTO);
		ConfigurationProject configurationProject = configurationProjectService.getProject("blank_token_proj");
		configurationProject.setGitToken("   ");

		ConfigurationProjectDTO dto = configurationProjectService.toDto(configurationProject);

		assertFalse(dto.hasStoredToken(), "A blank/whitespace token should not count as stored");
	}

	@Test
	void testToDtoMapsConfigurationFilepaths() throws Exception {
		stubFileSystemForProjectCreation();
		when(fileSystemStorage.toRelativePath(anyString())).thenAnswer(inv -> inv.getArgument(0));

		ConfigurationProjectCreateDTO createDTO = new ConfigurationProjectCreateDTO("filepath_proj", "/");
		configurationProjectService.createProjectOnDisk(createDTO);
		ConfigurationProject configurationProject = configurationProjectService.getProject("filepath_proj");

		ConfigurationProjectDTO dto = configurationProjectService.toDto(configurationProject);

		assertEquals(1, dto.filepaths().size(), "DTO filepaths should map dynamically from disk");
	}

	@Test
	void testCloneAndOpenProjectThrowsWhenTargetDirectoryAlreadyExists() throws Exception {
		Path existing = tempDir.resolve("already_exists");
		Files.createDirectory(existing);

		when(fileSystemStorage.toAbsolutePath("already_exists")).thenReturn(existing);

		IllegalArgumentException ex = assertThrows(
				IllegalArgumentException.class,
				() -> configurationProjectService.cloneAndOpenProject("https://example.com/repo.git", "already_exists", null)
		);

		assertTrue(ex.getMessage().contains("already_exists"));
	}
}
