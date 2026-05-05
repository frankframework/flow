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

import org.eclipse.jgit.api.CloneCommand;
import org.eclipse.jgit.api.Git;
import org.eclipse.jgit.api.errors.GitAPIException;
import org.eclipse.jgit.transport.CredentialsProvider;
import org.springframework.context.annotation.Lazy;
import org.springframework.core.io.ClassPathResource;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import lombok.extern.slf4j.Slf4j;

import org.frankframework.flow.exception.ApiException;
import org.frankframework.flow.filesystem.FileSystemStorage;
import org.frankframework.flow.filesystem.FilesystemEntry;
import org.frankframework.flow.git.GitCredentialHelper;
import org.frankframework.flow.git.GitService;
import org.frankframework.flow.projectsettings.FilterType;
import org.frankframework.flow.projectsettings.InvalidFilterTypeException;
import org.frankframework.flow.recentproject.RecentProject;
import org.frankframework.flow.recentproject.RecentProjectsService;

@Slf4j
@Service
public class ProjectService {
	private static final String CONFIGURATIONS_DIR = "src/main/configurations";

	private final FileSystemStorage fileSystemStorage;
	private final RecentProjectsService recentProjectsService;

	// Cache is now ONLY for lightweight Project state (Tokens, Filters), NOT files.
	private final Map<String, Project> projectCache = new ConcurrentHashMap<>();

	public ProjectService(FileSystemStorage fileSystemStorage, @Lazy RecentProjectsService recentProjectsService) {
		this.fileSystemStorage = fileSystemStorage;
		this.recentProjectsService = recentProjectsService;
	}

	private static void validatePathSafety(Path path) {
		String pathStr = path.toString();
		if (pathStr.contains("..")) {
			throw new SecurityException("Path traversal is not allowed: " + pathStr);
		}
	}

	public List<Project> getProjects() {
		if (fileSystemStorage.isLocalEnvironment()) {
			return getProjectsFromRecentList();
		}
		return getProjectsFromWorkspaceScan();
	}

	private List<Project> getProjectsFromRecentList() {
		List<Project> foundProjects = new ArrayList<>();
		List<RecentProject> recentProjects = recentProjectsService.getRecentProjects();

		for (RecentProject recent : recentProjects) {
			try {
				Project project = loadProjectCached(recent.rootPath());
				foundProjects.add(project);
			} catch (Exception _) {
				log.debug("Recent project no longer valid: {}", recent.rootPath());
			}
		}
		return foundProjects;
	}

	private List<Project> getProjectsFromWorkspaceScan() {
		List<Project> foundProjects = new ArrayList<>();
		List<FilesystemEntry> entries = fileSystemStorage.listRoots();

		for (FilesystemEntry entry : entries) {
			try {
				Project project = loadProjectCached(entry.path());
				foundProjects.add(project);
			} catch (Exception _) {
				// Not a valid project, skip
			}
		}
		return foundProjects;
	}

	public Project getProject(String name) throws ApiException {
		for (Project cached : projectCache.values()) {
			if (cached.getName().equals(name)) {
				return cached;
			}
		}

		return getProjects().stream()
				.filter(project -> project.getName().equals(name))
				.findFirst()
				.orElseThrow(() -> new ApiException("Project not found: " + name, HttpStatus.NOT_FOUND));
	}

	public Project createProjectOnDisk(ProjectCreateDTO projectCreate) throws IOException {
		Path projectCreationPath = Path.of(projectCreate.rootPath()).resolve(CONFIGURATIONS_DIR + "/" + projectCreate.name());
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

	public Project openProjectFromDisk(String path) throws IOException, ApiException {
		Path absolutePath = fileSystemStorage.toAbsolutePath(path);
		if (!Files.exists(absolutePath) || !Files.isDirectory(absolutePath)) {
			throw new ApiException("Project not found at: " + path, HttpStatus.NOT_FOUND);
		}
		return loadProjectAndCache(path);
	}

	public Project cloneAndOpenProject(String repoUrl, String localPath, String token) throws IOException {
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

		Project project = loadProjectAndCache(targetDir.toString());
		if (token != null && !token.isBlank()) {
			project.setGitToken(token);
		}
		return project;
	}

	public void invalidateCache() {
		projectCache.clear();
	}

	public void invalidateProject(String projectName) {
		projectCache.entrySet().removeIf(entry -> entry.getValue().getName().equals(projectName));
	}

	public Project enableFilter(String projectName, String type)
			throws ApiException {
		Project project = getProject(projectName);
		project.enableFilter(parseFilterType(type));
		return project;
	}

	public Project disableFilter(String projectName, String type) throws ApiException {
		Project project = getProject(projectName);
		project.disableFilter(parseFilterType(type));
		return project;
	}

	public void exportProjectAsZip(String projectName, OutputStream outputStream) throws IOException, ApiException {
		Project project = getProject(projectName);
		Path projectPath = fileSystemStorage.toAbsolutePath(project.getRootPath());

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

	public Project importProjectFromFiles(String projectName, List<MultipartFile> files, List<String> paths) throws IOException {
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

	public ProjectDTO toDto(Project project) {
		String cleanPath = fileSystemStorage.toRelativePath(project.getRootPath());

		// Dynamically fetch configurations from disk as the single source of truth
		List<String> filepaths = getConfigurationFilesDynamically(project.getRootPath());

		boolean isGitRepo = false;
		Path absolutePath = fileSystemStorage.toAbsolutePath(project.getRootPath());
		isGitRepo = Files.isDirectory(absolutePath.resolve(".git"));

		boolean hasStoredToken =
				project.getGitToken() != null && !project.getGitToken().isBlank();

		return new ProjectDTO(
				project.getName(),
				cleanPath,
				filepaths,
				project.getConfigurationSettings().getFilters(),
				isGitRepo,
				hasStoredToken
		);
	}

	private List<String> getConfigurationFilesDynamically(String projectRoot) {
		try {
			Path absolutePath = fileSystemStorage.toAbsolutePath(projectRoot);
//			Path configDir = absolutePath.resolve(CONFIGURATIONS_DIR).normalize();

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

	private FilterType parseFilterType(String type) throws InvalidFilterTypeException {
		try {
			return FilterType.valueOf(type.toUpperCase());
		} catch (IllegalArgumentException exception) {
			throw new InvalidFilterTypeException("Invalid filter type: " + type);
		}
	}

	private Project loadProjectCached(String path) throws IOException {
		String cacheKey = fileSystemStorage.toAbsolutePath(path).toString();
		Project cached = projectCache.get(cacheKey);
		if (cached != null) {
			return cached;
		}
		return loadProjectAndCache(path);
	}

	private Project loadProjectAndCache(String path) throws IOException {
		Project project = loadProjectFromStorage(path);
		String cacheKey = fileSystemStorage.toAbsolutePath(path).toString();
		projectCache.put(cacheKey, project);
		return project;
	}

	private Project loadProjectFromStorage(String path) throws IOException {
		Path absolutePath = fileSystemStorage.toAbsolutePath(path);

		validatePathSafety(absolutePath);

		if (!Files.exists(absolutePath) || !Files.isDirectory(absolutePath)) {
			throw new IOException("Invalid project path: " + absolutePath);
		}

		return new Project(absolutePath.getFileName().toString(), absolutePath.toString());
	}
}
