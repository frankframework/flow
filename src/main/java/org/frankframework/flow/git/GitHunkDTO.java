package org.frankframework.flow.git;

public record GitHunkDTO(
        int index, String header, String content, int oldStart, int oldCount, int newStart, int newCount) {}
