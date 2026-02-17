package org.frankframework.flow.filetree;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.NoSuchFileException;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Comparator;
import java.util.List;
import org.frankframework.flow.adapter.AdapterNotFoundException;
import org.frankframework.flow.configuration.ConfigurationNotFoundException;
import org.frankframework.flow.filesystem.FileSystemStorage;
import org.frankframework.flow.project.Project;
import org.frankframework.flow.project.ProjectNotFoundException;
import org.frankframework.flow.project.ProjectService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

/**
 * Validates filesystem operations, recursive tree building, and XML adapter updates.
 */
@ExtendWith(MockitoExtension.class)
public class FileTreeServiceTest {

    @Mock
    private ProjectService projectService;

    @Mock
    private FileSystemStorage fileSystemStorage;

    private FileTreeService fileTreeService;

    private Path tempProjectRoot;
    private static final String TEST_PROJECT_NAME = "FrankFlowTestProject";

    @BeforeEach
    public void setUp() throws IOException {
        tempProjectRoot = Files.createTempDirectory("flow_unit_test");
        fileTreeService = new FileTreeService(projectService, fileSystemStorage);

        // Configure fileSystemStorage mock to delegate to real filesystem operations.
        // toAbsolutePath returns the path as-is since tests use absolute temp paths.
        lenient().when(fileSystemStorage.toAbsolutePath(anyString())).thenAnswer(invocation -> {
            String path = invocation.getArgument(0);
            return Paths.get(path);
        });

        // readFile delegates to the real filesystem
        lenient().when(fileSystemStorage.readFile(anyString())).thenAnswer(invocation -> {
            String path = invocation.getArgument(0);
            return Files.readString(Paths.get(path));
        });

        // writeFile delegates to the real filesystem
        lenient()
                .doAnswer(invocation -> {
                    String path = invocation.getArgument(0);
                    String content = invocation.getArgument(1);
                    Files.writeString(Paths.get(path), content);
                    return null;
                })
                .when(fileSystemStorage)
                .writeFile(anyString(), anyString());

        // Default to local environment
        lenient().when(fileSystemStorage.isLocalEnvironment()).thenReturn(true);
    }

    @AfterEach
    public void tearDown() throws IOException {
        if (tempProjectRoot != null && Files.exists(tempProjectRoot)) {
            try (var stream = Files.walk(tempProjectRoot)) {
                stream.sorted(Comparator.reverseOrder()).forEach(p -> {
                    try {
                        Files.delete(p);
                    } catch (IOException ignored) {
                    }
                });
            }
        }
    }

    @Test
    @DisplayName("Should correctly read content from an existing file")
    public void readFileContent_Success() throws IOException {
        Path file = tempProjectRoot.resolve("test.xml");
        String content = "<test>data</test>";
        Files.writeString(file, content, StandardCharsets.UTF_8);

        String result = fileTreeService.readFileContent(file.toAbsolutePath().toString());
        assertEquals(content, result);
    }

    @Test
    @DisplayName("Should throw NoSuchFileException when file does not exist")
    public void readFileContent_FileNotFound() {
        String path = tempProjectRoot.resolve("non-existent.xml").toString();
        assertThrows(NoSuchFileException.class, () -> fileTreeService.readFileContent(path));
    }

    @Test
    @DisplayName("Should throw IllegalArgumentException when path is a directory")
    public void readFileContent_IsDirectory() throws IOException {
        Path dir = Files.createDirectory(tempProjectRoot.resolve("subdir"));
        String path = dir.toAbsolutePath().toString();

        assertThrows(IllegalArgumentException.class, () -> fileTreeService.readFileContent(path));
    }

    @Test
    @DisplayName("Should successfully overwrite a file with new content")
    public void updateFileContent_Success() throws IOException {
        Path file = tempProjectRoot.resolve("update.xml");
        Files.writeString(file, "old content");

        String newContent = "new content";
        fileTreeService.updateFileContent(file.toAbsolutePath().toString(), newContent);

        assertEquals(newContent, Files.readString(file));
    }

