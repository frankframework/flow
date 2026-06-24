package org.frankframework.flow.noncanvaselement;

import java.util.Map;

public record NonCanvasElementDTO(String tagName, String name, int index, Map<String, String> attributes) {}
