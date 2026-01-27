package org.frankframework.flow.filetree;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

import java.io.IOException;
import java.nio.file.*;
import java.util.List;
import org.frankframework.flow.configuration.AdapterNotFoundException;
import org.frankframework.flow.configuration.ConfigurationNotFoundException;
import org.frankframework.flow.project.ProjectService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class FileTreeServiceTest {

    @Mock
    private ProjectService projectService;

    private FileTreeService fileTreeService;
    private Path tempRoot;

    @BeforeEach
    void setUp() throws IOException {
        tempRoot = Files.createTempDirectory("testProjectRoot");

        when(projectService.getProjectsRoot()).thenReturn(tempRoot);

        fileTreeService = new FileTreeService(projectService);

        Files.createDirectory(tempRoot.resolve("ProjectA"));
        Files.createDirectory(tempRoot.resolve("ProjectB"));
        Files.writeString(tempRoot.resolve("ProjectA/config1.xml"), "<config>original</config>");
    }

    @AfterEach
    void tearDown() throws IOException {
        if (tempRoot != null && Files.exists(tempRoot)) {
            Files.walk(tempRoot).sorted((a, b) -> b.compareTo(a)).forEach(path -> {
                try {
                    Files.deleteIfExists(path);
                } catch (IOException e) {
                    // ignore
                }
            });
        }
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
        Path nonExistentPath = Paths.get("some/nonexistent/path");
        when(projectService.getProjectsRoot()).thenReturn(nonExistentPath);

        FileTreeService service = new FileTreeService(projectService);

        IllegalStateException exception = assertThrows(IllegalStateException.class, service::listProjectFolders);

        assertTrue(exception.getMessage().contains("Projects root does not exist or is not a directory"));
    }

    @Test
    void listProjectFoldersThrowsIfRootIsAFile() throws IOException {
        Path tempFile = Files.createTempFile("not-a-directory", ".txt");

        when(projectService.getProjectsRoot()).thenReturn(tempFile);

        FileTreeService service = new FileTreeService(projectService);

        IllegalStateException exception = assertThrows(IllegalStateException.class, service::listProjectFolders);

        assertTrue(exception.getMessage().contains("Projects root does not exist or is not a directory"));

        Files.deleteIfExists(tempFile);
    }

    @Test
    void readFileContentReturnsContentWhenFileExists() throws IOException {
        Path file = Files.createTempFile(tempRoot, "config", ".xml");
        String expectedContent = "<xml>hello</xml>";
        Files.writeString(file, expectedContent);

        String content = fileTreeService.readFileContent(file.toString());
        assertEquals(expectedContent, content);

        Files.deleteIfExists(file);
    }

    @Test
    void readFileContentThrowsIfFileOutsideProjectRoot() throws IOException {
        Path outsideFile = Files.createTempFile("outside", ".txt");

        IllegalArgumentException exception = assertThrows(
                IllegalArgumentException.class, () -> fileTreeService.readFileContent(outsideFile.toString()));
        assertTrue(exception.getMessage().contains("File is outside of projects root"));

        Files.deleteIfExists(outsideFile);
    }

    @Test
    void readFileContentThrowsIfFileDoesNotExist() {
        Path missingFile = tempRoot.resolve("missing.xml");

        assertThrows(NoSuchFileException.class, () -> fileTreeService.readFileContent(missingFile.toString()));
    }

    @Test
    void readFileContentThrowsIfPathIsDirectory() throws IOException {
        Path dir = Files.createTempDirectory(tempRoot, "subdir");

        IllegalArgumentException exception =
                assertThrows(IllegalArgumentException.class, () -> fileTreeService.readFileContent(dir.toString()));
        assertTrue(exception.getMessage().contains("Requested path is a directory"));

        Files.deleteIfExists(dir);
    }

    @Test
    void updateFileContentWritesNewContent() throws IOException {
        Path file = Files.createTempFile(tempRoot, "config", ".xml");

        String initialContent = "<xml>old</xml>";
        Files.writeString(file, initialContent);

        String newContent = "<xml>updated</xml>";
        fileTreeService.updateFileContent(file.toString(), newContent);

        String readBack = Files.readString(file);
        assertEquals(newContent, readBack);

        Files.deleteIfExists(file);
    }

    @Test
    void updateFileContentThrowsIfFileOutsideProjectRoot() throws IOException {
        Path outsideFile = Files.createTempFile("outside", ".txt");

        IllegalArgumentException exception = assertThrows(
                IllegalArgumentException.class,
                () -> fileTreeService.updateFileContent(outsideFile.toString(), "content"));
        assertTrue(exception.getMessage().contains("File is outside of projects root"));

        Files.deleteIfExists(outsideFile);
    }

    @Test
    void updateFileContentThrowsIfFileDoesNotExist() {
        Path missingFile = tempRoot.resolve("missing.xml");

        IllegalArgumentException exception = assertThrows(
                IllegalArgumentException.class,
                () -> fileTreeService.updateFileContent(missingFile.toString(), "content"));
        assertTrue(exception.getMessage().contains("File does not exist"));
    }

    @Test
    void updateFileContentThrowsIfPathIsDirectory() throws IOException {
        Path dir = Files.createTempDirectory(tempRoot, "subdir");

        IllegalArgumentException exception = assertThrows(
                IllegalArgumentException.class, () -> fileTreeService.updateFileContent(dir.toString(), "content"));
        assertTrue(exception.getMessage().contains("Cannot update a directory"));

        Files.deleteIfExists(dir);
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
    void updateAdapterFromFileThrowsIfAdapterNotFound() {
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
        assertEquals(tempRoot.toAbsolutePath(), root.toAbsolutePath());
    }

    @Test
    void getProjectsRootThrowsIfRootDoesNotExist() {
        // Mock ProjectService to return a non-existent path
        Path nonExistentPath = Paths.get("some/nonexistent/path");
        when(projectService.getProjectsRoot()).thenReturn(nonExistentPath);

        FileTreeService service = new FileTreeService(projectService);

        IllegalStateException exception = assertThrows(IllegalStateException.class, service::getProjectsRoot);

        assertTrue(exception.getMessage().contains("Projects root does not exist or is not a directory"));
    }

    @Test
    void getProjectsRootThrowsIfRootIsAFile() throws IOException {
        // Create a temporary file (not a directory)
        Path tempFile = Files.createTempFile("not-a-directory", ".txt");

        when(projectService.getProjectsRoot()).thenReturn(tempFile);

        FileTreeService service = new FileTreeService(projectService);

        IllegalStateException exception = assertThrows(IllegalStateException.class, service::getProjectsRoot);

        assertTrue(exception.getMessage().contains("Projects root does not exist or is not a directory"));

        Files.deleteIfExists(tempFile);
    }
}
