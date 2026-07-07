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
import java.util.zip.ZipInputStream;
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
import org.frankframework.flow.utility.PathUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Lazy;
import org.springframework.core.io.ClassPathResource;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

@Log4j2
@Service
public class ConfigurationProjectService {
	private static final long BYTES_PER_MB = 1024L * 1024;
	private static final int IMPORT_BUFFER_SIZE = 8192;

	private final FileSystemStorage fileSystemStorage;
	private final RecentProjectsService recentProjectsService;

	private final long maxUncompressedImportBytes;
	private final Map<String, ConfigurationProject> projectCache = new ConcurrentHashMap<>();

	@Autowired
	public ConfigurationProjectService(FileSystemStorage fileSystemStorage, @Lazy RecentProjectsService recentProjectsService, ImportProperties importProperties) {
		this(fileSystemStorage, recentProjectsService, importProperties.maxUploadSize().toBytes());
	}

	ConfigurationProjectService(FileSystemStorage fileSystemStorage, RecentProjectsService recentProjectsService, long maxUncompressedImportBytes) {
		this.fileSystemStorage = fileSystemStorage;
		this.recentProjectsService = recentProjectsService;
		this.maxUncompressedImportBytes = maxUncompressedImportBytes;
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
				log.debug("Recent project is no longer valid: {}", recent.rootPath());
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
				.orElseThrow(() -> new ApiException("Project \"" + name +"\" not found", HttpStatus.NOT_FOUND));
	}

