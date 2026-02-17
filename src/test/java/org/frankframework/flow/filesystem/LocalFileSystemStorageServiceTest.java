package org.frankframework.flow.filesystem;

import static org.junit.jupiter.api.Assertions.*;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

class LocalFileSystemStorageServiceTest {

    private LocalFileSystemStorageService service;

    @TempDir
    Path tempDir;

    @BeforeEach
    void setUp() {
        service = new LocalFileSystemStorageService();
    }

    @Test
    void isLocalEnvironmentReturnsTrue() {
        assertTrue(service.isLocalEnvironment());
    }

    @Test
    void listRootsReturnsNonEmptyList() {
        List<FilesystemEntry> roots = service.listRoots();
        assertNotNull(roots);
        assertFalse(roots.isEmpty());
        roots.forEach(r -> assertEquals("DIRECTORY", r.type()));
    }

    @Test
    void listDirectoryReturnsSubdirectories() throws IOException {
        Path subDir = Files.createDirectory(tempDir.resolve("subdir"));
        Files.createDirectories(subDir.resolve("src/main/configurations"));
        Files.createDirectory(tempDir.resolve("other"));
        Files.writeString(tempDir.resolve("file.txt"), "data");

        List<FilesystemEntry> entries = service.listDirectory(tempDir.toString());

        assertEquals(2, entries.size());
        assertTrue(entries.stream().anyMatch(e -> e.name().equals("subdir") && e.projectRoot()));
        assertTrue(entries.stream().anyMatch(e -> e.name().equals("other") && !e.projectRoot()));
    }

    @Test
    void listDirectoryExcludesFiles() throws IOException {
        Files.writeString(tempDir.resolve("file.txt"), "data");

        List<FilesystemEntry> entries = service.listDirectory(tempDir.toString());

        assertTrue(entries.isEmpty());
    }

    @Test
    void writeAndReadFile() throws IOException {
        Path file = tempDir.resolve("test.txt");
        service.writeFile(file.toString(), "hello");

        String content = service.readFile(file.toString());
        assertEquals("hello", content);
    }

    @Test
    void readFileThrowsForMissingFile() {
        String missingPath = tempDir.resolve("nonexistent.txt").toString();
        assertThrows(IOException.class, () -> service.readFile(missingPath));
    }

    @Test
    void createProjectDirectoryCreatesDirectory() throws IOException {
        Path projectDir = tempDir.resolve("new-project");
        Path result = service.createProjectDirectory(projectDir.toString());

        assertTrue(Files.exists(result));
        assertTrue(Files.isDirectory(result));
        assertEquals(
                projectDir.toAbsolutePath().normalize(), result.toAbsolutePath().normalize());
    }

    @Test
    void toAbsolutePathNormalizesCleanPath() {
        Path result = service.toAbsolutePath(tempDir.resolve("b").toString());
        assertFalse(result.toString().contains(".."));
        assertTrue(result.isAbsolute());
    }

    @Test
    void sanitizePathRejectsPathTraversal() {
        assertThrows(SecurityException.class, () -> service.listDirectory("../../../etc"));
    }

    @Test
    void sanitizePathRejectsEmptyPath() {
        assertThrows(SecurityException.class, () -> service.readFile(""));
    }

    @Test
    void sanitizePathRejectsBlankPath() {
        assertThrows(SecurityException.class, () -> service.readFile("   "));
    }

    @Test
    void writeFileRejectsPathTraversal() {
        assertThrows(SecurityException.class, () -> service.writeFile("../../evil.txt", "bad"));
    }

    @Test
    void createProjectDirectoryRejectsPathTraversal() {
        assertThrows(SecurityException.class, () -> service.createProjectDirectory("../../escape"));
    }

    @Test
    void toAbsolutePathRejectsPathTraversal() {
        assertThrows(SecurityException.class, () -> service.toAbsolutePath("../../etc/passwd"));
    }

    @Test
    void writeFileOverwritesExistingContent() throws IOException {
        Path file = tempDir.resolve("overwrite.txt");
        service.writeFile(file.toString(), "first");
        service.writeFile(file.toString(), "second");

        assertEquals("second", service.readFile(file.toString()));
    }

    @Test
    void createProjectDirectoryIsIdempotent() throws IOException {
        Path projectDir = tempDir.resolve("idempotent-project");
        service.createProjectDirectory(projectDir.toString());
        Path result = service.createProjectDirectory(projectDir.toString());

        assertTrue(Files.exists(result));
    }
}
