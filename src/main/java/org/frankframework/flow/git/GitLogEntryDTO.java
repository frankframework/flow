package org.frankframework.flow.git;

public record GitLogEntryDTO(String commitId, String shortId, String message, String author, long timestamp) {}
