package org.frankframework.flow.project;

import java.util.List;
import java.util.Map;
import org.frankframework.flow.projectsettings.FilterType;

public record ProjectDTO(String name, String rootPath, List<String> filepaths, Map<FilterType, Boolean> filters) {}
