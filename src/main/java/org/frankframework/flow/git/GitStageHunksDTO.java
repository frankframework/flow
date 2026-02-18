package org.frankframework.flow.git;

import java.util.List;

public record GitStageHunksDTO(String filePath, List<Integer> hunkIndices) {}
