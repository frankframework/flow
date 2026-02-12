package org.frankframework.flow.filesystem;

import java.io.File;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
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
        Path dir = Paths.get(path).toAbsolutePath().normalize();
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
        return Files.readString(Paths.get(path), StandardCharsets.UTF_8);
    }

    @Override
    public void writeFile(String path, String content) throws IOException {
        Files.writeString(Paths.get(path), content, StandardCharsets.UTF_8);
    }

    @Override
    public Path createProjectDirectory(String path) throws IOException {
        Path dir = Paths.get(path);
        Files.createDirectories(dir);
        return dir;
    }

    @Override
    public Path toAbsolutePath(String path) {
        return Paths.get(path).toAbsolutePath().normalize();
    }
}
