package org.frankframework.flow.project;

import java.io.IOException;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Stream;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;

import lombok.extern.log4j.Log4j2;

import org.eclipse.jgit.api.CloneCommand;
import org.eclipse.jgit.api.Git;
import org.eclipse.jgit.api.errors.GitAPIException;
import org.eclipse.jgit.transport.CredentialsProvider;

import org.frankframework.flow.exception.ApiException;
import org.frankframework.flow.filesystem.FileSystemStorage;
import org.frankframework.flow.filesystem.FilesystemEntry;
import org.frankframework.flow.git.GitCredentialHelper;
import org.frankframework.flow.git.GitService;
import org.frankframework.flow.projectsettings.FilterType;
import org.frankframework.flow.recentproject.RecentProject;
import org.frankframework.flow.recentproject.RecentProjectsService;

import org.springframework.context.annotation.Lazy;
import org.springframework.core.io.ClassPathResource;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

@Log4j2
@Service
public class ConfigurationProjectService {
	private static final String CONFIGURATIONS_DIR = "src/main/configurations";

	private final FileSystemStorage fileSystemStorage;
	private final RecentProjectsService recentProjectsService;

	// Cache is now ONLY for lightweight Project state (Tokens, Filters), NOT files.
	private final Map<String, ConfigurationProject> projectCache = new ConcurrentHashMap<>();

	public ConfigurationProjectService(FileSystemStorage fileSystemStorage, @Lazy RecentProjectsService recentProjectsService) {
		this.fileSystemStorage = fileSystemStorage;
		this.recentProjectsService = recentProjectsService;
	}

	private static void validatePathSafety(Path path) {
		String pathStr = path.toString();
		if (pathStr.contains("..")) {
			throw new SecurityException("Path traversal is not allowed: " + pathStr);
		}
	}

	public List<ConfigurationProject> getProjects() {
		if (fileSystemStorage.isLocalEnvironment()) {
			return getProjectsFromRecentList();
		}
		return getProjectsFromWorkspaceScan();
	}

	private List<ConfigurationProject> getProjectsFromRecentList() {
		List<ConfigurationProject> foundProjects = new ArrayList<>();
		List<RecentProject> recentProjects = recentProjectsService.getRecentProjects();

		for (RecentProject recent : recentProjects) {
			try {
				ConfigurationProject configurationProject = loadProjectCached(recent.rootPath());
				foundProjects.add(configurationProject);
			} catch (Exception _) {
				log.debug("Recent project no longer valid: {}", recent.rootPath());
			}
		}
		return foundProjects;
	}

	private List<ConfigurationProject> getProjectsFromWorkspaceScan() {
		List<ConfigurationProject> foundProjects = new ArrayList<>();
		List<FilesystemEntry> entries = fileSystemStorage.listRoots();

		for (FilesystemEntry entry : entries) {
			try {
				ConfigurationProject configurationProject = loadProjectCached(entry.path());
				foundProjects.add(configurationProject);
			} catch (Exception _) {
				// Not a valid project, skip
			}
		}
		return foundProjects;
	}

	public ConfigurationProject getProject(String name) throws ApiException {
		for (ConfigurationProject cached : projectCache.values()) {
			if (cached.getName().equals(name)) {
				return cached;
			}
		}

		return getProjects().stream()
				.filter(project -> project.getName().equals(name))
				.findFirst()
				.orElseThrow(() -> new ApiException("Project not found: " + name, HttpStatus.NOT_FOUND));
	}

	public ConfigurationProject createProjectOnDisk(ConfigurationProjectCreateDTO projectCreate) throws IOException {
		Path rootPath = Path.of(projectCreate.rootPath());
		String resolvedRootPath = rootPath.endsWith(CONFIGURATIONS_DIR) ? projectCreate.name() : CONFIGURATIONS_DIR + "/" + projectCreate.name();
		Path projectCreationPath = rootPath.resolve(resolvedRootPath);
		Path projectPath = fileSystemStorage.createProjectDirectory(projectCreationPath.toString());

		ClassPathResource resource = new ClassPathResource("templates/default-configuration.xml");
		String defaultXml = Files.readString(Path.of(resource.getURI()), StandardCharsets.UTF_8);
		fileSystemStorage.writeFile(
				projectPath
						.resolve("Configuration.xml")
						.toString(),
				defaultXml
		);

		return loadProjectAndCache(projectPath.toString());
	}

