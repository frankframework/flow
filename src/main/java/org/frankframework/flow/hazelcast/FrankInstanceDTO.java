package org.frankframework.flow.hazelcast;

import java.util.List;

public record FrankInstanceDTO(String name, String id, List<String> projectPaths, boolean local) {}
