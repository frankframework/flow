package org.frankframework.flow.filetree;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.FileAlreadyExistsException;
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
import org.frankframework.flow.exception.ApiException;
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

    public void updateFileContent(String projectName, String filepath, String newContent)
            throws IOException, ProjectNotFoundException, ConfigurationNotFoundException {
        Path filePath = fileSystemStorage.toAbsolutePath(filepath);

        if (!Files.exists(filePath)) {
            throw new IllegalArgumentException("File does not exist: " + filepath);
        }

        if (Files.isDirectory(filePath)) {
            throw new IllegalArgumentException("Cannot update a directory: " + filepath);
        }

        fileSystemStorage.writeFile(filepath, newContent);
        projectService.updateConfigurationXml(projectName, filepath, newContent);
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
            Path dirPath = fileSystemStorage.toAbsolutePath(directoryPath).normalize();

            if (!dirPath.startsWith(projectPath)) {
                throw new SecurityException("Invalid path: outside project directory");
            }

            if (!Files.exists(dirPath) || !Files.isDirectory(dirPath)) {
                throw new IllegalArgumentException("Directory does not exist: " + dirPath);
            }

            boolean useRelativePaths = !fileSystemStorage.isLocalEnvironment();
            Path relativizeRoot = useRelativePaths ? fileSystemStorage.toAbsolutePath("") : projectPath;
            return buildShallowTree(dirPath, relativizeRoot, useRelativePaths);
        } catch (ProjectNotFoundException e) {
            throw new IllegalArgumentException("Project does not exist: " + projectName);
        }
    }

    public FileTreeNode getShallowConfigurationsDirectoryTree(String projectName) throws IOException {
        try {
            var project = projectService.getProject(projectName);
            Path projectPath = fileSystemStorage.toAbsolutePath(project.getRootPath());
            Path configDirPath = projectPath.resolve("src/main/configurations").normalize();

            if (!Files.exists(configDirPath) || !Files.isDirectory(configDirPath)) {
                throw new IllegalArgumentException("Configurations directory does not exist: " + configDirPath);
            }

            boolean useRelativePaths = !fileSystemStorage.isLocalEnvironment();
            Path relativizeRoot = useRelativePaths ? fileSystemStorage.toAbsolutePath("") : projectPath;
            return buildShallowTree(configDirPath, relativizeRoot, useRelativePaths);
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

    public FileTreeNode createFile(String projectName, String parentPath, String fileName)
            throws IOException, ProjectNotFoundException, ApiException {
        validateFileName(fileName);
        String fullPath = parentPath.endsWith("/") ? parentPath + fileName : parentPath + "/" + fileName;
        validateWithinProject(projectName, fullPath);

        if (fileName.toLowerCase().endsWith(".xml")) {
            projectService.addConfigurationToFolder(projectName, fileName, parentPath);
            return null;
        }

        fileSystemStorage.createFile(fullPath);
        invalidateTreeCache(projectName);

        FileTreeNode node = new FileTreeNode();
        node.setName(fileName);
        node.setPath(fullPath);
        node.setType(NodeType.FILE);
        return node;
    }

    public FileTreeNode createFolder(String projectName, String parentPath, String folderName) throws IOException {
        validateFileName(folderName);
        String fullPath = parentPath.endsWith("/") ? parentPath + folderName : parentPath + "/" + folderName;
        validateWithinProject(projectName, fullPath);

        fileSystemStorage.createProjectDirectory(fullPath);
        invalidateTreeCache(projectName);

        FileTreeNode node = new FileTreeNode();
        node.setName(folderName);
        node.setPath(fullPath);
        node.setType(NodeType.DIRECTORY);
        return node;
    }

    public FileTreeNode renameFile(String projectName, String oldPath, String newName) throws IOException {
        validateFileName(newName);
        validateWithinProject(projectName, oldPath);

        Path oldAbsPath = fileSystemStorage.toAbsolutePath(oldPath);
        Path newAbsPath = oldAbsPath.getParent().resolve(newName);
        String newPath = newAbsPath.toString();

        if (!fileSystemStorage.isLocalEnvironment()) {
            String parentRelative = oldPath.contains("/") ? oldPath.substring(0, oldPath.lastIndexOf('/')) : "";
            newPath = parentRelative.isEmpty() ? newName : parentRelative + "/" + newName;
        }

        validateWithinProject(projectName, newPath);

        if (Files.exists(newAbsPath)) {
            throw new FileAlreadyExistsException("A file or folder with that name already exists: " + newName);
        }

        fileSystemStorage.rename(oldPath, newPath);
        invalidateTreeCache(projectName);

        boolean isDir = Files.isDirectory(newAbsPath);
        FileTreeNode node = new FileTreeNode();
        node.setName(newName);
        node.setPath(newPath);
        node.setType(isDir ? NodeType.DIRECTORY : NodeType.FILE);
        return node;
    }

    public void deleteFile(String projectName, String path) throws IOException {
        validateWithinProject(projectName, path);
        fileSystemStorage.delete(path);
        invalidateTreeCache(projectName);
    }

    private void validateWithinProject(String projectName, String path) throws IOException {
        try {
            var project = projectService.getProject(projectName);
            Path projectPath = fileSystemStorage.toAbsolutePath(project.getRootPath());
            Path targetPath = fileSystemStorage.toAbsolutePath(path).normalize();

            if (!targetPath.startsWith(projectPath)) {
                throw new SecurityException("Path is outside project directory");
            }
        } catch (ProjectNotFoundException e) {
            throw new IllegalArgumentException("Project does not exist: " + projectName);
        }
    }

    private void validateFileName(String name) {
        if (name == null || name.isBlank()) {
            throw new IllegalArgumentException("File name must not be empty");
        }
        if (name.contains("/") || name.contains("\\") || name.contains("..")) {
            throw new IllegalArgumentException("File name contains invalid characters: " + name);
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

            String updatedXml = XmlAdapterUtils.convertNodeToString(configDoc);

            Files.writeString(absConfigFile, updatedXml, StandardCharsets.UTF_8, StandardOpenOption.TRUNCATE_EXISTING);

            invalidateTreeCache(projectName);
            return true;

        } catch (AdapterNotFoundException e) {
            throw e;
        } catch (Exception e) {
            System.err.println("Error updating adapter in file: " + e.getMessage());
            return false;
        }
    }

    private FileTreeNode buildTree(Path path, Path relativizeRoot, boolean useRelativePaths) throws IOException {
        FileTreeNode node = new FileTreeNode();
        node.setName(path.getFileName().toString());
        node.setPath(toNodePath(path, relativizeRoot, useRelativePaths));

        if (Files.isDirectory(path)) {
            node.setType(NodeType.DIRECTORY);

            try (Stream<Path> stream = Files.list(path)) {
                List<FileTreeNode> children = stream.map(p -> {
                            try {
                                return buildTree(p, relativizeRoot, useRelativePaths);
                            } catch (IOException e) {
                                throw new UncheckedIOException(e);
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

    private String toNodePath(Path path, Path relativizeRoot, boolean useRelativePaths) {
        if (!useRelativePaths) {
            return path.toAbsolutePath().toString();
        }
        String relativePath = relativizeRoot.relativize(path).toString().replace("\\", "/");
        return relativePath.isEmpty() ? "." : relativePath;
    }

    // Method to build a shallow tree (only immediate children)
    private FileTreeNode buildShallowTree(Path path, Path relativizeRoot, boolean useRelativePaths) throws IOException {
        FileTreeNode node = new FileTreeNode();
        node.setName(path.getFileName().toString());
        node.setPath(toNodePath(path, relativizeRoot, useRelativePaths));

        if (!Files.isDirectory(path)) {
            throw new IllegalArgumentException("Path is not a directory: " + path);
        }

        node.setType(NodeType.DIRECTORY);

        try (Stream<Path> stream = Files.list(path)) {
            List<FileTreeNode> children = stream.map(p -> {
                        FileTreeNode child = new FileTreeNode();
                        child.setName(p.getFileName().toString());
                        child.setPath(toNodePath(p, relativizeRoot, useRelativePaths));
                        child.setType(Files.isDirectory(p) ? NodeType.DIRECTORY : NodeType.FILE);
                        return child;
                    })
                    .toList();

            node.setChildren(children);
        }

        return node;
    }
}
