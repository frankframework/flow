package org.frankframework.flow.project;

import java.util.ArrayList;

import org.frankframework.flow.projectsettings.FilterType;
import org.frankframework.flow.projectsettings.ProjectSettings;

public class Project {
	private String name;
	private ArrayList<String> filenames;
	private ProjectSettings projectSettings;

	public Project(String name) {
		this.name = name;
		this.filenames = new ArrayList<>();
		this.projectSettings = new ProjectSettings();
	}

	public String getName() {
		return name;
	}
	public void setName(String name) {
		this.name = name;
	}

	public ArrayList<String> getFilenames() {
		return filenames;
	}

	public void addFilenames(String filename) {
		this.filenames.add(filename);
	}

	public ProjectSettings getProjectSettings(){
		return this.projectSettings;
	}

	public void toggleFilter(FilterType type) {
		projectSettings.toggleEnabled(type);
	}

	public boolean isFilterEnabled(FilterType type) {
		return projectSettings.isEnabled(type);
	}
}
