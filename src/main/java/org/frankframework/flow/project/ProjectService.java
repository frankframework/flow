package org.frankframework.flow.project;

import org.frankframework.flow.projectsettings.FilterType;
import org.frankframework.flow.configuration.Configuration;
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
import java.nio.file.Files;
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

	public Project getProject(String name) {
		for (Project project : projects) {
			if (project.getName().equals(name)) {
				return project;
			}
		}
		return null;
	}

	public ArrayList<Project> getProjects() {
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

	public boolean updateAdapter(String projectName, String configurationName, String adapterName,
			String newAdapterXml) {
		Project project = getProject(projectName);
		if (project == null) {
			System.err.println("Project not found: " + projectName);
			return false;
		}

		Optional<Configuration> configOptional = project.getConfigurations().stream()
				.filter(configuration -> configuration.getFilename().equals(configurationName))
				.findFirst();

		if (configOptional.isEmpty()) {
			System.err.println("Configuration not found: " + configurationName);
			return false;
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
				System.err.println("Adapter not found: " + adapterName);
				return false;
			}

			// Convert updated DOM back to string + some settings to make indentation prettier and logical
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

		} catch (Exception e) {
			System.err.println("Error updating adapter: " + e.getMessage());
			e.printStackTrace();
			return false;
		}
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

		} catch (IOException e) {
			System.err.println("Error initializing projects: " + e.getMessage());
			e.printStackTrace();
		}
	}
}
