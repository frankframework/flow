package org.frankframework.flow.file;

import java.io.IOException;
import java.io.StringReader;
import java.io.UncheckedIOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.IntStream;
import java.util.stream.Stream;
import javax.xml.parsers.DocumentBuilder;
import org.frankframework.flow.exception.ApiException;
import org.frankframework.flow.filesystem.FileSystemStorage;
import org.frankframework.flow.project.ConfigurationProject;
import org.frankframework.flow.project.ConfigurationProjectService;
import org.frankframework.flow.utility.XmlConfigurationUtils;
import org.frankframework.flow.utility.XmlSecurityUtils;
import org.springframework.stereotype.Service;
import org.w3c.dom.Document;
import org.w3c.dom.Element;
import org.w3c.dom.NodeList;
import org.xml.sax.InputSource;
import org.xml.sax.helpers.DefaultHandler;

@Service
public class FileTreeService {

	private final ConfigurationProjectService configurationProjectService;
	private final FileSystemStorage fileSystemStorage;
	private final FileService fileService;

	private final Map<String, FileTreeNode> treeCache = new ConcurrentHashMap<>();

	public FileTreeService(
			ConfigurationProjectService configurationProjectService,
			FileSystemStorage fileSystemStorage,
			FileService fileService
	) {
		this.configurationProjectService = configurationProjectService;
		this.fileSystemStorage = fileSystemStorage;
		this.fileService = fileService;
	}

	public FileTreeNode getProjectTree(String projectName) throws IOException {
		FileTreeNode cached = treeCache.get(projectName);
		if (cached != null) {
			return cached;
		}

		try {
			ConfigurationProject configurationProject = configurationProjectService.getProject(projectName);
			Path projectPath = fileSystemStorage.toAbsolutePath(configurationProject.getRootPath());

			if (!Files.exists(projectPath) || !Files.isDirectory(projectPath)) {
				throw new IllegalArgumentException("Project directory does not exist: " + projectName);
			}

			boolean useRelativePaths = !fileSystemStorage.isLocalEnvironment();
			Path relativizeRoot = useRelativePaths ? fileSystemStorage.toAbsolutePath("") : projectPath;
			FileTreeNode tree = buildTree(projectPath, relativizeRoot, useRelativePaths);
			tree.setProjectRoot(true);
			treeCache.put(projectName, tree);
			return tree;
		} catch (ApiException _) {
			throw new IllegalArgumentException("Project does not exist: " + projectName);
		}
	}

	public FileTreeNode getShallowDirectoryTree(String projectName, String directoryPath) throws IOException {
		ProjectDirectory projectDirectory = resolveProjectDirectory(projectName, directoryPath);
		return buildShallowTree(projectDirectory.dirPath, projectDirectory.relativizeRoot, projectDirectory.useRelativePaths);
	}

	public FileTreeNode getShallowStudioDirectoryTree(String projectName, String directoryPath) throws IOException {
		return filterStudioTree(getShallowDirectoryTree(projectName, directoryPath));
	}

	public FileTreeNode getShallowConfigurationsDirectoryTree(String projectName) throws IOException {
		try {
			ConfigurationDirectory configurationDirectory = getConfigurationsDirectory(projectName);
			FileTreeNode tree = buildShallowTree(configurationDirectory.directoryPath, configurationDirectory.relativizeRoot, configurationDirectory.useRelativePaths);
			return filterStudioTree(tree);
		} catch (ApiException _) {
			throw new IllegalArgumentException("Configurations directory does not exist: " + projectName);
		}
	}

	public FileTreeNode getConfigurationsDirectoryTree(String projectName) throws IOException {
		try {
			ConfigurationDirectory configurationDirectory = getConfigurationsDirectory(projectName);
			FileTreeNode tree = buildTree(configurationDirectory.directoryPath, configurationDirectory.relativizeRoot, configurationDirectory.useRelativePaths);
			return filterStudioTree(tree);
		} catch (ApiException _) {
			throw new IllegalArgumentException("Configurations directory does not exist: " + projectName);
		}
	}

