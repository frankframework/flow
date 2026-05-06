package org.frankframework.flow.filesystem;

import java.util.List;

public record BrowseResult(String resolvedPath, List<FilesystemEntry> entries) {}
