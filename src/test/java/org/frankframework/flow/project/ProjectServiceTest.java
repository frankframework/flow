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
import org.frankframework.flow.filesystem.FileSystemStorage;
import org.frankframework.flow.filesystem.FilesystemEntry;
import org.frankframework.flow.projectsettings.FilterType;
import org.frankframework.flow.projectsettings.InvalidFilterTypeException;
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
public class ProjectServiceTest {

	private ProjectService projectService;

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
		projectService = new ProjectService(fileSystemStorage, recentProjectsService);
	}

	private void stubFileSystemForProjectCreation() throws IOException {
		when(fileSystemStorage.createProjectDirectory(anyString())).thenAnswer(invocation -> {
			String dirName = invocation.getArgument(0);
			Path dirPath = Path.of(dirName);
			String projectName = dirPath.getFileName().toString();
			Path projectDir = tempDir.resolve(projectName);
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
	public void testAddingProjectToProjectService() throws ProjectNotFoundException, IOException {
		when(fileSystemStorage.isLocalEnvironment()).thenReturn(true);
		when(recentProjectsService.getRecentProjects()).thenReturn(recentProjects);
		stubFileSystemForProjectCreation();

		String projectName = "new_project";

		assertEquals(0, projectService.getProjects().size());
		assertThrows(ProjectNotFoundException.class, () -> projectService.getProject(projectName));

		projectService.createProjectOnDisk(projectName);

		assertNotNull(projectService.getProject(projectName));
	}

	@Test
	public void testCreateProjectOnDiskCreatesDirectoryStructure() throws IOException {
		stubFileSystemForProjectCreation();

		String projectName = "test_proj";

		Project project = projectService.createProjectOnDisk(projectName);

		assertNotNull(project);
		assertEquals(projectName, project.getName());

		Path configDir = tempDir.resolve(projectName).resolve("src/main/configurations");
		assertTrue(Files.exists(configDir), "configurations directory should exist");

		Path configFile = configDir.resolve("Configuration.xml");
		assertTrue(Files.exists(configFile), "Configuration.xml should exist");
		String content = Files.readString(configFile, StandardCharsets.UTF_8);
		assertTrue(content.contains("DefaultConfig"), "Default configuration content should be written");
	}

	@Test
	public void testCreateProjectOnDiskHasConfigurationsInDto() throws IOException, ProjectNotFoundException {
		stubFileSystemForProjectCreation();
		when(fileSystemStorage.toRelativePath(anyString())).thenAnswer(inv -> inv.getArgument(0));

		String projectName = "loaded_proj";

		projectService.createProjectOnDisk(projectName);

		Project project = projectService.getProject(projectName);
		assertNotNull(project);

		ProjectDTO dto = projectService.toDto(project);
		assertFalse(dto.filepaths().isEmpty(), "Project DTO should dynamically load configurations from disk");
	}

	@Test
	public void testGetProjectThrowsProjectNotFound() {
		when(fileSystemStorage.isLocalEnvironment()).thenReturn(true);
		when(recentProjectsService.getRecentProjects()).thenReturn(recentProjects);

		assertThrows(ProjectNotFoundException.class, () -> projectService.getProject("missingProject"));
	}

	@Test
	public void testGetProjectsReturnsEmptyListInitially() {
		when(fileSystemStorage.isLocalEnvironment()).thenReturn(true);
		when(recentProjectsService.getRecentProjects()).thenReturn(recentProjects);

		List<Project> projects = projectService.getProjects();
		assertEquals(0, projects.size());
	}

	@Test
	public void testGetProjectsFromRecentList() throws IOException {
		when(fileSystemStorage.isLocalEnvironment()).thenReturn(true);
		when(recentProjectsService.getRecentProjects()).thenReturn(recentProjects);
		stubFileSystemForProjectCreation();

		projectService.createProjectOnDisk("my_project");

		Path projectDir = tempDir.resolve("my_project");
		recentProjects.add(new RecentProject("my_project", projectDir.toString(), "2026-01-01T00:00:00Z"));

		projectService.invalidateCache();

		List<Project> projects = projectService.getProjects();
		assertEquals(1, projects.size());
		assertEquals("my_project", projects.getFirst().getName());
	}

	@Test
	public void testEnableFilterValid() throws Exception {
		stubFileSystemForProjectCreation();

		projectService.createProjectOnDisk("proj");

		Project project = projectService.enableFilter("proj", "ADAPTER");

		assertTrue(project.getProjectSettings().getFilters().get(FilterType.ADAPTER));
	}

	@Test
	public void testDisableFilterValid() throws Exception {
		stubFileSystemForProjectCreation();

		projectService.createProjectOnDisk("proj");

		projectService.enableFilter("proj", "ADAPTER");
		assertTrue(projectService
				.getProject("proj")
				.getProjectSettings()
				.getFilters()
				.get(FilterType.ADAPTER));

		Project updated = projectService.disableFilter("proj", "ADAPTER");
		assertFalse(updated.getProjectSettings().getFilters().get(FilterType.ADAPTER));
	}

	@Test
	public void testEnableFilterInvalidFilterType() throws IOException {
		stubFileSystemForProjectCreation();

		projectService.createProjectOnDisk("proj");

		InvalidFilterTypeException ex = assertThrows(
				InvalidFilterTypeException.class, () -> projectService.enableFilter("proj", "INVALID_TYPE"));

		assertEquals("Invalid filter type: INVALID_TYPE", ex.getMessage());
	}

	@Test
	public void testDisableFilterInvalidFilterType() throws IOException {
		stubFileSystemForProjectCreation();

		projectService.createProjectOnDisk("proj");

		InvalidFilterTypeException ex = assertThrows(
				InvalidFilterTypeException.class, () -> projectService.disableFilter("proj", "INVALID_TYPE"));

		assertEquals("Invalid filter type: INVALID_TYPE", ex.getMessage());
	}

	@Test
	public void testEnableFilterProjectNotFound() {
		when(fileSystemStorage.isLocalEnvironment()).thenReturn(true);
		when(recentProjectsService.getRecentProjects()).thenReturn(recentProjects);

		ProjectNotFoundException ex = assertThrows(
				ProjectNotFoundException.class, () -> projectService.enableFilter("unknownProject", "ADAPTER"));

		assertTrue(ex.getMessage().contains("unknownProject"));
	}

	@Test
	public void testDisableFilterProjectNotFound() {
		when(fileSystemStorage.isLocalEnvironment()).thenReturn(true);
		when(recentProjectsService.getRecentProjects()).thenReturn(recentProjects);

		ProjectNotFoundException ex = assertThrows(
				ProjectNotFoundException.class, () -> projectService.disableFilter("unknownProject", "ADAPTER"));

		assertTrue(ex.getMessage().contains("unknownProject"));
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
			String path = invocation.getArgument(0);
			Path p = Path.of(path);
			if (p.isAbsolute()) {
				return p;
			}
			return tempDir.resolve(path);
		});

		String projectName = "imported_project";

		MockMultipartFile configFile = new MockMultipartFile(
				"files",
				"Configuration.xml",
				"application/xml",
				"<Configuration><Adapter name='TestAdapter'/></Configuration>".getBytes(StandardCharsets.UTF_8));

		MockMultipartFile propsFile = new MockMultipartFile(
				"files", "application.properties", "text/plain", "key=value".getBytes(StandardCharsets.UTF_8));

		List<MultipartFile> files = List.of(configFile, propsFile);
		List<String> paths =
				List.of("src/main/configurations/Configuration.xml", "src/main/resources/application.properties");

		Project project = projectService.importProjectFromFiles(projectName, files, paths);

		assertNotNull(project);
		assertEquals(projectName, project.getName());

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

		SecurityException ex = assertThrows(
				SecurityException.class, () -> projectService.importProjectFromFiles(projectName, files, paths));

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

		SecurityException ex = assertThrows(
				SecurityException.class, () -> projectService.importProjectFromFiles(projectName, files, paths));

		assertTrue(ex.getMessage().contains("Invalid file path"));
	}

	@Test
	void testInvalidateCacheClearsAllProjects() throws Exception {
		stubFileSystemForProjectCreation();
		when(fileSystemStorage.isLocalEnvironment()).thenReturn(true);
		when(recentProjectsService.getRecentProjects()).thenReturn(recentProjects);

		projectService.createProjectOnDisk("proj1");
		projectService.createProjectOnDisk("proj2");

		assertNotNull(projectService.getProject("proj1"));
		assertNotNull(projectService.getProject("proj2"));

		projectService.invalidateCache();

		assertThrows(ProjectNotFoundException.class, () -> projectService.getProject("proj1"));
		assertThrows(ProjectNotFoundException.class, () -> projectService.getProject("proj2"));
	}

	@Test
	void testInvalidateProjectRemovesSingleProject() throws Exception {
		stubFileSystemForProjectCreation();
		when(fileSystemStorage.isLocalEnvironment()).thenReturn(true);
		when(recentProjectsService.getRecentProjects()).thenReturn(recentProjects);

		projectService.createProjectOnDisk("proj1");
		projectService.createProjectOnDisk("proj2");

		projectService.invalidateProject("proj1");

		assertThrows(ProjectNotFoundException.class, () -> projectService.getProject("proj1"));
		assertNotNull(projectService.getProject("proj2"));
	}

	@Test
	void testOpenProjectFromDisk() throws Exception {
		when(fileSystemStorage.toAbsolutePath(anyString())).thenAnswer(invocation -> {
			String path = invocation.getArgument(0);
			Path p = Path.of(path);
			if (p.isAbsolute()) {
				return p;
			}
			return tempDir.resolve(path);
		});

		when(fileSystemStorage.toRelativePath(anyString())).thenAnswer(inv -> inv.getArgument(0));

		String projectName = "manual_project";
		Path projectDir = tempDir.resolve(projectName);
		Files.createDirectories(projectDir.resolve("src/main/configurations"));
		Files.writeString(
				projectDir.resolve("src/main/configurations/TestConfig.xml"),
				"<Configuration name='TestConfig'/>",
				StandardCharsets.UTF_8);

		Project project = projectService.openProjectFromDisk(projectDir.toString());

		assertNotNull(project);
		assertEquals(projectName, project.getName());

		ProjectDTO dto = projectService.toDto(project);
		assertFalse(dto.filepaths().isEmpty());
	}

	@Test
	void testOpenProjectFromDiskThrowsWhenPathDoesNotExist() throws Exception {
		when(fileSystemStorage.toAbsolutePath(anyString())).thenAnswer(invocation -> {
			String path = invocation.getArgument(0);
			Path p = Path.of(path);
			return p.isAbsolute() ? p : tempDir.resolve(path);
		});

		assertThrows(ProjectNotFoundException.class, () -> projectService.openProjectFromDisk("nonexistent_project"));
	}

	@Test
	void testOpenProjectFromDiskThrowsWhenPathIsAFile() throws Exception {
		when(fileSystemStorage.toAbsolutePath(anyString())).thenAnswer(invocation -> {
			String path = invocation.getArgument(0);
			Path p = Path.of(path);
			return p.isAbsolute() ? p : tempDir.resolve(path);
		});

		Path file = tempDir.resolve("not_a_directory.xml");
		Files.writeString(file, "<config/>", StandardCharsets.UTF_8);

		assertThrows(ProjectNotFoundException.class, () -> projectService.openProjectFromDisk(file.toString()));
	}

	@Test
	void testOpenProjectFromDiskLoadsEmptyProject_whenNoConfigurationsDir() throws Exception {
		when(fileSystemStorage.toAbsolutePath(anyString())).thenAnswer(invocation -> {
			String path = invocation.getArgument(0);
			Path p = Path.of(path);
			return p.isAbsolute() ? p : tempDir.resolve(path);
		});

		Path projDir = tempDir.resolve("empty_proj");
		Files.createDirectory(projDir);

		Project project = projectService.openProjectFromDisk(projDir.toString());

		assertNotNull(project);
		assertEquals("empty_proj", project.getName());

		ProjectDTO dto = projectService.toDto(project);
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
				StandardCharsets.UTF_8);

		when(fileSystemStorage.listRoots())
				.thenReturn(List.of(new FilesystemEntry("scanned_proj", projDir.toString(), "directory", true)));

		when(fileSystemStorage.toAbsolutePath(anyString())).thenAnswer(invocation -> {
			String path = invocation.getArgument(0);
			Path p = Path.of(path);
			return p.isAbsolute() ? p : tempDir.resolve(path);
		});

		when(fileSystemStorage.toRelativePath(anyString())).thenAnswer(inv -> inv.getArgument(0));

		List<Project> projects = projectService.getProjects();

		assertEquals(1, projects.size());
		assertEquals("scanned_proj", projects.getFirst().getName());

		ProjectDTO dto = projectService.toDto(projects.getFirst());
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
						new FilesystemEntry("nonexistent_proj", invalidDir.toString(), "directory", true)));

		when(fileSystemStorage.toAbsolutePath(anyString())).thenAnswer(invocation -> {
			String path = invocation.getArgument(0);
			Path p = Path.of(path);
			return p.isAbsolute() ? p : tempDir.resolve(path);
		});

		List<Project> projects = projectService.getProjects();

		assertEquals(1, projects.size(), "Invalid workspace entry should be silently skipped");
		assertEquals("valid_proj", projects.getFirst().getName());
	}

	@Test
	void testGetProjectsSkipsInvalidRecentProjects() throws Exception {
		when(fileSystemStorage.isLocalEnvironment()).thenReturn(true);
		stubFileSystemForProjectCreation();

		projectService.createProjectOnDisk("valid_proj");
		Path validPath = tempDir.resolve("valid_proj");
		Path invalidPath = tempDir.resolve("nonexistent_proj");

		recentProjects.add(new RecentProject("valid_proj", validPath.toString(), "2026-01-01T00:00:00Z"));
		recentProjects.add(new RecentProject("nonexistent_proj", invalidPath.toString(), "2026-01-01T00:00:00Z"));

		when(recentProjectsService.getRecentProjects()).thenReturn(recentProjects);

		projectService.invalidateCache();

		List<Project> projects = projectService.getProjects();

		assertEquals(1, projects.size(), "Stale recent project should be silently skipped");
		assertEquals("valid_proj", projects.getFirst().getName());
	}

	@Test
	void testExportProjectAsZipContainsProjectFiles() throws Exception {
		stubFileSystemForProjectCreation();

		projectService.createProjectOnDisk("export_proj");

		ByteArrayOutputStream baos = new ByteArrayOutputStream();
		projectService.exportProjectAsZip("export_proj", baos);

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

		assertThrows(ProjectNotFoundException.class, () -> projectService.exportProjectAsZip("nonexistent", baos));
	}

	@Test
	void testExportProjectAsZipThrowsWhenDirectoryDeletedAfterCaching() throws Exception {
		stubFileSystemForProjectCreation();

		projectService.createProjectOnDisk("deleteme_proj");

		Path projDir = tempDir.resolve("deleteme_proj");
		try (Stream<Path> paths = Files.walk(projDir)) {
			paths.sorted(Comparator.reverseOrder()).forEach(p -> {
				try {
					Files.delete(p);
				} catch (IOException e) {
					// ignore
				}
			});
		}

		ByteArrayOutputStream baos = new ByteArrayOutputStream();

		assertThrows(ProjectNotFoundException.class, () -> projectService.exportProjectAsZip("deleteme_proj", baos));
	}

	@Test
	void testToDtoReturnsCorrectFields() throws Exception {
		stubFileSystemForProjectCreation();
		when(fileSystemStorage.toRelativePath(anyString())).thenAnswer(inv -> inv.getArgument(0));

		projectService.createProjectOnDisk("dto_proj");
		Project project = projectService.getProject("dto_proj");

		ProjectDTO dto = projectService.toDto(project);

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

		projectService.createProjectOnDisk("git_proj");
		Project project = projectService.getProject("git_proj");

		Path projAbsPath = fileSystemStorage.toAbsolutePath(project.getRootPath());
		Files.createDirectory(projAbsPath.resolve(".git"));

		ProjectDTO dto = projectService.toDto(project);

		assertTrue(dto.isGitRepository(), "Project with .git dir should be detected as git repository");
	}

	@Test
	void testToDtoReportsHasStoredToken_whenTokenIsSet() throws Exception {
		stubFileSystemForProjectCreation();
		when(fileSystemStorage.toRelativePath(anyString())).thenAnswer(inv -> inv.getArgument(0));

		projectService.createProjectOnDisk("token_proj");
		Project project = projectService.getProject("token_proj");
		project.setGitToken("ghp_secrettoken123");

		ProjectDTO dto = projectService.toDto(project);

		assertTrue(dto.hasStoredToken());
	}

	@Test
	void testToDtoReportsNoStoredToken_whenTokenIsBlank() throws Exception {
		stubFileSystemForProjectCreation();
		when(fileSystemStorage.toRelativePath(anyString())).thenAnswer(inv -> inv.getArgument(0));

		projectService.createProjectOnDisk("blank_token_proj");
		Project project = projectService.getProject("blank_token_proj");
		project.setGitToken("   ");

		ProjectDTO dto = projectService.toDto(project);

		assertFalse(dto.hasStoredToken(), "A blank/whitespace token should not count as stored");
	}

	@Test
	void testToDtoMapsConfigurationFilepaths() throws Exception {
		stubFileSystemForProjectCreation();
		when(fileSystemStorage.toRelativePath(anyString())).thenAnswer(inv -> inv.getArgument(0));

		projectService.createProjectOnDisk("filepath_proj");
		Project project = projectService.getProject("filepath_proj");

		ProjectDTO dto = projectService.toDto(project);

		assertEquals(1, dto.filepaths().size(), "DTO filepaths should map dynamically from disk");
	}

	@Test
	void testCloneAndOpenProjectThrowsWhenTargetDirectoryAlreadyExists() throws Exception {
		Path existing = tempDir.resolve("already_exists");
		Files.createDirectory(existing);

		when(fileSystemStorage.toAbsolutePath("already_exists")).thenReturn(existing);

		IllegalArgumentException ex = assertThrows(
				IllegalArgumentException.class,
				() -> projectService.cloneAndOpenProject("https://example.com/repo.git", "already_exists", null));

		assertTrue(ex.getMessage().contains("already_exists"));
	}
}
