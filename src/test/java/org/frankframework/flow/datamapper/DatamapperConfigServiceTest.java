package org.frankframework.flow.datamapper;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.when;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Comparator;
import org.frankframework.flow.configuration.ConfigurationNotFoundException;
import org.frankframework.flow.filesystem.FileSystemStorage;
import org.frankframework.flow.filetree.FileTreeNode;
import org.frankframework.flow.filetree.FileTreeService;
import org.frankframework.flow.project.ProjectNotFoundException;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

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

    private void stubGetConfigurationsDirectoryTree() throws IOException {
        when(fileTreeService.getConfigurationsDirectoryTree(anyString())).thenAnswer(invocation -> {
            FileTreeNode fileTreeNode = new FileTreeNode();
            fileTreeNode.setPath(tempProjectRoot.toString());
            return fileTreeNode;
        });
    }

    @Test
    @DisplayName("Should correctly read content from an existing file")
    public void readFileContent_Success() throws IOException, ConfigurationNotFoundException {
        stubReadFile();
        stubGetConfigurationsDirectoryTree();

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
    @DisplayName("Should throw NoSuchFileException when file does not exist")
    public void readFileContent_FileNotFound() throws IOException {
        stubReadFile();
        stubGetConfigurationsDirectoryTree();

        assertThrows(ConfigurationNotFoundException.class, () -> datamapperConfigService.getConfig(TEST_PROJECT_NAME));
    }

    @Test
    @DisplayName("Should successfully overwrite a file with new content")
    public void updateConfigContent_Success()
            throws IOException, ProjectNotFoundException, ConfigurationNotFoundException {
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
    public void updateFileNewConfigContent_Success()
            throws IOException, ProjectNotFoundException, ConfigurationNotFoundException {
        stubToAbsolutePath();
        stubWriteFile();
        stubGetConfigurationsDirectoryTree();

        Path datamapperDir = tempProjectRoot.resolve("datamapper");
        if (!Files.isDirectory(datamapperDir)) {
            Files.createDirectories(datamapperDir);
        }
        Path file = datamapperDir.resolve("configuration.json");

        //        Files.createDirectory(tempProjectRoot.resolve("datamapper"));

        String newContent = "new content";
        datamapperConfigService.updateFileContent(TEST_PROJECT_NAME, newContent);

        assertEquals(newContent, Files.readString(file));
    }
}