    @Test
    @DisplayName("Should fail when updating a non-existent file")
    public void updateFileContent_MissingFile() {
        String path = tempProjectRoot.resolve("missing-file.xml").toString();
        assertThrows(IllegalArgumentException.class, () -> fileTreeService.updateFileContent(path, "data"));
    }

    @Test
    @DisplayName("Should build a recursive tree structure for deep directories")
    public void getProjectTree_DeepStructure() throws IOException, ProjectNotFoundException {
        Files.writeString(tempProjectRoot.resolve("fileA.xml"), "A");
        Path dir1 = Files.createDirectory(tempProjectRoot.resolve("dir1"));
        Files.writeString(dir1.resolve("fileB.xml"), "B");
        Path dir2 = Files.createDirectory(dir1.resolve("dir2"));
        Files.writeString(dir2.resolve("fileC.xml"), "C");

        Project project =
                new Project(TEST_PROJECT_NAME, tempProjectRoot.toAbsolutePath().toString());
        when(projectService.getProject(TEST_PROJECT_NAME)).thenReturn(project);

        FileTreeNode tree = fileTreeService.getProjectTree(TEST_PROJECT_NAME);

        assertNotNull(tree);
        assertEquals(tempProjectRoot.getFileName().toString(), tree.getName());

        List<FileTreeNode> children = tree.getChildren();
        assertTrue(children.stream().anyMatch(n -> n.getName().equals("fileA.xml")));

        FileTreeNode nodeDir1 = children.stream()
                .filter(n -> n.getName().equals("dir1"))
                .findFirst()
                .orElseThrow();
        assertEquals(2, nodeDir1.getChildren().size());

        FileTreeNode nodeDir2 = nodeDir1.getChildren().stream()
                .filter(n -> n.getName().equals("dir2"))
                .findFirst()
                .orElseThrow();
        assertEquals("fileC.xml", nodeDir2.getChildren().getFirst().getName());
    }

    @Test
    @DisplayName("Should fail if the project is not registered in ProjectService")
    public void getProjectTree_ProjectMissing() throws ProjectNotFoundException {
        when(projectService.getProject("Unknown")).thenThrow(new ProjectNotFoundException("err"));
        assertThrows(IllegalArgumentException.class, () -> fileTreeService.getProjectTree("Unknown"));
    }

    @Test
    void getProjectTreeThrowsIfProjectDoesNotExist() {
        IllegalArgumentException exception = assertThrows(
                IllegalArgumentException.class, () -> fileTreeService.getProjectTree("NonExistentProject"));
        assertTrue(exception.getMessage().contains("Project does not exist: NonExistentProject"));
    }

    @Test
    @DisplayName("Should replace a specific adapter XML block in a configuration file")
    public void updateAdapterFromFile_Success() throws Exception {
        Path configFile = tempProjectRoot.resolve("Configuration.xml");
        String originalXml = "<Configuration><Adapter name=\"Test\"><foo/></Adapter></Configuration>";
        Files.writeString(configFile, originalXml);

        String newAdapterXml = "<Adapter name=\"Test\"><bar/></Adapter>";

        boolean result = fileTreeService.updateAdapterFromFile(TEST_PROJECT_NAME, configFile, "Test", newAdapterXml);

        assertTrue(result);
        String updatedXml = Files.readString(configFile);
        assertTrue(updatedXml.contains("<bar/>"));
    }

    @Test
    @DisplayName("Should throw AdapterNotFoundException if adapter name is missing")
    void updateAdapterFromFile_AdapterNotFound() throws IOException {
        Path configFile = tempProjectRoot.resolve("config.xml");
        Files.writeString(configFile, "<configuration><adapter name=\"Other\"/></configuration>");

        assertThrows(
                AdapterNotFoundException.class,
                () -> fileTreeService.updateAdapterFromFile(TEST_PROJECT_NAME, configFile, "Target", "<xml/>"));
    }

    @Test
    @DisplayName("Should return false if the new adapter XML is malformed")
    public void updateAdapterFromFile_MalformedXml()
            throws IOException, AdapterNotFoundException, ConfigurationNotFoundException {
        Path configFile = tempProjectRoot.resolve("config.xml");
        Files.writeString(configFile, "<configuration><adapter name=\"A\"/></configuration>");

        String badXml = "<adapter name=\"A\"";

        boolean result = fileTreeService.updateAdapterFromFile(TEST_PROJECT_NAME, configFile, "A", badXml);
        assertFalse(result);
    }