	public ConfigurationProject openProjectFromDisk(String path) throws IOException, ApiException {
		Path absolutePath = fileSystemStorage.toAbsolutePath(path);
		if (!Files.exists(absolutePath) || !Files.isDirectory(absolutePath)) {
			throw new ApiException("Project not found at: " + path, HttpStatus.NOT_FOUND);
		} else if (!absolutePath.endsWith(CONFIGURATIONS_DIR + "/" + absolutePath.getFileName())) {
			throw new ApiException("Provided path doesn't seem to be a singular configuration", HttpStatus.BAD_REQUEST);
		}
		return loadProjectAndCache(path);
	}

	public ConfigurationProject cloneAndOpenProject(String repoUrl, String localPath, String token) throws IOException {
		Path targetDir = fileSystemStorage.toAbsolutePath(localPath);

		if (Files.exists(targetDir)) {
			throw new IllegalArgumentException("Project already exists at: " + localPath);
		}

		try {
			CloneCommand cloneCommand = Git.cloneRepository().setURI(repoUrl).setDirectory(targetDir.toFile());

			CredentialsProvider credentials = GitCredentialHelper.resolveForUrl(repoUrl, token, fileSystemStorage.isLocalEnvironment());
			if (credentials != null) {
				cloneCommand.setCredentialsProvider(credentials);
			}

			try (Git git = cloneCommand.call()) {
				log.info("Cloned repository {} to {}", repoUrl, targetDir);
				GitService.hardenRepository(git.getRepository());
			}
		} catch (GitAPIException exception) {
			String msg = exception.getMessage() != null ? exception.getMessage().toLowerCase() : "";
			if (msg.contains("auth") || msg.contains("not permitted") || msg.contains("403") || msg.contains("401")) {
				throw new IllegalArgumentException("Clone failed — authentication error. Please provide a valid Personal Access Token (PAT)", exception);
			}
			throw new IllegalArgumentException("Clone failed: " + exception.getMessage(), exception);
		}

		ConfigurationProject configurationProject = loadProjectAndCache(targetDir.toString());
		if (token != null && !token.isBlank()) {
			configurationProject.setGitToken(token);
		}
		return configurationProject;
	}

	public void invalidateCache() {
		projectCache.clear();
	}

	public void invalidateProject(String projectName) {
		projectCache.entrySet().removeIf(entry -> entry.getValue().getName().equals(projectName));
	}

	public ConfigurationProject enableFilter(String projectName, String type)
			throws ApiException {
		ConfigurationProject configurationProject = getProject(projectName);
		configurationProject.enableFilter(parseFilterType(type));
		return configurationProject;
	}

	public ConfigurationProject disableFilter(String projectName, String type) throws ApiException {
		ConfigurationProject configurationProject = getProject(projectName);
		configurationProject.disableFilter(parseFilterType(type));
		return configurationProject;
	}

	public void exportProjectAsZip(String projectName, OutputStream outputStream) throws IOException, ApiException {
		ConfigurationProject configurationProject = getProject(projectName);
		Path projectPath = fileSystemStorage.toAbsolutePath(configurationProject.getRootPath());

		if (!Files.exists(projectPath) || !Files.isDirectory(projectPath)) {
			throw new ApiException("Project directory not found: " + projectName, HttpStatus.NOT_FOUND);
		}

		try (ZipOutputStream zos = new ZipOutputStream(outputStream);
		     Stream<Path> paths = Files.walk(projectPath)) {
			paths.filter(Files::isRegularFile).forEach(filePath -> {
				try {
					String entryName = projectPath.relativize(filePath).toString().replace("\\", "/");
					zos.putNextEntry(new ZipEntry(entryName));
					Files.copy(filePath, zos);
					zos.closeEntry();
				} catch (IOException exception) {
					throw new RuntimeException("Error zipping file: " + filePath, exception);
				}
			});
		}
	}

