package org.frankframework.flow.filetree;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.file.FileAlreadyExistsException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;
import java.util.stream.Stream;
import javax.xml.parsers.DocumentBuilder;
import javax.xml.parsers.ParserConfigurationException;
import javax.xml.transform.TransformerException;

import org.frankframework.flow.configuration.ConfigurationService;
import org.frankframework.flow.exception.ApiException;
import org.frankframework.flow.filesystem.FileSystemStorage;
import org.frankframework.flow.project.Project;
import org.frankframework.flow.project.ProjectNotFoundException;
import org.frankframework.flow.project.ProjectService;
import org.frankframework.flow.utility.XmlSecurityUtils;
import org.springframework.stereotype.Service;
import org.w3c.dom.Document;
import org.w3c.dom.Element;
import org.w3c.dom.NodeList;
import org.xml.sax.SAXException;
import org.xml.sax.helpers.DefaultHandler;

@Service
public class FileTreeService {

	private final ProjectService projectService;
	private final FileSystemStorage fileSystemStorage;
	private final ConfigurationService configurationService;

	private final Map<String, FileTreeNode> treeCache = new ConcurrentHashMap<>();

	public FileTreeService(
			ProjectService projectService,
			FileSystemStorage fileSystemStorage,
			ConfigurationService configurationService) {
		this.projectService = projectService;
		this.fileSystemStorage = fileSystemStorage;
		this.configurationService = configurationService;
	}

	public FileTreeNode getProjectTree(String projectName) throws IOException {
		FileTreeNode cached = treeCache.get(projectName);
		if (cached != null) {
			return cached;
		}

		try {
			Project project = projectService.getProject(projectName);
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
			Project project = projectService.getProject(projectName);
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
			Project project = projectService.getProject(projectName);
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
			Project project = projectService.getProject(projectName);
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
			throws IOException, ApiException, ParserConfigurationException, TransformerException, SAXException, ParserConfigurationException, TransformerException, SAXException {
		if (parentPath == null || parentPath.isBlank()) {
			throw new IllegalArgumentException("Parent path must not be empty");
		}

		validateFileName(fileName);
		String fullPath = parentPath.endsWith("/") ? parentPath + fileName : parentPath + "/" + fileName;
		validateWithinProject(projectName, fullPath);

		if (fileName.toLowerCase().endsWith(".xml")) {
			configurationService.addConfigurationToFolder(projectName, fileName, parentPath);
		} else {
			fileSystemStorage.createFile(fullPath);
		}

		invalidateTreeCache(projectName);

		FileTreeNode node = new FileTreeNode();
		node.setName(fileName);
		node.setPath(fullPath);
		node.setType(NodeType.FILE);
		return node;
	}

	public FileTreeNode createFolder(String projectName, String parentPath, String folderName) throws IOException {
		if (parentPath == null || parentPath.isBlank()) {
			throw new IllegalArgumentException("Parent path must not be empty");
		}
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

	public void invalidateTreeCache() {
		treeCache.clear();
	}

	public void invalidateTreeCache(String projectName) {
		treeCache.remove(projectName);
	}

	private void validateWithinProject(String projectName, String path) throws IOException {
		try {
			Project project = projectService.getProject(projectName);
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
			if (path.getFileName().toString().toLowerCase().endsWith(".xml")) {
				node.setAdapterNames(extractAdapterNames(path));
			}
		}

		return node;
	}

	private List<String> extractAdapterNames(Path xmlFile) {
		try {
			DocumentBuilder builder = XmlSecurityUtils.createSecureDocumentBuilder();
			builder.setErrorHandler(new DefaultHandler());
			Document doc = builder.parse(Files.newInputStream(xmlFile));
			NodeList adapters = doc.getElementsByTagName("Adapter");
			if (adapters.getLength() == 0) {
				adapters = doc.getElementsByTagName("adapter");
			}
			List<String> names = new ArrayList<>();
			for (int i = 0; i < adapters.getLength(); i++) {
				String name = ((Element) adapters.item(i)).getAttribute("name");
				if (!name.isBlank()) {
					names.add(name);
				}
			}
			return names;
		} catch (Exception e) {
			return List.of();
		}
	}

	private String toNodePath(Path path, Path relativizeRoot, boolean useRelativePaths) {
		if (!useRelativePaths) {
			return path.toAbsolutePath().toString();
		}
		String relativePath = relativizeRoot.relativize(path).toString().replace("\\", "/");
		return relativePath.isEmpty() ? "." : relativePath;
	}

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
						if (!Files.isDirectory(p)
								&& p.getFileName().toString().toLowerCase().endsWith(".xml")) {
							child.setAdapterNames(extractAdapterNames(p));
						}
						return child;
					})
					.toList();

			node.setChildren(children);
		}

		return node;
	}
}
