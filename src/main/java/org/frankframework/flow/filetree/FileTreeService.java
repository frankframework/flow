package org.frankframework.flow.filetree;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.NoSuchFileException;
import java.nio.file.Path;
import java.nio.file.StandardOpenOption;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;
import java.util.stream.Stream;
import org.frankframework.flow.adapter.AdapterNotFoundException;
import org.frankframework.flow.configuration.ConfigurationNotFoundException;
import org.frankframework.flow.filesystem.FileSystemStorage;
import org.frankframework.flow.project.ProjectNotFoundException;
import org.frankframework.flow.project.ProjectService;
import org.frankframework.flow.utility.XmlAdapterUtils;
import org.frankframework.flow.utility.XmlSecurityUtils;
import org.springframework.stereotype.Service;
import org.w3c.dom.Document;
import org.w3c.dom.Node;

@Service
public class FileTreeService {

    private final ProjectService projectService;
    private final FileSystemStorage fileSystemStorage;

    private final Map<String, FileTreeNode> treeCache = new ConcurrentHashMap<>();

    public FileTreeService(ProjectService projectService, FileSystemStorage fileSystemStorage) {
        this.projectService = projectService;
        this.fileSystemStorage = fileSystemStorage;
    }

    public String readFileContent(String filepath) throws IOException {
        Path filePath = fileSystemStorage.toAbsolutePath(filepath);

        if (!Files.exists(filePath)) {
            throw new NoSuchFileException("File does not exist: " + filepath);
        }

        if (Files.isDirectory(filePath)) {
            throw new IllegalArgumentException("Requested path is a directory, not a file: " + filepath);
        }

        return fileSystemStorage.readFile(filepath);
    }

    public void updateFileContent(String filepath, String newContent) throws IOException {
        Path filePath = fileSystemStorage.toAbsolutePath(filepath);

        if (!Files.exists(filePath)) {
            throw new IllegalArgumentException("File does not exist: " + filepath);
        }

        if (Files.isDirectory(filePath)) {
            throw new IllegalArgumentException("Cannot update a directory: " + filepath);
        }

        fileSystemStorage.writeFile(filepath, newContent);
        invalidateTreeCache();
    }

    public FileTreeNode getProjectTree(String projectName) throws IOException {
        FileTreeNode cached = treeCache.get(projectName);
        if (cached != null) {
            return cached;
        }

        try {
            var project = projectService.getProject(projectName);
            Path projectPath = fileSystemStorage.toAbsolutePath(project.getRootPath());

            if (!Files.exists(projectPath) || !Files.isDirectory(projectPath)) {
                throw new IllegalArgumentException("Project directory does not exist: " + projectName);
            }

            boolean useRelativePaths = !fileSystemStorage.isLocalEnvironment();
            Path relativizeRoot = useRelativePaths ? fileSystemStorage.toAbsolutePath("") : projectPath;
            FileTreeNode tree = buildTree(projectPath, relativizeRoot, useRelativePaths);
            tree.setProjectRoot(true);
            treeCache.put(projectName, tree);
            return tree;
        } catch (ProjectNotFoundException e) {
            throw new IllegalArgumentException("Project does not exist: " + projectName);
        }
    }

    public FileTreeNode getShallowDirectoryTree(String projectName, String directoryPath) throws IOException {
        try {
            var project = projectService.getProject(projectName);
            Path projectPath = fileSystemStorage.toAbsolutePath(project.getRootPath());
            Path dirPath = projectPath.resolve(directoryPath).normalize();

            if (!dirPath.startsWith(projectPath)) {
                throw new SecurityException("Invalid path: outside project directory");
            }

            if (!Files.exists(dirPath) || !Files.isDirectory(dirPath)) {
                throw new IllegalArgumentException("Directory does not exist: " + dirPath);
            }

            return buildShallowTree(dirPath);
        } catch (ProjectNotFoundException e) {
            throw new IllegalArgumentException("Project does not exist: " + projectName);
        }
    }

    public FileTreeNode getShallowConfigurationsDirectoryTree(String projectName) throws IOException {
        try {
            var project = projectService.getProject(projectName);
            Path configDirPath = fileSystemStorage
                    .toAbsolutePath(project.getRootPath())
                    .resolve("src/main/configurations")
                    .normalize();

            if (!Files.exists(configDirPath) || !Files.isDirectory(configDirPath)) {
                throw new IllegalArgumentException("Configurations directory does not exist: " + configDirPath);
            }

            return buildShallowTree(configDirPath);
        } catch (ProjectNotFoundException e) {
            throw new IllegalArgumentException("Configurations directory does not exist: " + projectName);
        }
    }