	public ConfigurationProject importProjectFromFiles(String projectName, List<MultipartFile> files, List<String> paths) throws IOException {
		Path projectDir = fileSystemStorage.createProjectDirectory(projectName);

		for (int i = 0; i < files.size(); i++) {
			String relativePath = paths.get(i).replace("\\", "/");

			if (relativePath.contains("..") || relativePath.startsWith("/")) {
				throw new SecurityException("Invalid file path: " + relativePath);
			}

			Path targetPath = projectDir.resolve(relativePath).normalize();
			if (!targetPath.startsWith(projectDir)) {
				throw new SecurityException("File path escapes project directory: " + relativePath);
			}

			Files.createDirectories(targetPath.getParent());
			files.get(i).transferTo(targetPath);
		}

		return loadProjectAndCache(projectDir.toString());
	}

	public ConfigurationProjectDTO toDto(ConfigurationProject configurationProject) {
		String cleanPath = fileSystemStorage.toRelativePath(configurationProject.getRootPath());

		// Dynamically fetch configurations from disk as the single source of truth
		List<String> filepaths = getConfigurationFilesDynamically(configurationProject.getRootPath());

		Path absolutePath = fileSystemStorage.toAbsolutePath(configurationProject.getRootPath());
		boolean isGitRepo = Files.isDirectory(absolutePath.resolve(".git"));

		boolean hasStoredToken =
				configurationProject.getGitToken() != null && !configurationProject.getGitToken().isBlank();

		return new ConfigurationProjectDTO(
				configurationProject.getName(),
				cleanPath,
				filepaths,
				configurationProject.getConfigurationSettings().getFilters(),
				isGitRepo,
				hasStoredToken
		);
	}

	private List<String> getConfigurationFilesDynamically(String projectRoot) {
		try {
			Path absolutePath = fileSystemStorage.toAbsolutePath(projectRoot);

			if (!Files.exists(absolutePath) || !Files.isDirectory(absolutePath)) {
				return List.of();
			}

			try (Stream<Path> stream = Files.walk(absolutePath)) {
				return stream.filter(Files::isRegularFile)
						.filter(path -> path.toString().toLowerCase().endsWith(".xml"))
						.map(path -> fileSystemStorage.toRelativePath(path.toString()))
						.toList();
			}
		} catch (IOException exception) {
			log.error("Failed to read configurations from disk for project {}", projectRoot, exception);
			return List.of();
		}
	}

	private FilterType parseFilterType(String type) {
		try {
			return FilterType.valueOf(type.toUpperCase());
		} catch (IllegalArgumentException exception) {
			throw new ApiException("Invalid filter type: " + type, HttpStatus.BAD_REQUEST);
		}
	}

	private ConfigurationProject loadProjectCached(String path) throws IOException {
		String cacheKey = fileSystemStorage.toAbsolutePath(path).toString();
		ConfigurationProject cached = projectCache.get(cacheKey);
		if (cached != null) {
			return cached;
		}
		return loadProjectAndCache(path);
	}

	private ConfigurationProject loadProjectAndCache(String path) throws IOException {
		ConfigurationProject configurationProject = loadProjectFromStorage(path);
		String cacheKey = fileSystemStorage.toAbsolutePath(path).toString();
		projectCache.put(cacheKey, configurationProject);
		return configurationProject;
	}

	private ConfigurationProject loadProjectFromStorage(String path) throws IOException {
		Path absolutePath = fileSystemStorage.toAbsolutePath(path);

		validatePathSafety(absolutePath);

		if (!Files.exists(absolutePath) || !Files.isDirectory(absolutePath)) {
			throw new IOException("Invalid project path: " + absolutePath);
		}

		return new ConfigurationProject(absolutePath.getFileName().toString(), absolutePath.toString());
	}
}
