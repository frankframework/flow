package org.frankframework.flow.git;

public record GitPullResultDTO(boolean success, String message, boolean hasConflicts) {}