    @Test
    @DisplayName("Should handle multiple consecutive file operations correctly")
    void integration_MultipleOperations() throws IOException {
        Path f1 = tempProjectRoot.resolve("f1.xml");
        Path f2 = tempProjectRoot.resolve("f2.xml");

        Files.writeString(f1, "initial");
        Files.writeString(f2, "initial");

        fileTreeService.updateFileContent(f1.toString(), "one");
        fileTreeService.updateFileContent(f2.toString(), "two");

        assertEquals("one", fileTreeService.readFileContent(f1.toString()));
        assertEquals("two", fileTreeService.readFileContent(f2.toString()));
    }

    @Test
    public void getShallowDirectoryTreeReturnsTreeForValidDirectory() throws IOException, ProjectNotFoundException {
        // Create project structure
        Files.writeString(tempProjectRoot.resolve("config1.xml"), "<config/>");
        Files.writeString(tempProjectRoot.resolve("readme.txt"), "hello");

        Project project =
                new Project(TEST_PROJECT_NAME, tempProjectRoot.toAbsolutePath().toString());
        when(projectService.getProject(TEST_PROJECT_NAME)).thenReturn(project);

        FileTreeNode node = fileTreeService.getShallowDirectoryTree(TEST_PROJECT_NAME, ".");

        assertNotNull(node);
        assertEquals(NodeType.DIRECTORY, node.getType());
        assertNotNull(node.getChildren());
        assertEquals(2, node.getChildren().size());

        assertTrue(node.getChildren().stream().anyMatch(c -> c.getName().equals("config1.xml")));
        assertTrue(node.getChildren().stream().anyMatch(c -> c.getName().equals("readme.txt")));
    }

    @Test
    void getShallowDirectoryTreeThrowsSecurityExceptionForPathTraversal() throws ProjectNotFoundException {
        Project project =
                new Project(TEST_PROJECT_NAME, tempProjectRoot.toAbsolutePath().toString());
        when(projectService.getProject(TEST_PROJECT_NAME)).thenReturn(project);

        SecurityException ex = assertThrows(
                SecurityException.class, () -> fileTreeService.getShallowDirectoryTree(TEST_PROJECT_NAME, "../other"));

        assertTrue(ex.getMessage().contains("Invalid path"));
    }

    @Test
    void getShallowDirectoryTreeThrowsIllegalArgumentExceptionIfDirectoryDoesNotExist()
            throws ProjectNotFoundException {
        Project project =
                new Project(TEST_PROJECT_NAME, tempProjectRoot.toAbsolutePath().toString());
        when(projectService.getProject(TEST_PROJECT_NAME)).thenReturn(project);

        IllegalArgumentException ex = assertThrows(
                IllegalArgumentException.class,
                () -> fileTreeService.getShallowDirectoryTree(TEST_PROJECT_NAME, "nonexistent"));

        assertTrue(ex.getMessage().contains("Directory does not exist"));
    }

    @Test
    public void getShallowConfigurationsDirectoryTreeReturnsTreeForExistingDirectory()
            throws IOException, ProjectNotFoundException {
        Path configsDir = tempProjectRoot.resolve("src/main/configurations");
        Files.createDirectories(configsDir);
        Files.writeString(configsDir.resolve("config1.xml"), "<config/>");
        Files.writeString(configsDir.resolve("readme.txt"), "hello");

        Project project =
                new Project(TEST_PROJECT_NAME, tempProjectRoot.toAbsolutePath().toString());
        when(projectService.getProject(TEST_PROJECT_NAME)).thenReturn(project);

        FileTreeNode node = fileTreeService.getShallowConfigurationsDirectoryTree(TEST_PROJECT_NAME);

        assertNotNull(node);
        assertEquals("configurations", node.getName().toLowerCase());
        assertEquals(NodeType.DIRECTORY, node.getType());
        assertNotNull(node.getChildren());
        assertEquals(2, node.getChildren().size());

        assertTrue(node.getChildren().stream().anyMatch(c -> c.getName().equals("config1.xml")));
        assertTrue(node.getChildren().stream().anyMatch(c -> c.getName().equals("readme.txt")));
    }

