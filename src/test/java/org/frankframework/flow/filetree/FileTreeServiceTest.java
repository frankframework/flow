package org.frankframework.flow.filetree;

import static org.junit.jupiter.api.Assertions.*;

import java.io.IOException;
import java.nio.file.*;
import java.util.List;
import org.frankframework.flow.configuration.AdapterNotFoundException;
import org.frankframework.flow.configuration.ConfigurationNotFoundException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class FileTreeServiceTest {

    private Path tempRoot;
    private FileTreeService fileTreeService;

    @BeforeEach
    void setUp() throws IOException {
        // Create a temporary directory for testing
        tempRoot = Files.createTempDirectory("flow-projects-test");
        fileTreeService = new FileTreeService(tempRoot.toString());

        // Create some sample project folders and files
        Files.createDirectory(tempRoot.resolve("ProjectA"));
        Files.createDirectory(tempRoot.resolve("ProjectB"));
        Files.writeString(tempRoot.resolve("ProjectA/config1.xml"), "<config>original</config>");
    }

    @Test
    void listProjectFoldersReturnsAllFolders() throws IOException {
        List<String> folders = fileTreeService.listProjectFolders();

        assertEquals(2, folders.size());
        assertTrue(folders.contains("ProjectA"));
        assertTrue(folders.contains("ProjectB"));
    }

    @Test
    void listProjectFoldersThrowsIfRootDoesNotExist() {
        // Provide a path that does not exist
        String nonExistentPath = "some/nonexistent/path";
        FileTreeService fileTreeService = new FileTreeService(nonExistentPath);

        IllegalStateException exception =
                assertThrows(IllegalStateException.class, fileTreeService::listProjectFolders);

        assert exception.getMessage().contains("Projects root does not exist or is not a directory");
    }

    @Test
    void listProjectFoldersThrowsIfRootIsAFile() throws IOException {
        // Create a temporary file (not a directory)
        Path tempFile = Files.createTempFile("not-a-directory", ".txt");
        FileTreeService fileTreeService = new FileTreeService(tempFile.toString());

        IllegalStateException exception =
                assertThrows(IllegalStateException.class, fileTreeService::listProjectFolders);

        assert exception.getMessage().contains("Projects root does not exist or is not a directory");

        Files.deleteIfExists(tempFile);
    }

    @Test
    void readFileContentReturnsContentWhenFileExists() throws IOException {
        // Setup a temporary project root and file
        Path projectRoot = Files.createTempDirectory("projectRoot");
        Path file = Files.createTempFile(projectRoot, "config", ".xml");
        String expectedContent = "<xml>hello</xml>";
        Files.writeString(file, expectedContent);

        FileTreeService fileTreeService = new FileTreeService(projectRoot.toString());

        String content = fileTreeService.readFileContent(file.toString());
        assertEquals(expectedContent, content);

        Files.deleteIfExists(file);
        Files.deleteIfExists(projectRoot);
    }

    @Test
    void readFileContentThrowsIfFileOutsideProjectRoot() throws IOException {
        Path projectRoot = Files.createTempDirectory("projectRoot");
        Path outsideFile = Files.createTempFile("outside", ".txt");

        FileTreeService fileTreeService = new FileTreeService(projectRoot.toString());

        IllegalArgumentException exception = assertThrows(
                IllegalArgumentException.class, () -> fileTreeService.readFileContent(outsideFile.toString()));
        assertTrue(exception.getMessage().contains("File is outside of projects root"));

        Files.deleteIfExists(outsideFile);
        Files.deleteIfExists(projectRoot);
    }

    @Test
    void readFileContentThrowsIfFileDoesNotExist() throws IOException {
        Path projectRoot = Files.createTempDirectory("projectRoot");
        Path missingFile = projectRoot.resolve("missing.xml");

        FileTreeService fileTreeService = new FileTreeService(projectRoot.toString());

        assertThrows(NoSuchFileException.class, () -> fileTreeService.readFileContent(missingFile.toString()));

        Files.deleteIfExists(projectRoot);
    }

    @Test
    void readFileContentThrowsIfPathIsDirectory() throws IOException {
        Path projectRoot = Files.createTempDirectory("projectRoot");
        Path dir = Files.createTempDirectory(projectRoot, "subdir");

        FileTreeService fileTreeService = new FileTreeService(projectRoot.toString());

        IllegalArgumentException exception =
                assertThrows(IllegalArgumentException.class, () -> fileTreeService.readFileContent(dir.toString()));
        assertTrue(exception.getMessage().contains("Requested path is a directory"));

        Files.deleteIfExists(dir);
        Files.deleteIfExists(projectRoot);
    }

    @Test
    void updateFileContentWritesNewContent() throws IOException {
        Path projectRoot = Files.createTempDirectory("projectRoot");
        Path file = Files.createTempFile(projectRoot, "config", ".xml");

        String initialContent = "<xml>old</xml>";
        Files.writeString(file, initialContent);

        FileTreeService fileTreeService = new FileTreeService(projectRoot.toString());

        String newContent = "<xml>updated</xml>";
        fileTreeService.updateFileContent(file.toString(), newContent);

        String readBack = Files.readString(file);
        assertEquals(newContent, readBack);

        Files.deleteIfExists(file);
        Files.deleteIfExists(projectRoot);
    }

    @Test
    void updateFileContentThrowsIfFileOutsideProjectRoot() throws IOException {
        Path projectRoot = Files.createTempDirectory("projectRoot");
        Path outsideFile = Files.createTempFile("outside", ".txt");

        FileTreeService fileTreeService = new FileTreeService(projectRoot.toString());

        IllegalArgumentException exception = assertThrows(
                IllegalArgumentException.class,
                () -> fileTreeService.updateFileContent(outsideFile.toString(), "content"));
        assertTrue(exception.getMessage().contains("File is outside of projects root"));

        Files.deleteIfExists(outsideFile);
        Files.deleteIfExists(projectRoot);
    }

    @Test
    void updateFileContentThrowsIfFileDoesNotExist() throws IOException {
        Path projectRoot = Files.createTempDirectory("projectRoot");
        Path missingFile = projectRoot.resolve("missing.xml");

        FileTreeService fileTreeService = new FileTreeService(projectRoot.toString());

        IllegalArgumentException exception = assertThrows(
                IllegalArgumentException.class,
                () -> fileTreeService.updateFileContent(missingFile.toString(), "content"));
        assertTrue(exception.getMessage().contains("File does not exist"));

        Files.deleteIfExists(projectRoot);
    }

    @Test
    void updateFileContentThrowsIfPathIsDirectory() throws IOException {
        Path projectRoot = Files.createTempDirectory("projectRoot");
        Path dir = Files.createTempDirectory(projectRoot, "subdir");

        FileTreeService fileTreeService = new FileTreeService(projectRoot.toString());

        IllegalArgumentException exception = assertThrows(
                IllegalArgumentException.class, () -> fileTreeService.updateFileContent(dir.toString(), "content"));
        assertTrue(exception.getMessage().contains("Cannot update a directory"));

        Files.deleteIfExists(dir);
        Files.deleteIfExists(projectRoot);
    }

    @Test
    void getProjectTreeBuildsTreeCorrectly() throws IOException {
        FileTreeNode tree = fileTreeService.getProjectTree("ProjectA");

        assertEquals("ProjectA", tree.getName());
        assertEquals(1, tree.getChildren().size());
        assertEquals("config1.xml", tree.getChildren().get(0).getName());
    }

    @Test
    void updateAdapterFromFileReturnsFalseIfInvalidXml()
            throws IOException, AdapterNotFoundException, ConfigurationNotFoundException {
        Path filePath = tempRoot.resolve("ProjectA/config1.xml");

        // Provide malformed XML
        boolean result = fileTreeService.updateAdapterFromFile("ProjectA", filePath, "MyAdapter", "<adapter");

        assertFalse(result, "Malformed XML should return false");
    }

    @Test
    void updateAdapterFromFileThrowsIfAdapterNotFound() throws IOException {
        Path filePath = tempRoot.resolve("ProjectA/config1.xml");

        AdapterNotFoundException thrown = assertThrows(
                AdapterNotFoundException.class,
                () -> fileTreeService.updateAdapterFromFile(
                        "ProjectA", filePath, "NonExistentAdapter", "<adapter></adapter>"));

        assertTrue(thrown.getMessage().contains("Adapter not found"));
    }

    @Test
    void getProjectsRootReturnsCorrectPath() {
        Path root = fileTreeService.getProjectsRoot();
        assertEquals(tempRoot.toAbsolutePath(), root);
    }

    @Test
    void getProjectsRootThrowsIfRootDoesNotExist() {
        // Provide a path that does not exist
        String nonExistentPath = "some/nonexistent/path";
        FileTreeService fileTreeService = new FileTreeService(nonExistentPath);

        IllegalStateException exception = assertThrows(IllegalStateException.class, fileTreeService::getProjectsRoot);

        assert exception.getMessage().contains("Projects root does not exist or is not a directory");
    }

    @Test
    void getProjectsRootThrowsIfRootIsAFile() throws IOException {
        // Create a temporary file (not a directory)
        Path tempFile = Files.createTempFile("not-a-directory", ".txt");
        FileTreeService fileTreeService = new FileTreeService(tempFile.toString());

        IllegalStateException exception = assertThrows(IllegalStateException.class, fileTreeService::getProjectsRoot);

        assert exception.getMessage().contains("Projects root does not exist or is not a directory");

        // Cleanup
        Files.deleteIfExists(tempFile);
    }

    @Test
    public void getShallowDirectoryTreeReturnsTreeForValidDirectory() throws IOException {

        // Add one more file in ProjectA to test multiple children
        Path additionalFile = tempRoot.resolve("ProjectA/readme.txt");
        Files.writeString(additionalFile, "hello");

        FileTreeNode node = fileTreeService.getShallowDirectoryTree("ProjectA", ".");

        assertNotNull(node);
        assertEquals("ProjectA", node.getName());
        assertEquals(NodeType.DIRECTORY, node.getType());
        assertNotNull(node.getChildren());

        // We expect two children now: config1.xml and readme.txt
        assertEquals(2, node.getChildren().size());

        // Verify children names
        assertTrue(node.getChildren().stream().anyMatch(c -> c.getName().equals("config1.xml")));
        assertTrue(node.getChildren().stream().anyMatch(c -> c.getName().equals("readme.txt")));
    }

    @Test
    void getShallowDirectoryTreeThrowsSecurityExceptionForPathTraversal() {
        SecurityException ex = assertThrows(
                SecurityException.class, () -> fileTreeService.getShallowDirectoryTree("ProjectA", "../ProjectB"));

        assertTrue(ex.getMessage().contains("Invalid path"));
    }

    @Test
    void getShallowDirectoryTreeThrowsIllegalArgumentExceptionIfDirectoryDoesNotExist() {
        IllegalArgumentException ex = assertThrows(
                IllegalArgumentException.class,
                () -> fileTreeService.getShallowDirectoryTree("ProjectA", "nonexistent"));

        assertTrue(ex.getMessage().contains("Directory does not exist"));
    }

    @Test
    public void getShallowConfigurationsDirectoryTreeReturnsTreeForExistingDirectory() throws IOException {
        // Move the existing config1.xml into the expected configurations folder
        Path configsDir = tempRoot.resolve("ProjectA/src/main/configurations");
        Files.createDirectories(configsDir);
        Files.move(
                tempRoot.resolve("ProjectA/config1.xml"),
                configsDir.resolve("config1.xml"),
                StandardCopyOption.REPLACE_EXISTING);

        Files.writeString(configsDir.resolve("readme.txt"), "hello");

        FileTreeNode node = fileTreeService.getShallowConfigurationsDirectoryTree("ProjectA");

        assertNotNull(node);
        assertEquals("configurations", node.getName().toLowerCase());
        assertEquals(NodeType.DIRECTORY, node.getType());
        assertNotNull(node.getChildren());
        assertEquals(2, node.getChildren().size());

        assertTrue(node.getChildren().stream().anyMatch(c -> c.getName().equals("config1.xml")));
        assertTrue(node.getChildren().stream().anyMatch(c -> c.getName().equals("readme.txt")));
    }

    @Test
    public void getShallowConfigurationsDirectoryTreeThrowsIfDirectoryDoesNotExist() {
        // No src/main/configurations created for ProjectB
        IllegalArgumentException ex = assertThrows(
                IllegalArgumentException.class,
                () -> fileTreeService.getShallowConfigurationsDirectoryTree("ProjectB"));

        assertTrue(ex.getMessage().contains("Configurations directory does not exist"));
    }

    @Test
    public void getShallowConfigurationsDirectoryTreeThrowsIfProjectDoesNotExist() {
        // Project does not exist
        IllegalArgumentException ex = assertThrows(
                IllegalArgumentException.class,
                () -> fileTreeService.getShallowConfigurationsDirectoryTree("NonExistentProject"));

        assertTrue(ex.getMessage().contains("Configurations directory does not exist"));
    }

    @Test
    public void getConfigurationsDirectoryTreeReturnsFullTreeForExistingDirectory() throws IOException {
        // Reuse the existing setup: create the configurations folder
        Path configsDir = tempRoot.resolve("ProjectA/src/main/configurations");
        Files.createDirectories(configsDir);

        // Move existing config1.xml into this folder
        Files.move(
                tempRoot.resolve("ProjectA/config1.xml"),
                configsDir.resolve("config1.xml"),
                StandardCopyOption.REPLACE_EXISTING);

        // Add an extra file and subdirectory to test recursion
        Files.writeString(configsDir.resolve("readme.txt"), "hello");
        Path subDir = configsDir.resolve("subconfigs");
        Files.createDirectory(subDir);
        Files.writeString(subDir.resolve("nested.xml"), "<nested></nested>");

        FileTreeNode node = fileTreeService.getConfigurationsDirectoryTree("ProjectA");

        assertNotNull(node);
        assertEquals("configurations", node.getName().toLowerCase());
        assertEquals(NodeType.DIRECTORY, node.getType());
        assertNotNull(node.getChildren());
        assertEquals(3, node.getChildren().size()); // config1.xml, readme.txt, subconfigs

        // Check for files
        assertTrue(node.getChildren().stream().anyMatch(c -> c.getName().equals("config1.xml")));
        assertTrue(node.getChildren().stream().anyMatch(c -> c.getName().equals("readme.txt")));

        // Check for subdirectory
        FileTreeNode subConfigNode = node.getChildren().stream()
                .filter(c -> c.getName().equals("subconfigs"))
                .findFirst()
                .orElseThrow();
        assertEquals(NodeType.DIRECTORY, subConfigNode.getType());
        assertEquals(1, subConfigNode.getChildren().size());
        assertEquals("nested.xml", subConfigNode.getChildren().get(0).getName());
    }

    @Test
    public void getConfigurationsDirectoryTreeThrowsIfDirectoryDoesNotExist() {
        // The "src/main/configurations" folder does NOT exist yet
        IllegalArgumentException ex = assertThrows(
                IllegalArgumentException.class, () -> fileTreeService.getConfigurationsDirectoryTree("ProjectA"));

        assertTrue(ex.getMessage().contains("Configurations directory does not exist"));
    }

    @Test
    public void getConfigurationsDirectoryTreeThrowsIfProjectDoesNotExist() {
        // Project folder itself does not exist
        IllegalArgumentException ex = assertThrows(
                IllegalArgumentException.class,
                () -> fileTreeService.getConfigurationsDirectoryTree("NonExistingProject"));

        assertTrue(ex.getMessage().contains("Configurations directory does not exist"));
    }
}
