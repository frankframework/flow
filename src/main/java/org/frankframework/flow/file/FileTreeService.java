package org.frankframework.flow.file;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Stream;
import javax.xml.parsers.DocumentBuilder;
import org.frankframework.flow.exception.ApiException;
import org.frankframework.flow.filesystem.FileSystemStorage;
import org.frankframework.flow.project.ConfigurationProject;
import org.frankframework.flow.project.ConfigurationProjectService;
import org.frankframework.flow.utility.XmlSecurityUtils;
import org.springframework.stereotype.Service;
import org.w3c.dom.Document;
import org.w3c.dom.Element;
import org.w3c.dom.NodeList;
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
		} catch (ApiException exception) {
			throw new IllegalArgumentException("Project does not exist: " + projectName);
		}
	}

	public FileTreeNode getShallowDirectoryTree(String projectName, String directoryPath) throws IOException {
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
			return buildShallowTree(dirPath, relativizeRoot, useRelativePaths);
		} catch (ApiException exception) {
			throw new IllegalArgumentException("Project does not exist: " + projectName);
		}
	}

	public FileTreeNode getShallowConfigurationsDirectoryTree(String projectName) throws IOException {
		try {
			ConfigurationDirectory configurationDirectory = getConfigurationsDirectory(projectName);
			return buildShallowTree(configurationDirectory.directoryPath, configurationDirectory.relativizeRoot, configurationDirectory.useRelativePaths);
		} catch (ApiException exception) {
			throw new IllegalArgumentException("Configurations directory does not exist: " + projectName);
		}
	}

	public FileTreeNode getConfigurationsDirectoryTree(String projectName) throws IOException {
		try {
			ConfigurationDirectory configurationDirectory = getConfigurationsDirectory(projectName);
			return buildTree(configurationDirectory.directoryPath, configurationDirectory.relativizeRoot, configurationDirectory.useRelativePaths);
		} catch (ApiException exception) {
			throw new IllegalArgumentException("Configurations directory does not exist: " + projectName);
		}
	}

	public FileTreeNode createFolder(String projectName, String path) throws IOException, ApiException {
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
		Path absoluteRootPath = fileSystemStorage.toAbsolutePath(configurationProject.getRootPath());
		Path configurationPath = absoluteRootPath.resolve("src/main/configurations/"+ projectName).normalize();

		if (!Files.exists(configurationPath) || !Files.isDirectory(configurationPath)) {
			throw new IllegalArgumentException("Configurations directory does not exist: " + configurationPath);
		}

		boolean useRelativePaths = !fileSystemStorage.isLocalEnvironment();
		Path relativizeRoot = useRelativePaths ? fileSystemStorage.toAbsolutePath("") : configurationPath;
		return new ConfigurationDirectory(configurationPath, relativizeRoot, useRelativePaths);
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
		} catch (Exception exception) {
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

	private record ConfigurationDirectory(
			Path directoryPath,
			Path relativizeRoot,
			boolean useRelativePaths
	) {
	}
}
