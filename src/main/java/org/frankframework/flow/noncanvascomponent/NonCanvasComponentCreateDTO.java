package org.frankframework.flow.noncanvascomponent;

import java.util.Map;

public record NonCanvasComponentCreateDTO(String configurationPath, String tagName, Map<String, String> attributes) {}
