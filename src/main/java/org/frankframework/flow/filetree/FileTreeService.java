package org.frankframework.flow.filetree;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.NoSuchFileException;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardOpenOption;
import java.util.List;
import java.util.stream.Collectors;
import java.util.stream.Stream;
import org.frankframework.flow.adapter.AdapterNotFoundException;
import org.frankframework.flow.configuration.ConfigurationNotFoundException;
import org.frankframework.flow.project.ProjectService;
import org.frankframework.flow.utility.XmlAdapterUtils;
import org.frankframework.flow.utility.XmlSecurityUtils;
import org.springframework.stereotype.Service;
import org.w3c.dom.Document;
import org.w3c.dom.Node;

@Service
public class FileTreeService {

    private final Path projectsRoot;

    public FileTreeService(ProjectService projectService) {
        this.projectsRoot = projectService.getProjectsRoot();
    }

    public List<String> listProjectFolders() throws IOException {
        if (!Files.exists(projectsRoot) || !Files.isDirectory(projectsRoot)) {
            throw new IllegalStateException("Projects root does not exist or is not a directory");
        }

        try (Stream<Path> paths = Files.list(projectsRoot)) {
            return paths.filter(Files::isDirectory)
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

        // Make sure file is under projects root
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

    public void updateFileContent(String absoluteFilepath, String newContent) throws IOException {
        Path filePath = Paths.get(absoluteFilepath).toAbsolutePath().normalize();

        // Make sure file is under projects root
        if (!filePath.startsWith(projectsRoot)) {
            throw new IllegalArgumentException("File is outside of projects root: " + absoluteFilepath);
        }

        if (!Files.exists(filePath)) {
            throw new IllegalArgumentException("File does not exist: " + absoluteFilepath);
        }

        if (Files.isDirectory(filePath)) {
            throw new IllegalArgumentException("Cannot update a directory: " + absoluteFilepath);
        }

        Files.writeString(filePath, newContent, StandardCharsets.UTF_8);
    }

    public FileTreeNode getProjectTree(String projectName) throws IOException {
        Path projectPath = projectsRoot.resolve(projectName).normalize();

        if (!Files.exists(projectPath) || !Files.isDirectory(projectPath)) {
            throw new IllegalArgumentException("Project does not exist: " + projectName);
        }

        return buildTree(projectPath);
    }

    public boolean updateAdapterFromFile(
            String projectName, Path configurationFile, String adapterName, String newAdapterXml)
            throws ConfigurationNotFoundException, AdapterNotFoundException {

        if (!Files.exists(configurationFile)) {
            throw new ConfigurationNotFoundException("Configuration file not found: " + configurationFile);
        }

        try {
            // Parse configuration XML from file
            Document configDoc =
                    XmlSecurityUtils.createSecureDocumentBuilder().parse(Files.newInputStream(configurationFile));

            // Parse new adapter XML
            Document newAdapterDoc = XmlSecurityUtils.createSecureDocumentBuilder()
                    .parse(new ByteArrayInputStream(newAdapterXml.getBytes(StandardCharsets.UTF_8)));

            Node newAdapterNode = newAdapterDoc.getDocumentElement();

            // Delegate replacement logic
            boolean replaced = XmlAdapterUtils.replaceAdapterInDocument(configDoc, adapterName, newAdapterNode);

            if (!replaced) {
                throw new AdapterNotFoundException("Adapter not found: " + adapterName);
            }

            // Delegate document to string conversion
            String updatedXml = XmlAdapterUtils.convertDocumentToString(configDoc);

            // Write updated XML back to file
            Files.writeString(
                    configurationFile, updatedXml, StandardCharsets.UTF_8, StandardOpenOption.TRUNCATE_EXISTING);

            return true;

        } catch (AdapterNotFoundException | ConfigurationNotFoundException e) {
            throw e; // let GlobalExceptionHandler deal with it
        } catch (Exception e) {
            System.err.println("Error updating adapter in file: " + e.getMessage());
            return false;
        }
    }

    // Recursive method to build the file tree
    private FileTreeNode buildTree(Path path) throws IOException {
        FileTreeNode node = new FileTreeNode();
        node.setName(path.getFileName().toString());
        node.setPath(path.toAbsolutePath().toString());

        if (Files.isDirectory(path)) {
            node.setType(NodeType.DIRECTORY);

            try (Stream<Path> stream = Files.list(path)) {
                List<FileTreeNode> children = stream.map(p -> {
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
