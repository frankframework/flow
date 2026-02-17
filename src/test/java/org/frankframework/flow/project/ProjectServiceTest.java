package org.frankframework.flow.project;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import org.frankframework.flow.adapter.AdapterNotFoundException;
import org.frankframework.flow.configuration.Configuration;
import org.frankframework.flow.configuration.ConfigurationNotFoundException;
import org.frankframework.flow.filesystem.FileSystemStorage;
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
class ProjectServiceTest {

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

    /**
     * Sets up all stubs needed for tests that create projects on disk and then interact with them.
     */
    private void stubFileSystemForProjectCreation() throws IOException {
        when(fileSystemStorage.isLocalEnvironment()).thenReturn(true);

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

        when(fileSystemStorage.readFile(anyString())).thenAnswer(invocation -> {
            String path = invocation.getArgument(0);
            return Files.readString(Path.of(path), StandardCharsets.UTF_8);
        });

        when(recentProjectsService.getRecentProjects()).thenReturn(recentProjects);
    }

    // ---- Create and retrieve projects ----

    @Test
    void testAddingProjectToProjectService() throws ProjectNotFoundException, IOException {
        stubFileSystemForProjectCreation();

        String projectName = "new_project";

        assertEquals(0, projectService.getProjects().size());
        assertThrows(ProjectNotFoundException.class, () -> projectService.getProject(projectName));

        projectService.createProjectOnDisk(projectName);

        // After creation the project is cached, so getProject should find it
        assertNotNull(projectService.getProject(projectName));
    }

    @Test
    void testCreateProjectOnDiskCreatesDirectoryStructure() throws IOException {
        stubFileSystemForProjectCreation();

        String projectName = "test_proj";

        Project project = projectService.createProjectOnDisk(projectName);

        assertNotNull(project);
        assertEquals(projectName, project.getName());

        // Verify that src/main/configurations directory was created
        Path configDir = tempDir.resolve(projectName).resolve("src/main/configurations");
        assertTrue(Files.exists(configDir), "configurations directory should exist");

        // Verify that Configuration.xml was written with default content
        Path configFile = configDir.resolve("Configuration.xml");
        assertTrue(Files.exists(configFile), "Configuration.xml should exist");
        String content = Files.readString(configFile, StandardCharsets.UTF_8);
        assertTrue(content.contains("DefaultConfig"), "Default configuration content should be written");
    }

    @Test
    void testCreateProjectOnDiskLoadsConfiguration() throws IOException, ProjectNotFoundException {
        stubFileSystemForProjectCreation();

        String projectName = "loaded_proj";

        projectService.createProjectOnDisk(projectName);

        Project project = projectService.getProject(projectName);
        assertNotNull(project);
        assertFalse(project.getConfigurations().isEmpty(), "Project should have at least one configuration loaded");
    }

    @Test
    void testGetProjectThrowsProjectNotFound() throws IOException {
        when(fileSystemStorage.isLocalEnvironment()).thenReturn(true);
        when(recentProjectsService.getRecentProjects()).thenReturn(recentProjects);

        assertThrows(ProjectNotFoundException.class, () -> projectService.getProject("missingProject"));
    }

    @Test
    void testGetProjectsReturnsEmptyListInitially() {
        when(fileSystemStorage.isLocalEnvironment()).thenReturn(true);
        when(recentProjectsService.getRecentProjects()).thenReturn(recentProjects);

        List<Project> projects = projectService.getProjects();
        assertEquals(0, projects.size());
    }

