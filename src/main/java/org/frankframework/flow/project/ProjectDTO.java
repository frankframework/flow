package org.frankframework.flow.project;

import java.util.List;
import java.util.Map;

import org.frankframework.flow.projectsettings.FilterType;

public class ProjectDTO {
	public String name;
	public List<String> filenames;
	public Map<FilterType, Boolean> filters;
}
