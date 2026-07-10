package org.frankframework.flow.noncanvascomponent;

import java.util.Map;

public record NonCanvasComponentDTO(String tagName, String name, int index, Map<String, String> attributes) {}
