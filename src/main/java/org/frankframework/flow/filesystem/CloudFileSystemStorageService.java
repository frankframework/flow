package org.frankframework.flow.filesystem;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.attribute.FileTime;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.stream.Stream;
import lombok.extern.slf4j.Slf4j;
import org.frankframework.flow.security.UserWorkspaceContext;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;

@Service
@Profile("cloud")
@Slf4j
public class CloudFileSystemStorageService implements FileSystemStorage {
	@Value("${frankflow.workspace.root:/tmp/frankflow/workspace}")
	private String baseWorkspacePath;

	private final UserWorkspaceContext userContext;

	public CloudFileSystemStorageService(UserWorkspaceContext userContext) {
		this.userContext = userContext;
	}

	private Path getUserRootPath() {
		String workspaceId = userContext.getWorkspaceId();
		if (workspaceId == null) workspaceId = "anonymous";

		return Paths.get(baseWorkspacePath, workspaceId).toAbsolutePath().normalize();
	}

	private Path getOrCreateUserRoot() throws IOException {
		Path userRoot = getUserRootPath();

		if (!Files.exists(userRoot)) {
			Files.createDirectories(userRoot);
		}

		try {
			Files.setLastModifiedTime(userRoot, FileTime.from(Instant.now()));
		} catch (IOException e) {
			log.debug("Could not touch workspace dir", e);
		}

		return userRoot;
	}

	@Override
	public boolean isLocalEnvironment() {
		return false;
	}

	@Override
	public List<FilesystemEntry> listRoots() {
		try {
			return listDirectory("");
		} catch (IOException e) {
			log.warn("Error listing workspace root", e);
			return Collections.emptyList();
		}
	}

	@Override
	public List<FilesystemEntry> listDirectory(String path) throws IOException {
		Path dir = resolveSecurely(path);

		List<FilesystemEntry> entries = new ArrayList<>();

		try (Stream<Path> stream = Files.list(dir)) {
			stream.filter(Files::isDirectory).sorted().forEach(p -> {
				String relativePath = toRelativePath(p.toAbsolutePath().toString());
				boolean isProjectRoot = Files.isDirectory(p.resolve("src/main/configurations"));

				entries.add(new FilesystemEntry(p.getFileName().toString(), relativePath, "DIRECTORY", isProjectRoot));
			});
		}
		return entries;
	}

	@Override
	public String readFile(String path) throws IOException {
		return Files.readString(resolveSecurely(path), StandardCharsets.UTF_8);
	}

	@Override
	public void writeFile(String path, String content) throws IOException {
		Files.writeString(resolveSecurely(path), content, StandardCharsets.UTF_8);
	}

	@Override
	public Path createProjectDirectory(String path) throws IOException {
		Path projectDir = resolveSecurely(path);
		Files.createDirectories(projectDir);
		return projectDir;
	}

	@Override
	public Path toAbsolutePath(String path) throws IOException {
		return resolveSecurely(path);
	}

	@Override
	public String toRelativePath(String absolutePath) {
		String normalized = absolutePath.replace("\\", "/");
		String userRoot = getUserRootPath().toString().replace("\\", "/");

		if (normalized.startsWith(userRoot)) {
			String relative = normalized.substring(userRoot.length());

			while (relative.startsWith("/")) {
				relative = relative.substring(1);
			}
			return relative;
		}
		return normalized;
	}

	@Override
	public Path createFile(String path) throws IOException {
		return FileOperations.createFile(resolveSecurely(path));
	}

	@Override
	public void delete(String path) throws IOException {
		FileOperations.deleteRecursively(resolveSecurely(path));
	}

	@Override
	public Path rename(String oldPath, String newPath) throws IOException {
		return FileOperations.rename(resolveSecurely(oldPath), resolveSecurely(newPath));
	}

	private Path resolveSecurely(String path) throws IOException {
		Path root = getOrCreateUserRoot();

		if (path == null || path.isBlank() || path.equals("/") || path.equals("\\")) {
			return root;
		}

		Path candidate = Paths.get(path).toAbsolutePath().normalize();
		if (candidate.startsWith(root)) {
			return candidate;
		}

		String cleanPath = path;
		while (cleanPath.startsWith("/") || cleanPath.startsWith("\\")) {
			cleanPath = cleanPath.substring(1);
		}

		if (cleanPath.isBlank()) {
			return root;
		}

		Path resolved = root.resolve(cleanPath).normalize();

		if (!resolved.startsWith(root)) {
			throw new SecurityException("Access denied: " + path);
		}
		return resolved;
	}
}
