package org.frankframework.flow.project;

import java.util.ArrayList;
import java.util.Objects;
import lombok.Getter;
import lombok.Setter;
import org.frankframework.flow.configuration.ConfigurationFile;
import org.frankframework.flow.projectsettings.FilterType;
import org.frankframework.flow.projectsettings.ProjectSettings;

@Getter
@Setter
public class ConfigurationProject {
	private String name;
	private String rootPath;
	private String gitToken;
	private final ArrayList<ConfigurationFile> configurationFiles;
	private final ProjectSettings configurationSettings;

	public ConfigurationProject(String name, String rootPath) {
		this.name = name;
		this.rootPath = rootPath;
		this.configurationFiles = new ArrayList<>();
		this.configurationSettings = new ProjectSettings();
	}

	public void addConfiguration(ConfigurationFile configuration) {
		this.configurationFiles.add(configuration);
	}

	public boolean isFilterEnabled(FilterType type) {
		return configurationSettings.isEnabled(type);
	}

	public void enableFilter(FilterType type) {
		configurationSettings.setEnabled(type, true);
	}

	public void disableFilter(FilterType type) {
		configurationSettings.setEnabled(type, false);
	}

	// TODO figure out where this is used and if there isn't a better way to do this
	/* A project is equal to another project if it has the same name and rootpath */
	@Override
	public boolean equals(Object o) {
		if (this == o) return true; // same reference
		if (o == null || getClass() != o.getClass()) return false; // different class
		ConfigurationProject configurationProject = (ConfigurationProject) o;
		return Objects.equals(name, configurationProject.name) && Objects.equals(rootPath, configurationProject.rootPath);
	}

	@Override
	public int hashCode() {
		return Objects.hash(name, rootPath);
	}
}
