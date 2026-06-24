package org.frankframework.flow.noncanvaselement;

import java.util.Map;

public record NonCanvasElementCreateDTO(String configurationPath, String tagName, Map<String, String> attributes) {}
