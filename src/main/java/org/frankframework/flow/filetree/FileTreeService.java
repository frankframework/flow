package org.frankframework.flow.filetree;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.NoSuchFileException;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;
import java.util.stream.Collectors;
import java.util.stream.Stream;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class FileTreeService {

    private final Path projectsRoot;

    public FileTreeService(
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

    public String readFileContent(String absoluteFilepath) throws IOException {
        Path filePath = Paths.get(absoluteFilepath).toAbsolutePath().normalize();

        // Security check: make sure file is under projects root
        if (!filePath.startsWith(projectsRoot)) {
            throw new IllegalArgumentException("File is outside of projects root: " + absoluteFilepath);
        }

        if (!Files.exists(filePath)) {
            throw new NoSuchFileException("File does not exist: " + absoluteFilepath);
        }

        if (Files.isDirectory(filePath)) {
            throw new IllegalArgumentException("Requested path is a directory, not a file: " + absoluteFilepath);
        }

        return Files.readString(filePath, StandardCharsets.UTF_8);
    }

    public FileTreeNode getProjectTree(String projectName) throws IOException {
        Path projectPath = projectsRoot.resolve(projectName).normalize();

        if (!Files.exists(projectPath) || !Files.isDirectory(projectPath)) {
            throw new IllegalArgumentException("Project does not exist: " + projectName);
        }

        return buildTree(projectPath);
    }

    // Recursive method to build the file tree
    private FileTreeNode buildTree(Path path) throws IOException {
        FileTreeNode node = new FileTreeNode();
        node.setName(path.getFileName().toString());
        node.setPath(path.toAbsolutePath().toString());

        if (Files.isDirectory(path)) {
            node.setType(NodeType.DIRECTORY);

            try (Stream<Path> stream = Files.list(path)) {
                List<FileTreeNode> children = stream
                        .map(p -> {
                            try {
                                return buildTree(p);
                            } catch (IOException e) {
                                throw new RuntimeException(e);
                            }
                        })
                        .collect(Collectors.toList());

                node.setChildren(children);
            }
        } else {
            node.setType(NodeType.FILE);
            node.setChildren(null);
        }

        return node;
    }

}
