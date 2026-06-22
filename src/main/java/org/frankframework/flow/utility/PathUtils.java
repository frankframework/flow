package org.frankframework.flow.utility;

import lombok.experimental.UtilityClass;

@UtilityClass
public class PathUtils {

	/**
	 * Normalizes OS-specific path separators to forward slashes.
	 * <p>
	 * Paths that originate from the filesystem (e.g. {@link java.nio.file.Path#toString()} on Windows)
	 * may contain backslashes. Every path that leaves the backend should be normalized once here so
	 * the rest of the backend and the frontend can rely on forward slashes consistently.
	 *
	 * @return the path with all backslashes replaced by forward slashes, or {@code null} if the input is {@code null}
	 */
	public static String toForwardSlash(String path) {
		return path == null ? null : path.replace('\\', '/');
	}
}
