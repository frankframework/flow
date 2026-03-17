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
import lombok.extern.slf4j.Slf4j;
import org.eclipse.jgit.api.CloneCommand;
import org.eclipse.jgit.api.Git;
import org.eclipse.jgit.api.errors.GitAPIException;
import org.eclipse.jgit.transport.CredentialsProvider;
import org.frankframework.flow.filesystem.FileSystemStorage;
import org.frankframework.flow.filesystem.FilesystemEntry;
import org.frankframework.flow.git.GitCredentialHelper;
import org.frankframework.flow.projectsettings.FilterType;
import org.frankframework.flow.projectsettings.InvalidFilterTypeException;
import org.frankframework.flow.recentproject.RecentProject;
import org.frankframework.flow.recentproject.RecentProjectsService;
import org.springframework.context.annotation.Lazy;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

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
				Project p = loadProjectCached(recent.rootPath());
				foundProjects.add(p);
			} catch (Exception e) {
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
				Project p = loadProjectCached(entry.path());
				foundProjects.add(p);
			} catch (Exception e) {
				// Not a valid project, skip
			}
		}
		return foundProjects;
	}

	public Project getProject(String name) throws ProjectNotFoundException {
		for (Project cached : projectCache.values()) {
			if (cached.getName().equals(name)) {
				return cached;
			}
		}

		return getProjects().stream()
				.filter(p -> p.getName().equals(name))
				.findFirst()
				.orElseThrow(() -> new ProjectNotFoundException("Project not found: " + name));
	}

	public Project createProjectOnDisk(String path) throws IOException {
		Path projectPath = fileSystemStorage.createProjectDirectory(path);
		Files.createDirectories(projectPath.resolve(CONFIGURATIONS_DIR));

		ClassPathResource resource = new ClassPathResource("templates/default-configuration.xml");
		String defaultXml = Files.readString(Path.of(resource.getURI()), StandardCharsets.UTF_8);
		fileSystemStorage.writeFile(
				projectPath
						.resolve(CONFIGURATIONS_DIR)
						.resolve("Configuration.xml")
						.toString(),
				defaultXml);

		return loadProjectAndCache(projectPath.toString());
	}

	public Project openProjectFromDisk(String path) throws IOException, ProjectNotFoundException {
		Path absPath = fileSystemStorage.toAbsolutePath(path);
		if (!Files.exists(absPath) || !Files.isDirectory(absPath)) {
			throw new ProjectNotFoundException("Project not found at: " + path);
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

			CredentialsProvider credentials =
					GitCredentialHelper.resolveForUrl(repoUrl, token, fileSystemStorage.isLocalEnvironment());
			if (credentials != null) {
				cloneCommand.setCredentialsProvider(credentials);
			}

			try (Git git = cloneCommand.call()) {
				log.info("Cloned repository {} to {}", repoUrl, targetDir);
			}
		} catch (GitAPIException e) {
			String msg = e.getMessage() != null ? e.getMessage().toLowerCase() : "";
			if (msg.contains("auth") || msg.contains("not permitted") || msg.contains("403") || msg.contains("401")) {
				throw new IllegalArgumentException(
						"Clone failed — authentication error. Please provide a valid Personal Access Token (PAT)", e);
			}
			throw new IllegalArgumentException("Clone failed: " + e.getMessage(), e);
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
		projectCache.entrySet().removeIf(e -> e.getValue().getName().equals(projectName));
	}

	public Project enableFilter(String projectName, String type)
			throws ProjectNotFoundException, InvalidFilterTypeException {
		Project project = getProject(projectName);
		project.enableFilter(parseFilterType(type));
		return project;
	}

	public Project disableFilter(String projectName, String type)
			throws ProjectNotFoundException, InvalidFilterTypeException {
		Project project = getProject(projectName);
		project.disableFilter(parseFilterType(type));
		return project;
	}

	public void exportProjectAsZip(String projectName, OutputStream outputStream)
			throws IOException, ProjectNotFoundException {
		Project project = getProject(projectName);
		Path projectPath = fileSystemStorage.toAbsolutePath(project.getRootPath());

		if (!Files.exists(projectPath) || !Files.isDirectory(projectPath)) {
			throw new ProjectNotFoundException("Project directory not found: " + projectName);
		}

		try (ZipOutputStream zos = new ZipOutputStream(outputStream);
				Stream<Path> paths = Files.walk(projectPath)) {
			paths.filter(Files::isRegularFile).forEach(filePath -> {
				try {
					String entryName =
							projectPath.relativize(filePath).toString().replace("\\", "/");
					zos.putNextEntry(new ZipEntry(entryName));
					Files.copy(filePath, zos);
					zos.closeEntry();
				} catch (IOException e) {
					throw new RuntimeException("Error zipping file: " + filePath, e);
				}
			});
		}
	}

	public Project importProjectFromFiles(String projectName, List<MultipartFile> files, List<String> paths)
			throws IOException {
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
		try {
			Path absPath = fileSystemStorage.toAbsolutePath(project.getRootPath());
			isGitRepo = Files.isDirectory(absPath.resolve(".git"));
		} catch (IOException e) {
			log.info("Could not determine if project is a git repository: {}", e.getMessage());
		}

		boolean hasStoredToken =
				project.getGitToken() != null && !project.getGitToken().isBlank();

		return new ProjectDTO(
				project.getName(),
				cleanPath,
				filepaths,
				project.getProjectSettings().getFilters(),
				isGitRepo,
				hasStoredToken);
	}

	private List<String> getConfigurationFilesDynamically(String projectRoot) {
		try {
			Path absPath = fileSystemStorage.toAbsolutePath(projectRoot);
			Path configDir = absPath.resolve(CONFIGURATIONS_DIR).normalize();

			if (!Files.exists(configDir) || !Files.isDirectory(configDir)) {
				return List.of();
			}

			try (Stream<Path> stream = Files.walk(configDir)) {
				return stream.filter(Files::isRegularFile)
						.filter(p -> p.toString().toLowerCase().endsWith(".xml"))
						.map(p -> fileSystemStorage.toRelativePath(p.toString()))
						.toList();
			}
		} catch (IOException e) {
			log.error("Failed to read configurations from disk for project {}", projectRoot, e);
			return List.of();
		}
	}

	private FilterType parseFilterType(String type) throws InvalidFilterTypeException {
		try {
			return FilterType.valueOf(type.toUpperCase());
		} catch (IllegalArgumentException e) {
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
		Path absPath = fileSystemStorage.toAbsolutePath(path);

		validatePathSafety(absPath);

		if (!Files.exists(absPath) || !Files.isDirectory(absPath)) {
			throw new IOException("Invalid project path: " + absPath);
		}

		return new Project(absPath.getFileName().toString(), absPath.toString());
	}

	private static void validatePathSafety(Path path) {
		String pathStr = path.toString();
		if (pathStr.contains("..")) {
			throw new SecurityException("Path traversal is not allowed: " + pathStr);
		}
	}
}
