package org.frankframework.flow.filetree;

import static org.junit.Assert.assertNull;
import static org.junit.Assert.assertSame;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.FileAlreadyExistsException;
import java.nio.file.Files;
import java.nio.file.NoSuchFileException;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Comparator;
import java.util.List;
import org.frankframework.flow.adapter.AdapterNotFoundException;
import org.frankframework.flow.configuration.ConfigurationNotFoundException;
import org.frankframework.flow.exception.ApiException;
import org.frankframework.flow.filesystem.FileOperations;
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
 * Validates filesystem operations, recursive tree building, and XML adapter
 * updates.
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

    private void stubToAbsolutePath() throws IOException {
        when(fileSystemStorage.toAbsolutePath(anyString())).thenAnswer(invocation -> {
            String path = invocation.getArgument(0);
            Path p = Paths.get(path);
            return p.isAbsolute() ? p : tempProjectRoot.resolve(p).normalize();
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

    @Test
    @DisplayName("Should correctly read content from an existing file")
    public void readFileContent_Success() throws IOException {
        stubToAbsolutePath();
        stubReadFile();

        Path file = tempProjectRoot.resolve("test.xml");
        String content = "<test>data</test>";
        Files.writeString(file, content, StandardCharsets.UTF_8);

        String result = fileTreeService.readFileContent(file.toAbsolutePath().toString());
        assertEquals(content, result);
    }

    @Test
    @DisplayName("Should throw NoSuchFileException when file does not exist")
    public void readFileContent_FileNotFound() throws IOException {
        stubToAbsolutePath();

        String path = tempProjectRoot.resolve("non-existent.xml").toString();
        assertThrows(NoSuchFileException.class, () -> fileTreeService.readFileContent(path));
    }

    @Test
    @DisplayName("Should throw IllegalArgumentException when path is a directory")
    public void readFileContent_IsDirectory() throws IOException {
        stubToAbsolutePath();

        Path dir = Files.createDirectory(tempProjectRoot.resolve("subdir"));
        String path = dir.toAbsolutePath().toString();

        assertThrows(IllegalArgumentException.class, () -> fileTreeService.readFileContent(path));
    }

    @Test
    @DisplayName("Should successfully overwrite a file with new content")
    public void updateFileContent_Success() throws Exception {
        stubToAbsolutePath();
        stubWriteFile();

        Path file = tempProjectRoot.resolve("update.xml");
        Files.writeString(file, "<Configuration>old</Configuration>");

        String newContent = "<Configuration>new content</Configuration>";

        fileTreeService.updateFileContent(
                TEST_PROJECT_NAME, file.toAbsolutePath().toString(), newContent);

        String written = Files.readString(file);

        assertTrue(written.contains("new content"));
        assertTrue(written.contains("xmlns:flow"));
    }

    @Test
    @DisplayName("Should fail when updating a non-existent file")
    public void updateFileContent_MissingFile() throws IOException {
        stubToAbsolutePath();

        String path = tempProjectRoot.resolve("missing-file.xml").toString();
        assertThrows(
                IllegalArgumentException.class,
                () -> fileTreeService.updateFileContent(TEST_PROJECT_NAME, path, "data"));
    }

    @Test
    @DisplayName("Should build a recursive tree structure for deep directories")
    public void getProjectTree_DeepStructure() throws IOException, ProjectNotFoundException {
        stubToAbsolutePath();
        when(fileSystemStorage.isLocalEnvironment()).thenReturn(true);

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
    void getProjectTreeThrowsIfProjectDoesNotExist() throws ProjectNotFoundException {
        when(projectService.getProject("NonExistentProject")).thenThrow(new ProjectNotFoundException("err"));
        IllegalArgumentException exception = assertThrows(
                IllegalArgumentException.class, () -> fileTreeService.getProjectTree("NonExistentProject"));
        assertTrue(exception.getMessage().contains("Project does not exist: NonExistentProject"));
    }

    @Test
    @DisplayName("Should replace a specific adapter XML block in a configuration file")
    public void updateAdapterFromFile_Success() throws Exception {
        stubToAbsolutePath();

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
        stubToAbsolutePath();

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
        stubToAbsolutePath();

        Path configFile = tempProjectRoot.resolve("config.xml");
        Files.writeString(configFile, "<configuration><adapter name=\"A\"/></configuration>");

        String badXml = "<adapter name=\"A\"";

        boolean result = fileTreeService.updateAdapterFromFile(TEST_PROJECT_NAME, configFile, "A", badXml);
        assertFalse(result);
    }

    @Test
    @DisplayName("Should handle multiple consecutive file operations correctly")
    void integration_MultipleOperations()
            throws IOException, ProjectNotFoundException, ConfigurationNotFoundException, Exception {
        stubToAbsolutePath();
        stubReadFile();
        stubWriteFile();

        Path f1 = tempProjectRoot.resolve("f1.xml");
        Path f2 = tempProjectRoot.resolve("f2.xml");

        Files.writeString(f1, "<Configuration>initial</Configuration>");
        Files.writeString(f2, "<Configuration>initial</Configuration>");

        fileTreeService.updateFileContent(TEST_PROJECT_NAME, f1.toString(), "<Configuration>one</Configuration>");

        fileTreeService.updateFileContent(TEST_PROJECT_NAME, f2.toString(), "<Configuration>two</Configuration>");

        assertTrue(fileTreeService.readFileContent(f1.toString()).contains("one"));
        assertTrue(fileTreeService.readFileContent(f2.toString()).contains("two"));
    }

    @Test
    public void getShallowDirectoryTreeReturnsTreeForValidDirectory() throws IOException, ProjectNotFoundException {
        stubToAbsolutePath();

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
    void getShallowDirectoryTreeThrowsSecurityExceptionForPathTraversal() throws ProjectNotFoundException, IOException {
        stubToAbsolutePath();

        Project project =
                new Project(TEST_PROJECT_NAME, tempProjectRoot.toAbsolutePath().toString());
        when(projectService.getProject(TEST_PROJECT_NAME)).thenReturn(project);

        SecurityException ex = assertThrows(
                SecurityException.class, () -> fileTreeService.getShallowDirectoryTree(TEST_PROJECT_NAME, "../other"));

        assertTrue(ex.getMessage().contains("Invalid path"));
    }

    @Test
    void getShallowDirectoryTreeThrowsIllegalArgumentExceptionIfDirectoryDoesNotExist()
            throws ProjectNotFoundException, IOException {
        stubToAbsolutePath();

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
        stubToAbsolutePath();

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
    public void getShallowConfigurationsDirectoryTreeThrowsIfDirectoryDoesNotExist()
            throws ProjectNotFoundException, IOException {
        stubToAbsolutePath();

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
        stubToAbsolutePath();
        when(fileSystemStorage.isLocalEnvironment()).thenReturn(true);

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
    public void getConfigurationsDirectoryTreeThrowsIfDirectoryDoesNotExist()
            throws ProjectNotFoundException, IOException {
        stubToAbsolutePath();

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

    @Test
    @DisplayName("Should throw IllegalArgumentException for a null file name")
    void createFile_NullName_ThrowsIllegalArgument() {
        assertThrows(
                IllegalArgumentException.class,
                () -> fileTreeService.createFile(TEST_PROJECT_NAME, "/some/path", null));
    }

    @Test
    @DisplayName("Should throw IllegalArgumentException for a blank file name")
    void createFile_BlankName_ThrowsIllegalArgument() {
        assertThrows(
                IllegalArgumentException.class,
                () -> fileTreeService.createFile(TEST_PROJECT_NAME, "/some/path", "   "));
    }

    @Test
    @DisplayName("Should throw IllegalArgumentException when file name contains a forward slash")
    void createFile_NameWithForwardSlash_ThrowsIllegalArgument() {
        assertThrows(
                IllegalArgumentException.class,
                () -> fileTreeService.createFile(TEST_PROJECT_NAME, "/some/path", "bad/name.xml"));
    }

    @Test
    @DisplayName("Should throw IllegalArgumentException when file name contains a backslash")
    void createFile_NameWithBackslash_ThrowsIllegalArgument() {
        assertThrows(
                IllegalArgumentException.class,
                () -> fileTreeService.createFile(TEST_PROJECT_NAME, "/some/path", "bad\\name.xml"));
    }

    @Test
    @DisplayName("Should throw IllegalArgumentException when file name is double dots")
    void createFile_NameWithDoubleDots_ThrowsIllegalArgument() {
        assertThrows(
                IllegalArgumentException.class,
                () -> fileTreeService.createFile(TEST_PROJECT_NAME, "/some/path", ".."));
    }

    @Test
    @DisplayName("Should create a file and return a FileTreeNode with FILE type")
    void createFile_Success() throws IOException, ProjectNotFoundException, ApiException {
        stubToAbsolutePath();
        stubCreateFile();

        Project project =
                new Project(TEST_PROJECT_NAME, tempProjectRoot.toAbsolutePath().toString());
        when(projectService.getProject(TEST_PROJECT_NAME)).thenReturn(project);

        String parentPath = tempProjectRoot.toAbsolutePath().toString();
        FileTreeNode node = fileTreeService.createFile(TEST_PROJECT_NAME, parentPath, "newFile.json");

        assertNotNull(node);
        assertEquals("newFile.json", node.getName());
        assertEquals(NodeType.FILE, node.getType());
        assertTrue(node.getPath().endsWith("newFile.json"));
        assertTrue(Files.exists(tempProjectRoot.resolve("newFile.json")), "File must exist on disk after creation");
    }

    @Test
    @DisplayName("Should create a file correctly when parent path already ends with a slash")
    void createFile_ParentPathWithTrailingSlash_DoesNotDoubleSlash()
            throws IOException, ProjectNotFoundException, ApiException {
        stubToAbsolutePath();
        stubCreateFile();

        Project project =
                new Project(TEST_PROJECT_NAME, tempProjectRoot.toAbsolutePath().toString());
        when(projectService.getProject(TEST_PROJECT_NAME)).thenReturn(project);

        String parentPath = tempProjectRoot.toAbsolutePath() + "/";
        FileTreeNode node = fileTreeService.createFile(TEST_PROJECT_NAME, parentPath, "trailing.json");

        assertNotNull(node);
        assertEquals("trailing.json", node.getName());
        assertEquals(NodeType.FILE, node.getType());
        assertFalse(node.getPath().contains("//"), "Path must not contain double slashes");
        assertTrue(Files.exists(tempProjectRoot.resolve("trailing.json")), "File must exist on disk after creation");
    }

    @Test
    @DisplayName("Should throw SecurityException when the file path is outside the project directory")
    void createFile_OutsideProject_ThrowsSecurityException() throws IOException, ProjectNotFoundException {
        stubToAbsolutePath();

        Project project =
                new Project(TEST_PROJECT_NAME, tempProjectRoot.toAbsolutePath().toString());
        when(projectService.getProject(TEST_PROJECT_NAME)).thenReturn(project);

        String outsidePath = tempProjectRoot.getParent().toAbsolutePath().toString();
        assertThrows(
                SecurityException.class,
                () -> fileTreeService.createFile(TEST_PROJECT_NAME, outsidePath, "escape.json"));
    }

    @Test
    @DisplayName("Should throw IllegalArgumentException when project is not found during createFile")
    void createFile_ProjectNotFound_ThrowsIllegalArgument() throws ProjectNotFoundException {
        when(projectService.getProject("Unknown")).thenThrow(new ProjectNotFoundException("err"));

        assertThrows(
                IllegalArgumentException.class, () -> fileTreeService.createFile("Unknown", "/some/path", "file.json"));
    }

    @Test
    @DisplayName("Should create configuration when creating an .xml file")
    void createFile_ShouldDelegateToProjectService_WhenXml() throws Exception {
        stubToAbsolutePath();

        Project project =
                new Project(TEST_PROJECT_NAME, tempProjectRoot.toAbsolutePath().toString());

        when(projectService.addConfigurationToFolder(eq(TEST_PROJECT_NAME), eq("config.xml"), anyString()))
                .thenReturn(project);
        when(projectService.getProject(TEST_PROJECT_NAME)).thenReturn(project);

        FileTreeNode node = fileTreeService.createFile(
                TEST_PROJECT_NAME, tempProjectRoot.toAbsolutePath().toString(), "config.xml");

        assertNull(node);
        verify(projectService).addConfigurationToFolder(eq(TEST_PROJECT_NAME), eq("config.xml"), anyString());
    }

    @Test
    @DisplayName("Should create a folder and return a FileTreeNode with DIRECTORY type")
    void createFolder_Success() throws IOException, ProjectNotFoundException {
        stubToAbsolutePath();
        stubCreateProjectDirectory();

        Project project =
                new Project(TEST_PROJECT_NAME, tempProjectRoot.toAbsolutePath().toString());
        when(projectService.getProject(TEST_PROJECT_NAME)).thenReturn(project);

        String parentPath = tempProjectRoot.toAbsolutePath().toString();
        FileTreeNode node = fileTreeService.createFolder(TEST_PROJECT_NAME, parentPath, "newFolder");

        assertNotNull(node);
        assertEquals("newFolder", node.getName());
        assertEquals(NodeType.DIRECTORY, node.getType());
        assertTrue(node.getPath().endsWith("newFolder"));
    }

    @Test
    @DisplayName("Should throw IllegalArgumentException for a null folder name")
    void createFolder_NullName_ThrowsIllegalArgument() {
        assertThrows(
                IllegalArgumentException.class,
                () -> fileTreeService.createFolder(TEST_PROJECT_NAME, "/some/path", null));
    }

    @Test
    @DisplayName("Should throw IllegalArgumentException when folder name contains a backslash")
    void createFolder_NameWithBackslash_ThrowsIllegalArgument() {
        assertThrows(
                IllegalArgumentException.class,
                () -> fileTreeService.createFolder(TEST_PROJECT_NAME, "/some/path", "bad\\folder"));
    }

    @Test
    @DisplayName("Should rename a file and return a node with FILE type in local environment")
    void renameFile_LocalEnvironment_File() throws IOException, ProjectNotFoundException {
        stubToAbsolutePath();
        stubRename();
        when(fileSystemStorage.isLocalEnvironment()).thenReturn(true);

        Project project =
                new Project(TEST_PROJECT_NAME, tempProjectRoot.toAbsolutePath().toString());
        when(projectService.getProject(TEST_PROJECT_NAME)).thenReturn(project);

        Path oldFile = Files.writeString(tempProjectRoot.resolve("old.xml"), "content");
        String oldPath = oldFile.toAbsolutePath().toString();

        FileTreeNode node = fileTreeService.renameFile(TEST_PROJECT_NAME, oldPath, "new.xml");

        assertEquals("new.xml", node.getName());
        assertEquals(NodeType.FILE, node.getType());
        assertTrue(Files.exists(tempProjectRoot.resolve("new.xml")));
        assertFalse(Files.exists(oldFile));
    }

    @Test
    @DisplayName("Should rename a directory and return a node with DIRECTORY type")
    void renameFile_LocalEnvironment_Directory() throws IOException, ProjectNotFoundException {
        stubToAbsolutePath();
        stubRename();
        when(fileSystemStorage.isLocalEnvironment()).thenReturn(true);

        Project project =
                new Project(TEST_PROJECT_NAME, tempProjectRoot.toAbsolutePath().toString());
        when(projectService.getProject(TEST_PROJECT_NAME)).thenReturn(project);

        Path oldDir = Files.createDirectory(tempProjectRoot.resolve("oldDir"));
        String oldPath = oldDir.toAbsolutePath().toString();

        FileTreeNode node = fileTreeService.renameFile(TEST_PROJECT_NAME, oldPath, "newDir");

        assertEquals("newDir", node.getName());
        assertEquals(NodeType.DIRECTORY, node.getType());
        assertTrue(Files.exists(tempProjectRoot.resolve("newDir")));
    }

    @Test
    @DisplayName("Should throw FileAlreadyExistsException when the target name already exists")
    void renameFile_TargetAlreadyExists_ThrowsFileAlreadyExistsException()
            throws IOException, ProjectNotFoundException {
        stubToAbsolutePath();

        Project project =
                new Project(TEST_PROJECT_NAME, tempProjectRoot.toAbsolutePath().toString());
        when(projectService.getProject(TEST_PROJECT_NAME)).thenReturn(project);

        Files.writeString(tempProjectRoot.resolve("old.xml"), "content");
        Files.writeString(tempProjectRoot.resolve("existing.xml"), "already here");

        String oldPath = tempProjectRoot.resolve("old.xml").toAbsolutePath().toString();
        assertThrows(
                FileAlreadyExistsException.class,
                () -> fileTreeService.renameFile(TEST_PROJECT_NAME, oldPath, "existing.xml"));
    }

    @Test
    @DisplayName("Should throw IllegalArgumentException for an invalid new name during rename")
    void renameFile_InvalidNewName_ThrowsIllegalArgument() {
        assertThrows(
                IllegalArgumentException.class,
                () -> fileTreeService.renameFile(TEST_PROJECT_NAME, "/some/old.xml", "bad/name.xml"));
    }

    @Test
    @DisplayName("Should use relative parent path when old path contains a slash in non-local environment")
    void renameFile_NonLocalEnvironment_PathWithSlash() throws IOException, ProjectNotFoundException {
        stubToAbsolutePath();
        when(fileSystemStorage.isLocalEnvironment()).thenReturn(false);
        when(fileSystemStorage.rename(anyString(), anyString())).thenReturn(null);

        Project project =
                new Project(TEST_PROJECT_NAME, tempProjectRoot.toAbsolutePath().toString());
        when(projectService.getProject(TEST_PROJECT_NAME)).thenReturn(project);

        Path subDir = Files.createDirectory(tempProjectRoot.resolve("subdir"));
        Files.writeString(subDir.resolve("old.xml"), "content");

        FileTreeNode node = fileTreeService.renameFile(TEST_PROJECT_NAME, "subdir/old.xml", "new.xml");

        assertEquals("new.xml", node.getName());
        assertEquals("subdir/new.xml", node.getPath());
        assertEquals(NodeType.FILE, node.getType());
    }

    @Test
    @DisplayName("Should use just the new name as path when old path has no slash in non-local environment")
    void renameFile_NonLocalEnvironment_PathWithoutSlash() throws IOException, ProjectNotFoundException {
        stubToAbsolutePath();
        when(fileSystemStorage.isLocalEnvironment()).thenReturn(false);
        when(fileSystemStorage.rename(anyString(), anyString())).thenReturn(null);

        Project project =
                new Project(TEST_PROJECT_NAME, tempProjectRoot.toAbsolutePath().toString());
        when(projectService.getProject(TEST_PROJECT_NAME)).thenReturn(project);

        Files.writeString(tempProjectRoot.resolve("old.xml"), "content");

        FileTreeNode node = fileTreeService.renameFile(TEST_PROJECT_NAME, "old.xml", "new.xml");

        assertEquals("new.xml", node.getName());
        assertEquals("new.xml", node.getPath());
    }

    @Test
    @DisplayName("Should delete a file without throwing and invalidate the tree cache")
    void deleteFile_Success() throws IOException, ProjectNotFoundException {
        stubToAbsolutePath();
        stubDelete();

        Project project =
                new Project(TEST_PROJECT_NAME, tempProjectRoot.toAbsolutePath().toString());
        when(projectService.getProject(TEST_PROJECT_NAME)).thenReturn(project);

        Path fileToDelete = Files.writeString(tempProjectRoot.resolve("toDelete.xml"), "content");
        String path = fileToDelete.toAbsolutePath().toString();

        assertDoesNotThrow(() -> fileTreeService.deleteFile(TEST_PROJECT_NAME, path));
        assertFalse(Files.exists(fileToDelete));
    }

    @Test
    @DisplayName("Should throw IllegalArgumentException when project is not found during deleteFile")
    void deleteFile_ProjectNotFound_ThrowsIllegalArgument() throws ProjectNotFoundException {
        when(projectService.getProject("Unknown")).thenThrow(new ProjectNotFoundException("err"));

        assertThrows(
                IllegalArgumentException.class, () -> fileTreeService.deleteFile("Unknown", "/some/path/file.xml"));
    }

    @Test
    @DisplayName("Should clear all cache entries so the tree is fully rebuilt on the next call")
    void invalidateTreeCache_AllEntries_ForcesRebuild() throws IOException, ProjectNotFoundException {
        stubToAbsolutePath();
        when(fileSystemStorage.isLocalEnvironment()).thenReturn(true);

        Project project =
                new Project(TEST_PROJECT_NAME, tempProjectRoot.toAbsolutePath().toString());
        when(projectService.getProject(TEST_PROJECT_NAME)).thenReturn(project);

        fileTreeService.getProjectTree(TEST_PROJECT_NAME);
        fileTreeService.invalidateTreeCache(); // clears all entries
        fileTreeService.getProjectTree(TEST_PROJECT_NAME);

        verify(projectService, times(2)).getProject(TEST_PROJECT_NAME);
    }

    @Test
    @DisplayName("Should clear only the named project's cache entry so a rebuild is triggered")
    void invalidateTreeCache_SpecificProject_ForcesRebuild() throws IOException, ProjectNotFoundException {
        stubToAbsolutePath();
        when(fileSystemStorage.isLocalEnvironment()).thenReturn(true);

        Project project =
                new Project(TEST_PROJECT_NAME, tempProjectRoot.toAbsolutePath().toString());
        when(projectService.getProject(TEST_PROJECT_NAME)).thenReturn(project);

        fileTreeService.getProjectTree(TEST_PROJECT_NAME);
        fileTreeService.invalidateTreeCache(TEST_PROJECT_NAME);
        fileTreeService.getProjectTree(TEST_PROJECT_NAME);

        verify(projectService, times(2)).getProject(TEST_PROJECT_NAME);
    }

    @Test
    @DisplayName("Should return the same cached instance on subsequent calls without rebuilding")
    void getProjectTree_ReturnsCachedResult() throws IOException, ProjectNotFoundException {
        stubToAbsolutePath();
        when(fileSystemStorage.isLocalEnvironment()).thenReturn(true);

        Project project =
                new Project(TEST_PROJECT_NAME, tempProjectRoot.toAbsolutePath().toString());
        when(projectService.getProject(TEST_PROJECT_NAME)).thenReturn(project);

        FileTreeNode first = fileTreeService.getProjectTree(TEST_PROJECT_NAME);
        FileTreeNode second = fileTreeService.getProjectTree(TEST_PROJECT_NAME);

        assertSame(first, second);
        verify(projectService, times(1)).getProject(TEST_PROJECT_NAME);
    }

    @Test
    @DisplayName("Should use relative paths for tree nodes when not in local environment")
    void getProjectTree_NonLocalEnvironment_UsesRelativePaths() throws IOException, ProjectNotFoundException {
        stubToAbsolutePath();
        when(fileSystemStorage.isLocalEnvironment()).thenReturn(false);

        Files.writeString(tempProjectRoot.resolve("test.xml"), "content");

        Project project =
                new Project(TEST_PROJECT_NAME, tempProjectRoot.toAbsolutePath().toString());
        when(projectService.getProject(TEST_PROJECT_NAME)).thenReturn(project);

        FileTreeNode tree = fileTreeService.getProjectTree(TEST_PROJECT_NAME);

        assertNotNull(tree);
        assertEquals(".", tree.getPath());
        assertTrue(tree.getChildren().stream().anyMatch(n -> n.getPath().equals("test.xml")));
    }

    @Test
    @DisplayName("Should throw IllegalArgumentException when the project directory does not exist on disk")
    void getProjectTree_ProjectDirectoryDoesNotExist_ThrowsIllegalArgument()
            throws IOException, ProjectNotFoundException {
        stubToAbsolutePath();

        Path nonExistentDir = tempProjectRoot.resolve("nonexistent");
        Project project =
                new Project(TEST_PROJECT_NAME, nonExistentDir.toAbsolutePath().toString());
        when(projectService.getProject(TEST_PROJECT_NAME)).thenReturn(project);

        IllegalArgumentException ex =
                assertThrows(IllegalArgumentException.class, () -> fileTreeService.getProjectTree(TEST_PROJECT_NAME));
        assertTrue(ex.getMessage().contains("Project directory does not exist"));
    }

    @Test
    @DisplayName("Should return absolute paths for all nodes in local environment")
    void getShallowDirectoryTree_LocalEnvironment_UsesAbsolutePaths() throws IOException, ProjectNotFoundException {
        stubToAbsolutePath();
        when(fileSystemStorage.isLocalEnvironment()).thenReturn(true);

        Files.writeString(tempProjectRoot.resolve("file.xml"), "<config/>");

        Project project =
                new Project(TEST_PROJECT_NAME, tempProjectRoot.toAbsolutePath().toString());
        when(projectService.getProject(TEST_PROJECT_NAME)).thenReturn(project);

        FileTreeNode node = fileTreeService.getShallowDirectoryTree(
                TEST_PROJECT_NAME, tempProjectRoot.toAbsolutePath().toString());

        assertNotNull(node);
        assertEquals(NodeType.DIRECTORY, node.getType());
        assertTrue(Paths.get(node.getPath()).isAbsolute(), "Root node path must be absolute");
        assertTrue(
                node.getChildren().stream().allMatch(c -> Paths.get(c.getPath()).isAbsolute()),
                "All child paths must be absolute");
    }

    @Test
    @DisplayName("Should throw IllegalArgumentException when trying to update a directory path")
    void updateFileContent_DirectoryPath_ThrowsIllegalArgument() throws IOException {
        stubToAbsolutePath();

        Path dir = Files.createDirectory(tempProjectRoot.resolve("aDirectory"));

        IllegalArgumentException ex = assertThrows(
                IllegalArgumentException.class,
                () -> fileTreeService.updateFileContent(
                        TEST_PROJECT_NAME, dir.toAbsolutePath().toString(), "new content"));
        assertTrue(ex.getMessage().contains("Cannot update a directory"));
    }

    private void stubCreateProjectDirectory() throws IOException {
        when(fileSystemStorage.createProjectDirectory(anyString())).thenAnswer(invocation -> {
            String path = invocation.getArgument(0);
            Path dir = Paths.get(path);
            Files.createDirectories(dir);
            return dir;
        });
    }

    private void stubCreateFile() throws IOException {
        when(fileSystemStorage.createFile(anyString())).thenAnswer(invocation -> {
            String path = invocation.getArgument(0);
            return FileOperations.createFile(Paths.get(path));
        });
    }

    private void stubDelete() throws IOException {
        doAnswer(invocation -> {
                    String path = invocation.getArgument(0);
                    FileOperations.deleteRecursively(Paths.get(path));
                    return null;
                })
                .when(fileSystemStorage)
                .delete(anyString());
    }

    private void stubRename() throws IOException {
        when(fileSystemStorage.rename(anyString(), anyString())).thenAnswer(invocation -> {
            String src = invocation.getArgument(0);
            String dst = invocation.getArgument(1);
            return FileOperations.rename(Paths.get(src), Paths.get(dst));
        });
    }
}
