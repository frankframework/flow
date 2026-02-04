package org.frankframework.flow.filesystem;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Stream;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

@Slf4j
@Service
public class FilesystemService {

    public List<FilesystemEntry> listRoots() {
        List<FilesystemEntry> entries = new ArrayList<>();
        for (File root : File.listRoots()) {
            String absolutePath = root.getAbsolutePath();
            entries.add(new FilesystemEntry(absolutePath, absolutePath, "DIRECTORY"));
        }
        return entries;
    }

    public List<FilesystemEntry> listDirectories(String path) throws IOException {
        if (path == null || path.isBlank()) {
            throw new IllegalArgumentException("Path must not be blank");
        }

        Path dir = Paths.get(path).toAbsolutePath().normalize();
        if (!Files.exists(dir) || !Files.isDirectory(dir)) {
            throw new IllegalArgumentException("Path does not exist or is not a directory: " + path);
        }

        List<FilesystemEntry> entries = new ArrayList<>();
        try (Stream<Path> stream = Files.list(dir)) {
            stream.filter(Files::isDirectory).sorted().forEach(p -> {
                String name = p.getFileName().toString();
                String absolutePath = p.toAbsolutePath().normalize().toString();
                entries.add(new FilesystemEntry(name, absolutePath, "DIRECTORY"));
            });
        }
        return entries;
    }
}
