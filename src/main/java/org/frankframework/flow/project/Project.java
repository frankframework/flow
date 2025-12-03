package org.frankframework.flow.project;

import org.frankframework.flow.configuration.Configuration;

import java.util.ArrayList;

import org.frankframework.flow.projectsettings.FilterType;
import org.frankframework.flow.projectsettings.ProjectSettings;

public class Project {
	private String name;
	private ArrayList<Configuration> configurations;
	private ProjectSettings projectSettings;

	public Project(String name) {
		this.name = name;
		this.configurations = new ArrayList<>();
		this.projectSettings = new ProjectSettings();
	}

	public String getName() {
		return name;
	}

	public void setName(String name) {
		this.name = name;
	}

	public ArrayList<Configuration> getConfigurations() {
		return configurations;
	}

	public void addConfiguration(Configuration configuration) {
		this.configurations.add(configuration);
	}

	public void setConfigurationXml(String filepath, String xmlContent) {
		for (Configuration c : this.configurations) {
			if (c.getFilepath().equals(filepath)) {
				c.setXmlContent(xmlContent);
				return;
			}
		}
	}

	public ProjectSettings getProjectSettings() {
		return this.projectSettings;
	}

	public boolean isFilterEnabled(FilterType type) {
		return projectSettings.isEnabled(type);
	}

	public void enableFilter(FilterType type) {
		projectSettings.setEnabled(type, true);
	}

	public void disableFilter(FilterType type) {
		projectSettings.setEnabled(type, false);
	}

	public void clearConfigurations() {
		configurations.clear();
	}
}
