package org.frankframework.flow.utility;

import lombok.experimental.UtilityClass;

@UtilityClass
public class PathUtils {

	/**
	 * Normalizes OS-specific path separators to forward slashes.
	 * Every path that leaves the backend should be normalized once here so
	 * the rest of the backend and the frontend can rely on forward slashes consistently.
	 *
	 * @return the path with all backslashes replaced by forward slashes
	 */
	public static String toForwardSlash(String path) {
		return path == null ? null : path.replace('\\', '/');
	}
}
