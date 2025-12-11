package org.frankframework.flow.project;

import org.frankframework.flow.configuration.AdapterNotFoundException;
import org.frankframework.flow.configuration.Configuration;
import org.frankframework.flow.configuration.ConfigurationNotFoundException;
import org.frankframework.flow.projectsettings.FilterType;
import org.frankframework.flow.projectsettings.InvalidFilterTypeException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.io.Resource;
import org.springframework.core.io.support.ResourcePatternResolver;
import org.springframework.stereotype.Service;
import org.w3c.dom.Document;
import org.w3c.dom.Element;
import org.w3c.dom.Node;
import org.w3c.dom.NodeList;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.StringWriter;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Optional;

import javax.xml.parsers.DocumentBuilder;
import javax.xml.parsers.DocumentBuilderFactory;
import javax.xml.transform.OutputKeys;
import javax.xml.transform.Transformer;
import javax.xml.transform.TransformerFactory;
import javax.xml.transform.dom.DOMSource;
import javax.xml.transform.stream.StreamResult;

@Service
public class ProjectService {

	private final ArrayList<Project> projects = new ArrayList<>();
	private static final String BASE_PATH = "classpath:project/";
	private static final int MIN_PARTS_LENGTH = 2;
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

	public boolean updateAdapter(String projectName, String configurationName, String adapterName,
			String newAdapterXml)
			throws ProjectNotFoundException, ConfigurationNotFoundException, AdapterNotFoundException {
		Project project = getProject(projectName);

		Optional<Configuration> configOptional = project.getConfigurations().stream()
				.filter(configuration -> configuration.getFilename().equals(configurationName))
				.findFirst();

		if (configOptional.isEmpty()) {
			System.err.println("Configuration not found: " + configurationName);
			throw new ConfigurationNotFoundException("Configuration not found: " + configurationName);
		}

		Configuration config = configOptional.get();

		try {
			// Parse configuration XML
			DocumentBuilderFactory factory = DocumentBuilderFactory.newInstance();
			factory.setIgnoringComments(true);
			factory.setNamespaceAware(true);
			DocumentBuilder builder = factory.newDocumentBuilder();
			Document configDoc = builder.parse(new ByteArrayInputStream(config.getXmlContent().getBytes()));

			// Parse new adapter XML
			Document newAdapterDoc = builder.parse(new ByteArrayInputStream(newAdapterXml.getBytes()));
			Node newAdapterNode = configDoc.importNode(newAdapterDoc.getDocumentElement(), true);

			// Locate existing adapter by name
			NodeList adapters = configDoc.getElementsByTagName("Adapter");
			boolean replaced = false;
			for (int i = 0; i < adapters.getLength(); i++) {
				Element adapterEl = (Element) adapters.item(i);
				if (adapterEl.getAttribute("name").equals(adapterName)) {
					Node parent = adapterEl.getParentNode();
					parent.replaceChild(newAdapterNode, adapterEl);
					replaced = true;
					break;
				}
			}

			if (!replaced) {
				throw new AdapterNotFoundException("Adapter not found: " + adapterName);
			}

			// Convert updated DOM back to string + some settings to make indentation
			// prettier and logical
			TransformerFactory tf = TransformerFactory.newInstance();
			Transformer transformer = tf.newTransformer();
			transformer.setOutputProperty(OutputKeys.INDENT, "yes");
			transformer.setOutputProperty("{http://xml.apache.org/xslt}indent-amount", "2");
			transformer.setOutputProperty(OutputKeys.METHOD, "xml");
			transformer.setOutputProperty(OutputKeys.OMIT_XML_DECLARATION, "yes");

			// Force consistent newlines
			transformer.setOutputProperty("{http://xml.apache.org/xalan}line-separator", "\n");
			StringWriter writer = new StringWriter();
			transformer.transform(new DOMSource(configDoc), new StreamResult(writer));

			String xmlOutput = writer.toString().replaceAll("(?m)^[ \t]*\r?\n", "");
			config.setXmlContent(xmlOutput);

			return true;

		} catch (AdapterNotFoundException | ConfigurationNotFoundException | ProjectNotFoundException e) {
			// rethrow explicitly so they bubble up to GlobalExceptionHandler
			throw e;
		} catch (Exception e) {
			// Other unexpected exceptions still return false
			System.err.println("Error updating adapter: " + e.getMessage());
			e.printStackTrace();
			return false;
		}
	}

	public Project addConfiguration(String projectName, String configurationName){
		Project project = getProject(projectName);
		
		Configuration configuration = new Configuration(configurationName);
		project.addConfiguration(configuration);
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
				if (parts.length < MIN_PARTS_LENGTH)
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
				String xmlContent = new String(resource.getInputStream().readAllBytes(), StandardCharsets.UTF_8);

				// Create Configuration and add to Project
				Configuration configuration = new Configuration(filename);
				configuration.setXmlContent(xmlContent);
				project.addConfiguration(configuration);
			}

		} catch (IOException e) {
			System.err.println("Error initializing projects: " + e.getMessage());
			e.printStackTrace();
		}
	}
}
