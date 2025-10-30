package org.frankframework.flow.project;

import org.frankframework.flow.configuration.Configuration;

import java.util.ArrayList;

public class Project {
	private String name;
	private ArrayList<Configuration> configurations;

	public Project(String name) {
		this.name = name;
		this.configurations = new ArrayList<>();
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

	public void setConfigurationXml(String filename, String xmlContent) {
		for (Configuration c : this.configurations) {
			if (c.getFilename().equals(filename)) {
				c.setXmlContent(xmlContent);
				return;
			}
		}
	}
}