    @Test
    public void getShallowConfigurationsDirectoryTreeThrowsIfDirectoryDoesNotExist() throws ProjectNotFoundException {
        Project project =
                new Project(TEST_PROJECT_NAME, tempProjectRoot.toAbsolutePath().toString());
        when(projectService.getProject(TEST_PROJECT_NAME)).thenReturn(project);

        IllegalArgumentException ex = assertThrows(
                IllegalArgumentException.class,
                () -> fileTreeService.getShallowConfigurationsDirectoryTree(TEST_PROJECT_NAME));

        assertTrue(ex.getMessage().contains("Configurations directory does not exist"));
    }

    @Test
    public void getShallowConfigurationsDirectoryTreeThrowsIfProjectDoesNotExist() throws ProjectNotFoundException {
        when(projectService.getProject("NonExistentProject")).thenThrow(new ProjectNotFoundException("err"));

        IllegalArgumentException ex = assertThrows(
                IllegalArgumentException.class,
                () -> fileTreeService.getShallowConfigurationsDirectoryTree("NonExistentProject"));

        assertTrue(ex.getMessage().contains("Configurations directory does not exist"));
    }

    @Test
    public void getConfigurationsDirectoryTreeReturnsFullTreeForExistingDirectory()
            throws IOException, ProjectNotFoundException {
        Path configsDir = tempProjectRoot.resolve("src/main/configurations");
        Files.createDirectories(configsDir);
        Files.writeString(configsDir.resolve("config1.xml"), "<config/>");
        Files.writeString(configsDir.resolve("readme.txt"), "hello");
        Path subDir = configsDir.resolve("subconfigs");
        Files.createDirectory(subDir);
        Files.writeString(subDir.resolve("nested.xml"), "<nested></nested>");

        Project project =
                new Project(TEST_PROJECT_NAME, tempProjectRoot.toAbsolutePath().toString());
        when(projectService.getProject(TEST_PROJECT_NAME)).thenReturn(project);

        FileTreeNode node = fileTreeService.getConfigurationsDirectoryTree(TEST_PROJECT_NAME);

        assertNotNull(node);
        assertEquals("configurations", node.getName().toLowerCase());
        assertEquals(NodeType.DIRECTORY, node.getType());
        assertNotNull(node.getChildren());
        assertEquals(3, node.getChildren().size());

        assertTrue(node.getChildren().stream().anyMatch(c -> c.getName().equals("config1.xml")));
        assertTrue(node.getChildren().stream().anyMatch(c -> c.getName().equals("readme.txt")));

        FileTreeNode subConfigNode = node.getChildren().stream()
                .filter(c -> c.getName().equals("subconfigs"))
                .findFirst()
                .orElseThrow();
        assertEquals(NodeType.DIRECTORY, subConfigNode.getType());
        assertEquals(1, subConfigNode.getChildren().size());
        assertEquals("nested.xml", subConfigNode.getChildren().getFirst().getName());
    }

    @Test
    public void getConfigurationsDirectoryTreeThrowsIfDirectoryDoesNotExist() throws ProjectNotFoundException {
        Project project =
                new Project(TEST_PROJECT_NAME, tempProjectRoot.toAbsolutePath().toString());
        when(projectService.getProject(TEST_PROJECT_NAME)).thenReturn(project);

        IllegalArgumentException ex = assertThrows(
                IllegalArgumentException.class,
                () -> fileTreeService.getConfigurationsDirectoryTree(TEST_PROJECT_NAME));

        assertTrue(ex.getMessage().contains("Configurations directory does not exist"));
    }

    @Test
    public void getConfigurationsDirectoryTreeThrowsIfProjectDoesNotExist() throws ProjectNotFoundException {
        when(projectService.getProject("NonExistingProject")).thenThrow(new ProjectNotFoundException("err"));

        IllegalArgumentException ex = assertThrows(
                IllegalArgumentException.class,
                () -> fileTreeService.getConfigurationsDirectoryTree("NonExistingProject"));

        assertTrue(ex.getMessage().contains("Configurations directory does not exist"));
    }
}
