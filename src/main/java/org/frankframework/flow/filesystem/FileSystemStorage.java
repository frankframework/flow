package org.frankframework.flow.filesystem;

import java.io.IOException;
import java.nio.file.NoSuchFileException;
import java.nio.file.Path;
import java.util.List;

public interface FileSystemStorage {
	boolean isLocalEnvironment();

	/**
	 * Returns root folders of environment.
	 */
	List<FilesystemEntry> listRoots();

	/**
	 * Returns what directory entails
	 */
	List<FilesystemEntry> listDirectory(String path) throws IOException;

	/**
	 * Returns entries for the given path. If the path does not exist, walks up to
	 * the nearest accessible ancestor. Falls back to roots if none found.
	 */
	default BrowseResult browse(String path) throws IOException {
		if (path == null || path.isBlank()) {
			return new BrowseResult("", listRoots());
		}
		return browseNearestAccessible(path);
	}

	String readFile(String path) throws IOException;

	String readFileType(String path) throws IOException;

	void writeFile(String path, String content) throws IOException;

	/**
	 * Makes new folder in directory
	 */
	Path createProjectDirectory(String path) throws IOException;

	Path toAbsolutePath(String path);

	/**
	 * Creates an empty file at the given path, including parent directories.
	 */
	Path createFile(String path) throws IOException;

	/**
	 * Deletes a file or directory (recursively if directory).
	 */
	void delete(String path) throws IOException;

	/**
	 * Renames/moves a file or directory from oldPath to newPath.
	 */
	Path rename(String oldPath, String newPath) throws IOException;

	/**
	 * Strips the workspace root prefix from a path.
	 * Local: returns the path unchanged.
	 * Cloud: returns the path relative to the user's workspace root.
	 */
	default String toRelativePath(String absolutePath) {
		return absolutePath;
	}


	private BrowseResult browseNearestAccessible(String path) throws IOException {
		try {
			return new BrowseResult(path, listDirectory(path));
		} catch (NoSuchFileException e) {
			String parent = parentPath(path);
			return parent.isEmpty() ? new BrowseResult("", listRoots()) : browseNearestAccessible(parent);
		}
	}

	private static String parentPath(String path) {
		String normalized = path.replace('/', '\\');
		if (normalized.matches("[a-zA-Z]:[/\\\\]?")) return "";
		int lastSep = normalized.lastIndexOf('\\');
		if (lastSep < 0) return "";
		String parent = normalized.substring(0, lastSep);
		if (parent.matches("[a-zA-Z]:")) return parent + "\\";
		return parent;
	}
}
