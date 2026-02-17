package org.frankframework.flow.filesystem;

import static org.junit.jupiter.api.Assertions.*;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Comparator;
import java.util.List;
import org.frankframework.flow.security.UserWorkspaceContext;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

class CloudFileSystemStorageServiceTest {

    private CloudFileSystemStorageService service;
    private UserWorkspaceContext userContext;
    private Path tempWorkspaceRoot;

    @BeforeEach
    void setUp() throws IOException {
        tempWorkspaceRoot = Files.createTempDirectory("cloud_test_workspace");
        userContext = new UserWorkspaceContext();
        userContext.initialize("test-user");

        service = new CloudFileSystemStorageService(userContext);
        ReflectionTestUtils.setField(service, "baseWorkspacePath", tempWorkspaceRoot.toString());
    }

    @AfterEach
    void tearDown() throws IOException {
        if (tempWorkspaceRoot != null && Files.exists(tempWorkspaceRoot)) {
            try (var stream = Files.walk(tempWorkspaceRoot)) {
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
    void isLocalEnvironmentReturnsFalse() {
        assertFalse(service.isLocalEnvironment());
    }

    @Test
    void toAbsolutePathResolvesRelativeToUserRoot() throws IOException {
        Path result = service.toAbsolutePath("my-project");
        Path expectedUserRoot =
                tempWorkspaceRoot.resolve("test-user").toAbsolutePath().normalize();
        assertEquals(expectedUserRoot.resolve("my-project"), result);
    }

    @Test
    void toAbsolutePathReturnsUserRootForEmptyPath() throws IOException {
        Path result = service.toAbsolutePath("");
        Path expectedUserRoot =
                tempWorkspaceRoot.resolve("test-user").toAbsolutePath().normalize();
        assertEquals(expectedUserRoot, result);
    }

    @Test
    void toAbsolutePathReturnsUserRootForSlash() throws IOException {
        Path result = service.toAbsolutePath("/");
        Path expectedUserRoot =
                tempWorkspaceRoot.resolve("test-user").toAbsolutePath().normalize();
        assertEquals(expectedUserRoot, result);
    }

    @Test
    void toAbsolutePathRejectsPathTraversal() {
        assertThrows(SecurityException.class, () -> service.toAbsolutePath("../other-user/secret"));
    }

    @Test
    void writeAndReadFile() throws IOException {
        String content = "hello world";
        service.writeFile("test.txt", content);

        String result = service.readFile("test.txt");
        assertEquals(content, result);
    }

    @Test
    void createProjectDirectoryCreatesDir() throws IOException {
        Path projectDir = service.createProjectDirectory("new-project");

        assertTrue(Files.exists(projectDir));
        assertTrue(Files.isDirectory(projectDir));
    }

    @Test
    void listDirectoryReturnsSubdirectories() throws IOException {
        Path userRoot = tempWorkspaceRoot.resolve("test-user");
        Files.createDirectories(userRoot.resolve("projectA/src/main/configurations"));
        Files.createDirectories(userRoot.resolve("projectB"));

        List<FilesystemEntry> entries = service.listDirectory("");

        assertEquals(2, entries.size());
        assertTrue(entries.stream().anyMatch(e -> e.name().equals("projectA") && e.projectRoot()));
        assertTrue(entries.stream().anyMatch(e -> e.name().equals("projectB") && !e.projectRoot()));
    }

    @Test
    void listRootsReturnsWorkspaceContents() throws IOException {
        Path userRoot = tempWorkspaceRoot.resolve("test-user");
        Files.createDirectories(userRoot.resolve("projectA"));

        List<FilesystemEntry> entries = service.listRoots();

        assertFalse(entries.isEmpty());
        assertTrue(entries.stream().anyMatch(e -> e.name().equals("projectA")));
    }

    @Test
    void listRootsReturnsEmptyListOnError() {
        ReflectionTestUtils.setField(service, "baseWorkspacePath", "/nonexistent/path/that/doesnt/exist");
        userContext.initialize("no-such-user-xyz");

        List<FilesystemEntry> entries = service.listRoots();
        assertNotNull(entries);
    }

    @Test
    void readFileRejectsPathTraversal() {
        assertThrows(SecurityException.class, () -> service.readFile("../../etc/passwd"));
    }

    @Test
    void writeFileRejectsPathTraversal() {
        assertThrows(SecurityException.class, () -> service.writeFile("../../etc/evil", "data"));
    }

    @Test
    void toRelativePathStripsUserRoot() throws IOException {
        Path userRoot = tempWorkspaceRoot.resolve("test-user").toAbsolutePath().normalize();
        String absolutePath = userRoot.resolve("project/file.xml").toString();

        String relative = service.toRelativePath(absolutePath);

        assertTrue(relative.startsWith("/"));
        assertTrue(relative.contains("project"));
        assertTrue(relative.contains("file.xml"));
    }

    @Test
    void toRelativePathReturnsSlashForUserRoot() throws IOException {
        Path userRoot = tempWorkspaceRoot.resolve("test-user").toAbsolutePath().normalize();

        String relative = service.toRelativePath(userRoot.toString());

        assertEquals("/", relative);
    }

    @Test
    void toRelativePathReturnsInputIfNotUnderUserRoot() throws IOException {
        String result = service.toRelativePath("/some/other/path");
        assertEquals("/some/other/path", result);
    }

    @Test
    void anonymousUserWhenWorkspaceIdIsNull() throws IOException {
        UserWorkspaceContext anonCtx = new UserWorkspaceContext();
        CloudFileSystemStorageService anonService = new CloudFileSystemStorageService(anonCtx);
        ReflectionTestUtils.setField(anonService, "baseWorkspacePath", tempWorkspaceRoot.toString());

        Path result = anonService.toAbsolutePath("test");
        assertTrue(result.toString().contains("anonymous"));
    }

    @Test
    void createProjectDirectoryRejectsPathTraversal() {
        assertThrows(SecurityException.class, () -> service.createProjectDirectory("../../escape"));
    }

    @Test
    void writeFileCreatesContent() throws IOException {
        service.writeFile("data.txt", "content");

        Path userRoot = tempWorkspaceRoot.resolve("test-user").toAbsolutePath().normalize();
        String onDisk = Files.readString(userRoot.resolve("data.txt"), StandardCharsets.UTF_8);
        assertEquals("content", onDisk);
    }
}
