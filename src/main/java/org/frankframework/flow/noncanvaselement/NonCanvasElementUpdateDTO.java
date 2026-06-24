package org.frankframework.flow.noncanvaselement;

import java.util.Map;

public record NonCanvasElementUpdateDTO(String configurationPath, String tagName, int index, Map<String, String> attributes) {}
