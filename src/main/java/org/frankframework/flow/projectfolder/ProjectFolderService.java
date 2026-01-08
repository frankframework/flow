package org.frankframework.flow.projectfolder;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;
import java.util.stream.Collectors;
import java.util.stream.Stream;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class ProjectFolderService {

    private final Path projectsRoot;

    public ProjectFolderService(
            @Value("${app.project.root}") String rootPath) {
        this.projectsRoot = Paths.get(rootPath).toAbsolutePath().normalize();
    }

    public List<String> listProjectFolders() throws IOException {
        if (!Files.exists(projectsRoot) || !Files.isDirectory(projectsRoot)) {
            throw new IllegalStateException("Projects root does not exist or is not a directory");
        }

        try (Stream<Path> paths = Files.list(projectsRoot)) {
            return paths
                    .filter(Files::isDirectory)
                    .map(path -> path.getFileName().toString())
                    .sorted()
                    .collect(Collectors.toList());
        }
    }

    public Path getProjectsRoot() {
        if (!Files.exists(projectsRoot) || !Files.isDirectory(projectsRoot)) {
            throw new IllegalStateException("Projects root does not exist or is not a directory");
        }
        return projectsRoot;
    }
}
