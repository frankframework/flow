package org.frankframework.flow.project;

import java.util.ArrayList;

public class Project {
	private String name;
	private ArrayList<String> filenames;

	public Project(String name) {
		this.name = name;
		this.filenames = new ArrayList<>();
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
}
