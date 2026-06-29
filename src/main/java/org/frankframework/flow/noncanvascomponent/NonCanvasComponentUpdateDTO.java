package org.frankframework.flow.noncanvascomponent;

import java.util.Map;

public record NonCanvasComponentUpdateDTO(String configurationPath, String tagName, int index, Map<String, String> attributes) {}
