package org.frankframework.flow.git;

public record GitCommitResultDTO(String commitId, String message, String author, long timestamp) {}