    public FileTreeNode getConfigurationsDirectoryTree(String projectName) throws IOException {
        try {
            var project = projectService.getProject(projectName);
            Path projectPath = fileSystemStorage.toAbsolutePath(project.getRootPath());
            Path configDirPath = projectPath.resolve("src/main/configurations").normalize();

            if (!Files.exists(configDirPath) || !Files.isDirectory(configDirPath)) {
                throw new IllegalArgumentException("Configurations directory does not exist: " + configDirPath);
            }

            boolean useRelativePaths = !fileSystemStorage.isLocalEnvironment();
            Path relativizeRoot = useRelativePaths ? fileSystemStorage.toAbsolutePath("") : projectPath;
            return buildTree(configDirPath, relativizeRoot, useRelativePaths);
        } catch (ProjectNotFoundException e) {
            throw new IllegalArgumentException("Configurations directory does not exist: " + projectName);
        }
    }

    public void invalidateTreeCache() {
        treeCache.clear();
    }

    public void invalidateTreeCache(String projectName) {
        treeCache.remove(projectName);
    }

    public boolean updateAdapterFromFile(
            String projectName, Path configurationFile, String adapterName, String newAdapterXml)
            throws ConfigurationNotFoundException, AdapterNotFoundException, IOException {

        Path absConfigFile = fileSystemStorage.toAbsolutePath(configurationFile.toString());

        if (!Files.exists(absConfigFile)) {
            throw new ConfigurationNotFoundException("Configuration file not found: " + configurationFile);
        }

        try {
            Document configDoc =
                    XmlSecurityUtils.createSecureDocumentBuilder().parse(Files.newInputStream(absConfigFile));

            Document newAdapterDoc = XmlSecurityUtils.createSecureDocumentBuilder()
                    .parse(new ByteArrayInputStream(newAdapterXml.getBytes(StandardCharsets.UTF_8)));

            Node newAdapterNode = newAdapterDoc.getDocumentElement();

            boolean replaced = XmlAdapterUtils.replaceAdapterInDocument(configDoc, adapterName, newAdapterNode);

            if (!replaced) {
                throw new AdapterNotFoundException("Adapter not found: " + adapterName);
            }

            String updatedXml = XmlAdapterUtils.convertDocumentToString(configDoc);

            Files.writeString(absConfigFile, updatedXml, StandardCharsets.UTF_8, StandardOpenOption.TRUNCATE_EXISTING);

            invalidateTreeCache(projectName);
            return true;

        } catch (AdapterNotFoundException | ConfigurationNotFoundException e) {
            throw e;
        } catch (Exception e) {
            System.err.println("Error updating adapter in file: " + e.getMessage());
            return false;
        }
    }

    private FileTreeNode buildTree(Path path, Path relativizeRoot, boolean useRelativePaths) throws IOException {
        FileTreeNode node = new FileTreeNode();
        node.setName(path.getFileName().toString());

        if (useRelativePaths) {
            String relativePath = relativizeRoot.relativize(path).toString().replace("\\", "/");
            if (relativePath.isEmpty()) {
                relativePath = ".";
            }
            node.setPath(relativePath);
        } else {
            node.setPath(path.toAbsolutePath().toString());
        }

        if (Files.isDirectory(path)) {
            node.setType(NodeType.DIRECTORY);

            try (Stream<Path> stream = Files.list(path)) {
                List<FileTreeNode> children = stream.map(p -> {
                            try {
                                return buildTree(p, relativizeRoot, useRelativePaths);
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

    // Method to build a shallow tree (only immediate children)
    private FileTreeNode buildShallowTree(Path path) throws IOException {
        FileTreeNode node = new FileTreeNode();
        node.setName(path.getFileName().toString());
        node.setPath(path.toAbsolutePath().toString());

        if (!Files.isDirectory(path)) {
            throw new IllegalArgumentException("Path is not a directory: " + path);
        }

        node.setType(NodeType.DIRECTORY);

        try (Stream<Path> stream = Files.list(path)) {
            List<FileTreeNode> children = stream.map(p -> {
                        FileTreeNode child = new FileTreeNode();
                        child.setName(p.getFileName().toString());
                        child.setPath(p.toAbsolutePath().toString());

                        if (Files.isDirectory(p)) {
                            child.setType(NodeType.DIRECTORY);
                        } else {
                            child.setType(NodeType.FILE);
                        }

                        return child;
                    })
                    .toList();

            node.setChildren(children);
        }

        return node;
    }
}