	public FileTreeNode getAncestorPath(String projectName, String directoryPath) throws IOException {
		ProjectDirectory projecetDirectory = resolveProjectDirectory(projectName, directoryPath);
		return buildAncestorTree(projecetDirectory.projectPath, projecetDirectory.dirPath, projecetDirectory.relativizeRoot, projecetDirectory.useRelativePaths);
	}

	public FileTreeNode createFolder(String projectName, String path) throws IOException {
		fileService.validatePath(path);
		fileService.validateWithinProject(projectName, path);
		fileSystemStorage.createProjectDirectory(path);
		invalidateTreeCache(projectName);

		String folderName = Path.of(path).getFileName().toString();
		FileTreeNode node = new FileTreeNode();
		node.setName(folderName);
		node.setPath(path);
		node.setType(NodeType.DIRECTORY);
		return node;
	}

	public void invalidateTreeCache() {
		treeCache.clear();
	}

	public void invalidateTreeCache(String projectName) {
		treeCache.remove(projectName);
	}

	private FileTreeNode buildTree(Path path, Path relativizeRoot, boolean useRelativePaths) throws IOException {
		FileTreeNode node = new FileTreeNode();
		node.setName(path.getFileName().toString());
		node.setPath(toNodePath(path, relativizeRoot, useRelativePaths));

		if (Files.isDirectory(path)) {
			node.setType(NodeType.DIRECTORY);

			try (Stream<Path> stream = Files.list(path)) {
				List<FileTreeNode> children = stream.map(childPath -> {
							try {
								return buildTree(childPath, relativizeRoot, useRelativePaths);
							} catch (IOException exception) {
								throw new UncheckedIOException(exception);
							}
						})
						.toList();

				node.setChildren(children);
			}
		} else {
			node.setType(NodeType.FILE);
			node.setChildren(null);
			if (fileService.hasAllowedExtension(path.getFileName().toString())) {
				node.setAdapterNames(extractAdapterNames(path));
			}
		}

		return node;
	}

	private ConfigurationDirectory getConfigurationsDirectory(String projectName) throws ApiException {
		ConfigurationProject configurationProject = configurationProjectService.getProject(projectName);
		Path configurationPath = fileSystemStorage.toAbsolutePath(configurationProject.getRootPath()).normalize();

		if (!Files.exists(configurationPath) || !Files.isDirectory(configurationPath)) {
			throw new IllegalArgumentException("Configurations directory does not exist: " + configurationPath);
		}

		boolean useRelativePaths = !fileSystemStorage.isLocalEnvironment();
		Path relativizeRoot = useRelativePaths ? fileSystemStorage.toAbsolutePath("") : configurationPath;
		return new ConfigurationDirectory(configurationPath, relativizeRoot, useRelativePaths);
	}

	/**
	 * Keeps only configuration files and the directories that recursively contain configuration files. The root is
	 * always returned so the Studio has a tree to render, even when it has no children.
	 */
	private FileTreeNode filterStudioTree(FileTreeNode root) {
		if (root.getType() == NodeType.DIRECTORY && root.getChildren() != null) {
			root.setChildren(pruneStudioChildren(root.getChildren()));
		}
		return root;
	}

	private List<FileTreeNode> pruneStudioChildren(List<FileTreeNode> children) {
		return children.stream()
				.filter(this::keepStudioNode)
				.toList();
	}

	private boolean keepStudioNode(FileTreeNode node) {
		if (node.getType() == NodeType.FILE) {
			return isStudioConfigurationFile(node.getName());
		}

		if (node.getChildren() == null) {
			return true;
		}

		node.setChildren(pruneStudioChildren(node.getChildren()));
		return !node.getChildren().isEmpty();
	}

	private boolean isStudioConfigurationFile(String fileName) {
		return fileName.toLowerCase().endsWith(".xml");
	}