	public ConfigurationProject createProjectOnDisk(ConfigurationProjectCreateDTO projectCreate) throws IOException {
		Path rootPath = Path.of(projectCreate.rootPath());
		Path projectCreationPath = rootPath.resolve(projectCreate.name());

		if (Files.exists(projectCreationPath)) {
			throw new ApiException("Project already exists at " + projectCreationPath, HttpStatus.NOT_FOUND);
		}
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
			throw new ApiException("Project not found at \"" + path + "\"", HttpStatus.NOT_FOUND);
		} else if (!absolutePath.resolve("Configuration.xml").toFile().exists()) {
			throw new ApiException("Project doesn't seem to be a valid configuration or Configuration.xml might be missing", HttpStatus.BAD_REQUEST);
		}
		return loadProjectAndCache(path);
	}

	public ConfigurationProject cloneAndOpenProject(String repoUrl, String localPath, String token) throws IOException {
		Path targetDir = fileSystemStorage.toAbsolutePath(localPath);

		if (Files.exists(targetDir)) {
			throw new ApiException("Project already exists at \"" + localPath + "\"", HttpStatus.CONFLICT);
		}

		CloneCommand cloneCommand = Git.cloneRepository().setURI(repoUrl).setDirectory(targetDir.toFile());

		CredentialsProvider credentials = GitCredentialHelper.resolveForUrl(repoUrl, token, fileSystemStorage.isLocalEnvironment());
		if (credentials != null) {
			cloneCommand.setCredentialsProvider(credentials);
		}

		try (Git git = cloneCommand.call()) {
			log.info("Cloned repository {} to {}", repoUrl, targetDir);
			GitService.hardenRepository(git.getRepository());
		} catch (GitAPIException exception) {
			String msg = exception.getMessage() != null ? exception.getMessage().toLowerCase() : "";
			if (msg.contains("auth") || msg.contains("not permitted") || msg.contains("403") || msg.contains("401")) {
				throw new IllegalArgumentException("Cloning authentication error. Please provide a valid Personal Access Token (PAT)", exception);
			}
			throw new ApiException("Cloning failed", exception);
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

	public ConfigurationProject enableFilter(String projectName, String type) throws ApiException {
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

		try (ZipOutputStream zipOutputStream = new ZipOutputStream(outputStream);
			Stream<Path> paths = Files.walk(projectPath)) {
			paths.filter(Files::isRegularFile).forEach(filePath -> {
				try {
					String entryName = PathUtils.toForwardSlash(projectPath.relativize(filePath).toString());
					zipOutputStream.putNextEntry(new ZipEntry(entryName));
					Files.copy(filePath, zipOutputStream);
					zipOutputStream.closeEntry();
				} catch (IOException exception) {
					throw new RuntimeException("Error zipping file: " + filePath, exception);
				}
			});
		}
	}

	public ConfigurationProject importProjectFromZip(String projectName, MultipartFile zipFile) throws IOException {
		log.info("Importing project \"{}\" from uploaded archive \"{}\" ({} bytes)",
				projectName, zipFile.getOriginalFilename(), zipFile.getSize());

		Path projectDir = fileSystemStorage.createProjectDirectory(projectName);

		int fileCount = 0;
		long totalUncompressedBytes = 0;
		try (ZipInputStream zipInputStream = new ZipInputStream(zipFile.getInputStream())) {
			ZipEntry entry;
			while ((entry = zipInputStream.getNextEntry()) != null) {
				String relativePath = PathUtils.toForwardSlash(entry.getName());

				if (relativePath.contains("..") || relativePath.startsWith("/")) {
					log.warn("Rejected import of project \"{}\": invalid file path \"{}\"", projectName, relativePath);
					throw new SecurityException("Invalid file path: " + relativePath);
				}

				Path targetPath = projectDir.resolve(relativePath).normalize();
				if (!targetPath.startsWith(projectDir)) {
					log.warn("Rejected import of project \"{}\": file path escapes project directory \"{}\"", projectName, relativePath);
					throw new SecurityException("File path escapes project directory: " + relativePath);
				}

				if (entry.isDirectory()) {
					Files.createDirectories(targetPath);
				} else {
					Files.createDirectories(targetPath.getParent());
					totalUncompressedBytes += copyZipEntry(zipInputStream, targetPath, totalUncompressedBytes);
					fileCount++;
					log.trace("Extracted import entry \"{}\" for project \"{}\"", relativePath, projectName);
				}

				zipInputStream.closeEntry();
			}
		} catch (IOException exception) {
			log.error("Failed to import project \"{}\" from uploaded archive", projectName, exception);
			throw exception;
		}

		log.info("Imported project \"{}\": extracted {} files ({} uncompressed bytes) to {}",
				projectName, fileCount, totalUncompressedBytes, projectDir);

		return loadProjectAndCache(projectDir.toString());
	}

	private long copyZipEntry(ZipInputStream zipInputStream, Path targetPath, long bytesWrittenSoFar) throws IOException {
		long entryBytes = 0;
		byte[] buffer = new byte[IMPORT_BUFFER_SIZE];
		try (OutputStream out = Files.newOutputStream(targetPath)) {
			int read;
			while ((read = zipInputStream.read(buffer)) != -1) {
				entryBytes += read;
				if (bytesWrittenSoFar + entryBytes > maxUncompressedImportBytes) {
					long limitMb = maxUncompressedImportBytes / BYTES_PER_MB;
					log.warn("Rejected import: decompressed size exceeds the maximum allowed {} MB", limitMb);
					throw new ApiException("Imported project exceeds the maximum allowed size of " + limitMb + " MB", HttpStatus.PAYLOAD_TOO_LARGE);
				}
				out.write(buffer, 0, read);
			}
		}
		return entryBytes;
	}

	public ConfigurationProjectDTO toDto(ConfigurationProject configurationProject) {
		String cleanPath = fileSystemStorage.toRelativePath(configurationProject.getRootPath());

		// Dynamically fetch configurations from disk as the single source of truth
		List<String> filepaths = getConfigurationFilesDynamically(configurationProject.getRootPath());

		Path absolutePath = fileSystemStorage.toAbsolutePath(configurationProject.getRootPath());
		boolean isGitRepo = Files.isDirectory(absolutePath.resolve(".git"));

		boolean hasStoredToken = configurationProject.getGitToken() != null && !configurationProject.getGitToken().isBlank();

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
		Path absolutePath = fileSystemStorage.toAbsolutePath(projectRoot);

		if (!Files.exists(absolutePath) || !Files.isDirectory(absolutePath)) {
			return List.of();
		}

		try (Stream<Path> stream = Files.walk(absolutePath)) {
			return stream.filter(Files::isRegularFile)
					.filter(path -> path.toString().toLowerCase().endsWith(".xml"))
					.map(path -> fileSystemStorage.toRelativePath(path.toString()))
					.toList();
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
