package org.frankframework.flow.git;

import java.util.List;

public record GitFileDiffDTO(String filePath, String oldContent, String newContent, List<GitHunkDTO> hunks) {}
