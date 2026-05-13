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
			return new BrowseResult("", "", listRoots());
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
			return new BrowseResult(path, getParentPath(path), listDirectory(path));
		} catch (NoSuchFileException e) {
			String parent = getParentPath(path);
			return parent.isEmpty() ? new BrowseResult("", "", listRoots()) : browseNearestAccessible(parent);
		}
	}

	private static String getParentPath(String path) {
		if (path == null || path.isEmpty()) {
			return "";
		}

		if (path.startsWith("/")) {
			return getUnixParent(path);
		}

		if (path.matches("^[a-zA-Z]:.*")) {
			return getWindowsParent(path);
		}

		if (isWindows()) {
			return getWindowsParent(path);
		} else {
			return getUnixParent(path);
		}
	}

	private static String getUnixParent(String path) {
		if (path.length() > 1 && path.endsWith("/")) {
			path = path.substring(0, path.length() - 1);
		}

		if (path.equals("/")) return "";

		int lastSep = path.lastIndexOf('/');
		if (lastSep < 0) return "";
		if (lastSep == 0) return "/";

		return path.substring(0, lastSep);
	}

	private static String getWindowsParent(String path) {
		String normalized = path.replace('/', '\\');

		if (normalized.matches("^[a-zA-Z]:\\\\?$")) return "";

		int lastSep = normalized.lastIndexOf('\\');
		if (lastSep < 0) return "";

		String parent = normalized.substring(0, lastSep);

		if (parent.matches("^[a-zA-Z]:$")) return parent + "\\";

		return parent;
	}

	private static boolean isWindows() {
		String os = System.getProperty("os.name").toLowerCase();
		return os.contains("win");
	}
}
