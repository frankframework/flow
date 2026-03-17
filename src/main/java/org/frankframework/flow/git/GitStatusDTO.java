package org.frankframework.flow.git;

import java.util.List;

public record GitStatusDTO(
		List<String> staged,
		List<String> modified,
		List<String> untracked,
		List<String> conflicting,
		String branch,
		int ahead,
		int behind,
		boolean hasRemote,
		boolean isLocal) {}