    @Test
    void testGetProjectsFromRecentList() throws IOException {
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
    void testUpdateConfigurationXmlSuccess() throws Exception {
        stubFileSystemForProjectCreation();

        projectService.createProjectOnDisk("proj");
        Project project = projectService.getProject("proj");

        // The project should already have at least one configuration from disk
        assertFalse(project.getConfigurations().isEmpty());
        Configuration config = project.getConfigurations().get(0);
        String filepath = config.getFilepath();

        boolean updated = projectService.updateConfigurationXml("proj", filepath, "<root/>");

        assertTrue(updated);
        assertEquals("<root/>", config.getXmlContent());
    }

    @Test
    void testUpdateConfigurationXmlThrowsProjectNotFound() {
        when(fileSystemStorage.isLocalEnvironment()).thenReturn(true);
        when(recentProjectsService.getRecentProjects()).thenReturn(recentProjects);

        assertThrows(
                ProjectNotFoundException.class,
                () -> projectService.updateConfigurationXml("unknownProject", "config.xml", "<root/>"));
    }

    @Test
    void testUpdateConfigurationXmlConfigNotFound() throws Exception {
        stubFileSystemForProjectCreation();

        projectService.createProjectOnDisk("proj");

        assertThrows(
                ConfigurationNotFoundException.class,
                () -> projectService.updateConfigurationXml("proj", "missingConfig.xml", "<root/>"));
    }

    // ---- Filter enable / disable ----

    @Test
    void testEnableFilterValid() throws Exception {
        stubFileSystemForProjectCreation();

        projectService.createProjectOnDisk("proj");

        Project project = projectService.enableFilter("proj", "ADAPTER");

        assertTrue(project.getProjectSettings().getFilters().get(FilterType.ADAPTER));
    }

    @Test
    void testDisableFilterValid() throws Exception {
        stubFileSystemForProjectCreation();

        projectService.createProjectOnDisk("proj");

        // enable first
        projectService.enableFilter("proj", "ADAPTER");
        assertTrue(projectService
                .getProject("proj")
                .getProjectSettings()
                .getFilters()
                .get(FilterType.ADAPTER));

        // disable
        Project updated = projectService.disableFilter("proj", "ADAPTER");
        assertFalse(updated.getProjectSettings().getFilters().get(FilterType.ADAPTER));
    }

    @Test
    void testEnableFilterInvalidFilterType() throws IOException {
        stubFileSystemForProjectCreation();

        projectService.createProjectOnDisk("proj");

        InvalidFilterTypeException ex = assertThrows(
                InvalidFilterTypeException.class, () -> projectService.enableFilter("proj", "INVALID_TYPE"));

        assertEquals("Invalid filter type: INVALID_TYPE", ex.getMessage());
    }

    @Test
    void testDisableFilterInvalidFilterType() throws IOException {
        stubFileSystemForProjectCreation();

        projectService.createProjectOnDisk("proj");

        InvalidFilterTypeException ex = assertThrows(
                InvalidFilterTypeException.class, () -> projectService.disableFilter("proj", "INVALID_TYPE"));

        assertEquals("Invalid filter type: INVALID_TYPE", ex.getMessage());
    }

    @Test
    void testEnableFilterProjectNotFound() {
        when(fileSystemStorage.isLocalEnvironment()).thenReturn(true);
        when(recentProjectsService.getRecentProjects()).thenReturn(recentProjects);

        ProjectNotFoundException ex = assertThrows(
                ProjectNotFoundException.class, () -> projectService.enableFilter("unknownProject", "ADAPTER"));

        assertTrue(ex.getMessage().contains("unknownProject"));
    }

    @Test
    void testDisableFilterProjectNotFound() {
        when(fileSystemStorage.isLocalEnvironment()).thenReturn(true);
        when(recentProjectsService.getRecentProjects()).thenReturn(recentProjects);

        ProjectNotFoundException ex = assertThrows(
                ProjectNotFoundException.class, () -> projectService.disableFilter("unknownProject", "ADAPTER"));

        assertTrue(ex.getMessage().contains("unknownProject"));
    }

    // ---- Update adapter ----

    @Test
    void updateAdapterSuccess() throws Exception {
        stubFileSystemForProjectCreation();

        projectService.createProjectOnDisk("proj");
        Project project = projectService.getProject("proj");

        String originalXml =
                """
                <Configuration>
                    <Adapter name="A1">
                        <Settings>123</Settings>
                    </Adapter>
                    <Adapter name="A2">
                        <Settings>456</Settings>
                    </Adapter>
                </Configuration>
                """;

        Configuration config = new Configuration("conf.xml");
        config.setXmlContent(originalXml);
        project.getConfigurations().add(config);

        String newAdapterXml =
                """
                <Adapter name="A1">
                    <Settings>999</Settings>
                </Adapter>
                """;

        boolean result = projectService.updateAdapter("proj", "conf.xml", "A1", newAdapterXml);

        assertTrue(result);
        String updatedXml = config.getXmlContent();
        assertTrue(updatedXml.contains("<Settings>999</Settings>"));
        assertFalse(updatedXml.contains("<Settings>123</Settings>"));
        assertTrue(updatedXml.contains("A2"), "Other adapters must remain unchanged");
    }

    @Test
    void updateAdapterProjectNotFoundThrows() {
        when(fileSystemStorage.isLocalEnvironment()).thenReturn(true);
        when(recentProjectsService.getRecentProjects()).thenReturn(recentProjects);

        ProjectNotFoundException ex = assertThrows(ProjectNotFoundException.class, () -> {
            projectService.updateAdapter("unknownProject", "conf.xml", "A1", "<Adapter name='A1'/>");
        });
        assertTrue(ex.getMessage().contains("unknownProject"));
    }

    @Test
    void updateAdapterConfigurationNotFoundThrows() throws Exception {
        stubFileSystemForProjectCreation();

        projectService.createProjectOnDisk("proj");

        ConfigurationNotFoundException ex = assertThrows(ConfigurationNotFoundException.class, () -> {
            projectService.updateAdapter("proj", "missing.xml", "A1", "<Adapter name='A1'/>");
        });

        assertEquals("Configuration not found: missing.xml", ex.getMessage());
    }

    @Test
    void updateAdapterAdapterNotFoundThrows() throws Exception {
        stubFileSystemForProjectCreation();

        projectService.createProjectOnDisk("proj");
        Project project = projectService.getProject("proj");

        String xml =
                """
                <Configuration>
                    <Adapter name="Other"/>
                </Configuration>
                """;

        Configuration config = new Configuration("conf.xml");
        config.setXmlContent(xml);
        project.getConfigurations().add(config);

        AdapterNotFoundException ex = assertThrows(AdapterNotFoundException.class, () -> {
            projectService.updateAdapter("proj", "conf.xml", "A1", "<Adapter name='A1'/>");
        });

        assertEquals("Adapter not found: A1", ex.getMessage());
        assertEquals(xml, config.getXmlContent());
    }

    @Test
    void updateAdapterInvalidXmlReturnsFalse() throws Exception {
        stubFileSystemForProjectCreation();

        projectService.createProjectOnDisk("proj");
        Project project = projectService.getProject("proj");

        String xml =
                """
                <Configuration>
                    <Adapter name="A1"/>
                </Configuration>
                """;

        Configuration config = new Configuration("conf.xml");
        config.setXmlContent(xml);
        project.getConfigurations().add(config);

        String invalidXml = "<Adapter><broken>";

        boolean result = projectService.updateAdapter("proj", "conf.xml", "A1", invalidXml);

        assertFalse(result);
        assertEquals(xml, config.getXmlContent());
    }

    // ---- Import project from files ----

    @Test
    void importProjectFromFilesSuccess() throws Exception {
        stubFileSystemForProjectCreation();

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

        // Verify files were actually written to disk
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
    void importProjectFromFilesLoadsConfigurations() throws Exception {
        stubFileSystemForProjectCreation();

        String projectName = "imported_with_configs";

        String configXml =
                """
                <Configuration name="MyConfig">
                    <Adapter name="ImportedAdapter"/>
                </Configuration>
                """;

        MockMultipartFile configFile = new MockMultipartFile(
                "files", "MyConfig.xml", "application/xml", configXml.getBytes(StandardCharsets.UTF_8));

        List<MultipartFile> files = List.of(configFile);
        List<String> paths = List.of("src/main/configurations/MyConfig.xml");

        Project project = projectService.importProjectFromFiles(projectName, files, paths);

        assertNotNull(project);
        assertFalse(project.getConfigurations().isEmpty(), "Imported project should have configurations loaded");

        boolean hasConfig = project.getConfigurations().stream()
                .anyMatch(c -> c.getXmlContent().contains("ImportedAdapter"));
        assertTrue(hasConfig, "Configuration content should contain the imported adapter");
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
    void importProjectFromFilesRejectsBackslashPathTraversal() throws IOException {
        when(fileSystemStorage.createProjectDirectory(anyString())).thenAnswer(invocation -> {
            String dirName = invocation.getArgument(0);
            Path projectDir = tempDir.resolve(dirName);
            Files.createDirectories(projectDir);
            return projectDir;
        });

        String projectName = "backslash_project";

        MockMultipartFile maliciousFile = new MockMultipartFile(
                "files", "evil.xml", "application/xml", "<evil/>".getBytes(StandardCharsets.UTF_8));

        List<MultipartFile> files = List.of(maliciousFile);
        // Backslashes get normalized to forward slashes, but .. is still detected
        List<String> paths = List.of("..\\..\\etc\\evil.xml");

        assertThrows(SecurityException.class, () -> projectService.importProjectFromFiles(projectName, files, paths));
    }

    // ---- Cache invalidation ----

    @Test
    void testInvalidateCacheClearsAllProjects() throws Exception {
        stubFileSystemForProjectCreation();

        projectService.createProjectOnDisk("proj1");
        projectService.createProjectOnDisk("proj2");

        assertNotNull(projectService.getProject("proj1"));
        assertNotNull(projectService.getProject("proj2"));

        projectService.invalidateCache();

        // After invalidation, projects are no longer in cache; without recent projects entries they are not found
        assertThrows(ProjectNotFoundException.class, () -> projectService.getProject("proj1"));
        assertThrows(ProjectNotFoundException.class, () -> projectService.getProject("proj2"));
    }

    @Test
    void testInvalidateProjectRemovesSingleProject() throws Exception {
        stubFileSystemForProjectCreation();

        projectService.createProjectOnDisk("proj1");
        projectService.createProjectOnDisk("proj2");

        projectService.invalidateProject("proj1");

        // proj1 is removed from cache, proj2 remains
        assertThrows(ProjectNotFoundException.class, () -> projectService.getProject("proj1"));
        assertNotNull(projectService.getProject("proj2"));
    }

    // ---- Open project from disk ----

    @Test
    void testOpenProjectFromDisk() throws Exception {
        stubFileSystemForProjectCreation();

        // Manually create a project directory on disk
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
        assertFalse(project.getConfigurations().isEmpty());
    }

    // ---- Add configuration ----

    @Test
    void testAddConfigurationToProject() throws Exception {
        stubFileSystemForProjectCreation();

        projectService.createProjectOnDisk("proj");

        Project project = projectService.addConfiguration("proj", "NewConfig.xml");

        boolean hasNewConfig = project.getConfigurations().stream()
                .anyMatch(c -> c.getFilepath().equals("NewConfig.xml"));
        assertTrue(hasNewConfig, "Project should contain the newly added configuration");
    }

    @Test
    void testAddConfigurationProjectNotFound() {
        when(fileSystemStorage.isLocalEnvironment()).thenReturn(true);
        when(recentProjectsService.getRecentProjects()).thenReturn(recentProjects);

        assertThrows(
                ProjectNotFoundException.class, () -> projectService.addConfiguration("noSuchProject", "Conf.xml"));
    }
}
