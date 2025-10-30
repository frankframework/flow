package org.frankframework.flow.project;

import org.frankframework.flow.configuration.Configuration;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.io.Resource;
import org.springframework.core.io.support.ResourcePatternResolver;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.util.ArrayList;

@Service
public class ProjectService {

	private final ArrayList<Project> projects = new ArrayList<>();
	private static final String BASE_PATH = "classpath:project/";
	private final ResourcePatternResolver resolver;

	@Autowired
	public ProjectService(ResourcePatternResolver resolver) {
		this.resolver = resolver;
		initiateProjects();
	}

	public Project createProject(String name){
		Project project = new Project(name);
		projects.add(project);
		return project;
	}

	public Project getProject(String name){
		for(Project project : projects){
			if(project.getName().equals(name)){
				return project;
			}
		}
		return null;
	}

	public ArrayList<Project> getProjects(){
		return projects;
	}

	public boolean updateConfigurationXml(String projectName, String filename, String xmlContent) {
		Project project = getProject(projectName);
		if (project == null) {
			return false; // Project not found
		}

		for (Configuration config : project.getConfigurations()) {
			if (config.getFilename().equals(filename)) {
				config.setXmlContent(xmlContent);
				return true; // Successfully updated
			}
		}

		return false; // Configuration not found
	}

	/**
	 * Dynamically scan all project folders under /resources/project/
	 * Each subdirectory = a project
	 * Each .xml file = a configuration
	 */
	private void initiateProjects() {
		try {
			// Find all XML files recursively under /project/
			Resource[] xmlResources = resolver.getResources(BASE_PATH + "**/*.xml");

			for (Resource resource : xmlResources) {
				String path = resource.getURI().toString();

				// Example path: file:/.../resources/project/testproject/Configuration1.xml
				// Extract the project name between "project/" and the next "/"
				String[] parts = path.split("/project/");
				if (parts.length < 2) continue;

				String relativePath = parts[1]; // e.g. "testproject/Configuration1.xml"
				String projectName = relativePath.substring(0, relativePath.indexOf("/"));

				// Get or create the Project object
				Project project = getProject(projectName);
				if (project == null) {
					project = createProject(projectName);
				}

				// Load XML content
				String filename = resource.getFilename();
				String xmlContent = Files.readString(resource.getFile().toPath(), StandardCharsets.UTF_8);

				// Create Configuration and add to Project
				Configuration configuration = new Configuration(filename);
				configuration.setXmlContent(xmlContent);
				project.addConfiguration(configuration);
			}

			System.out.println("Loaded " + projects.size() + " projects successfully.");
		} catch (IOException e) {
			System.err.println("Error initializing projects: " + e.getMessage());
			e.printStackTrace();
		}
	}
}