	private List<String> extractAdapterNames(Path xmlFile) {
		try {
			String content = XmlConfigurationUtils.repairFlowNamespace(Files.readString(xmlFile, StandardCharsets.UTF_8));
			DocumentBuilder builder = XmlSecurityUtils.createSecureDocumentBuilder();
			builder.setErrorHandler(new DefaultHandler());
			Document doc = builder.parse(new InputSource(new StringReader(content)));
			NodeList adapters = doc.getElementsByTagName("Adapter");
			if (adapters.getLength() == 0) {
				adapters = doc.getElementsByTagName("adapter");
			}

			NodeList resolvedAdapters = adapters;
			return IntStream.range(0, resolvedAdapters.getLength())
					.mapToObj(index -> ((Element) resolvedAdapters.item(index)).getAttribute("name"))
					.filter(name -> !name.isBlank())
					.toList();
		} catch (Exception _) {
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

	private FileTreeNode buildAncestorTree(Path current, Path target, Path relativizeRoot, boolean useRelativePaths) throws IOException {
		FileTreeNode node = buildShallowTree(current, relativizeRoot, useRelativePaths);
		if (current.equals(target)) {
			return node;
		}

		Path nextOnPath = target;
		while (!nextOnPath.getParent().equals(current)) {
			nextOnPath = nextOnPath.getParent();
		}

		String spineChildName = nextOnPath.getFileName().toString();
		Path spineChildPath = nextOnPath;

		List<FileTreeNode> updatedChildren = new ArrayList<>(node.getChildren().size());
		for (FileTreeNode child : node.getChildren()) {
			if (child.getName().equals(spineChildName)) {
				updatedChildren.add(buildAncestorTree(spineChildPath, target, relativizeRoot, useRelativePaths));
			} else {
				updatedChildren.add(child);
			}
		}

		node.setChildren(updatedChildren);
		return node;
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
			List<FileTreeNode> children = stream.map(childPath -> {
						FileTreeNode child = new FileTreeNode();
						child.setName(childPath.getFileName().toString());
						child.setPath(toNodePath(childPath, relativizeRoot, useRelativePaths));
						child.setType(Files.isDirectory(childPath) ? NodeType.DIRECTORY : NodeType.FILE);
						if (!Files.isDirectory(childPath) && childPath.getFileName().toString().toLowerCase().endsWith(".xml")) {
							child.setAdapterNames(extractAdapterNames(childPath));
						}
						return child;
					})
					.toList();

			node.setChildren(children);
		}

		return node;
	}

	private ProjectDirectory resolveProjectDirectory(String projectName, String directoryPath) {
		try {
			ConfigurationProject configurationProject = configurationProjectService.getProject(projectName);
			Path projectPath = fileSystemStorage.toAbsolutePath(configurationProject.getRootPath());
			Path dirPath = fileSystemStorage.toAbsolutePath(directoryPath).normalize();

			if (!dirPath.startsWith(projectPath)) {
				throw new SecurityException("Invalid path: outside project directory");
			}

			if (!Files.exists(dirPath) || !Files.isDirectory(dirPath)) {
				throw new IllegalArgumentException("Directory does not exist: " + dirPath);
			}

			boolean useRelativePaths = !fileSystemStorage.isLocalEnvironment();
			Path relativizeRoot = useRelativePaths ? fileSystemStorage.toAbsolutePath("") : projectPath;
			return new ProjectDirectory(projectPath, dirPath, relativizeRoot, useRelativePaths);
		} catch (ApiException _) {
			throw new IllegalArgumentException("Project does not exist: " + projectName);
		}
	}

	private record ProjectDirectory(
			Path projectPath,
			Path dirPath,
			Path relativizeRoot,
			boolean useRelativePaths
	) {}

	private record ConfigurationDirectory(
			Path directoryPath,
			Path relativizeRoot,
			boolean useRelativePaths
	) {
	}
}
