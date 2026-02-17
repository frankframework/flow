package org.frankframework.flow.filesystem;

import java.io.File;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.InvalidPathException;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Stream;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;

@Service
@Profile("local")
public class LocalFileSystemStorageService implements FileSystemStorage {
    @Override
    public boolean isLocalEnvironment() {
        return true;
    }

    @Override
    public List<FilesystemEntry> listRoots() {
        List<FilesystemEntry> entries = new ArrayList<>();
        for (File root : File.listRoots()) {
            String absolutePath = root.getAbsolutePath();
            entries.add(new FilesystemEntry(absolutePath, absolutePath, "DIRECTORY", false));
        }
        return entries;
    }

    @Override
    public List<FilesystemEntry> listDirectory(String path) throws IOException {
        Path dir = sanitizePath(path);
        List<FilesystemEntry> entries = new ArrayList<>();

        try (Stream<Path> stream = Files.list(dir)) {
            stream.filter(Files::isDirectory).sorted().forEach(p -> {
                boolean isProjectRoot = Files.isDirectory(p.resolve("src/main/configurations"));
                entries.add(new FilesystemEntry(
                        p.getFileName().toString(), p.toAbsolutePath().toString(), "DIRECTORY", isProjectRoot));
            });
        }
        return entries;
    }

    @Override
    public String readFile(String path) throws IOException {
        return Files.readString(sanitizePath(path), StandardCharsets.UTF_8);
    }

    @Override
    public void writeFile(String path, String content) throws IOException {
        Files.writeString(sanitizePath(path), content, StandardCharsets.UTF_8);
    }

    @Override
    public Path createProjectDirectory(String path) throws IOException {
        Path dir = sanitizePath(path);
        Files.createDirectories(dir);
        return dir;
    }

    @Override
    public Path toAbsolutePath(String path) {
        return sanitizePath(path);
    }

    private static Path sanitizePath(String path) {
        if (path == null || path.isBlank()) {
            throw new SecurityException("Path must not be empty");
        }

        try {
            Path normalized = Paths.get(path).toAbsolutePath().normalize();

            if (path.contains("..")) {
                throw new SecurityException("Path traversal is not allowed: " + path);
            }

            return normalized;
        } catch (InvalidPathException e) {
            throw new SecurityException("Invalid path: " + path, e);
        }
    }
}
