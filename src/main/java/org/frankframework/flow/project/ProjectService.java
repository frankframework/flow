package org.frankframework.flow.project;

import org.frankframework.flow.configuration.Configuration;
import org.frankframework.flow.configuration.ConfigurationNotFoundException;
import org.frankframework.flow.projectsettings.FilterType;
import org.frankframework.flow.projectsettings.InvalidFilterTypeException;
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

	public Project createProject(String name) {
		Project project = new Project(name);
		projects.add(project);
		return project;
	}

	public Project getProject(String name) throws ProjectNotFoundException {
		for (Project project : projects) {
			if (project.getName().equals(name)) {
				return project;
			}
		}

		throw new ProjectNotFoundException(String.format("Project with name: %s cannot be found", name));
	}

	public ArrayList<Project> getProjects() {
		return projects;
	}

	public boolean updateConfigurationXml(String projectName, String filename, String xmlContent)
			throws ProjectNotFoundException, ConfigurationNotFoundException {

		Project project = getProject(projectName);

		for (Configuration config : project.getConfigurations()) {
			if (config.getFilename().equals(filename)) {
				config.setXmlContent(xmlContent);
				return true;
			}
		}

		throw new ConfigurationNotFoundException(
				String.format("Configuration with filename: %s can not be found", filename));
	}

	public Project enableFilter(String projectName, String type)
            throws ProjectNotFoundException, InvalidFilterTypeException {

        Project project = getProject(projectName);

        FilterType filterType;
        try {
            filterType = FilterType.valueOf(type.toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new InvalidFilterTypeException(type);
        }

        project.enableFilter(filterType);
        return project;
    }

    public Project disableFilter(String projectName, String type)
            throws ProjectNotFoundException, InvalidFilterTypeException {

        Project project = getProject(projectName);

        FilterType filterType;
        try {
            filterType = FilterType.valueOf(type.toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new InvalidFilterTypeException(type);
        }

        project.disableFilter(filterType);
        return project;
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
				if (parts.length < 2)
					continue;

				String relativePath = parts[1]; // e.g. "testproject/Configuration1.xml"
				String projectName = relativePath.substring(0, relativePath.indexOf("/"));

				// Get or create the Project object
				Project project;
				try {
					project = getProject(projectName);
				} catch (ProjectNotFoundException e) {
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
