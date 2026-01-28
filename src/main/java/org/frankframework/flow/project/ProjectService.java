package org.frankframework.flow.project;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.Optional;
import lombok.Getter;
import org.frankframework.flow.adapter.AdapterNotFoundException;
import org.frankframework.flow.configuration.Configuration;
import org.frankframework.flow.configuration.ConfigurationNotFoundException;
import org.frankframework.flow.projectsettings.FilterType;
import org.frankframework.flow.projectsettings.InvalidFilterTypeException;
import org.frankframework.flow.utility.XmlAdapterUtils;
import org.frankframework.flow.utility.XmlSecurityUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.support.ResourcePatternResolver;
import org.springframework.stereotype.Service;
import org.w3c.dom.Document;
import org.w3c.dom.Node;
import org.xml.sax.SAXParseException;

@Service
public class ProjectService {

    @Getter
    private final ArrayList<Project> projects = new ArrayList<>();

    private static final String BASE_PATH = "classpath:project/";
    private static final String DEFAULT_PROJECT_ROOT = "src/main/resources/project";
    private static final int MIN_PARTS_LENGTH = 2;
    private final ResourcePatternResolver resolver;
    private final Path projectsRoot;

    @Autowired
    public ProjectService(ResourcePatternResolver resolver, @Value("${app.project.root:}") String rootPath) {
        this.resolver = resolver;
        this.projectsRoot = resolveProjectRoot(rootPath);
        initiateProjects();
    }

    private Path resolveProjectRoot(String rootPath) {
        if (rootPath == null || rootPath.isBlank()) {
            return Paths.get(DEFAULT_PROJECT_ROOT).toAbsolutePath().normalize();
        }
        return Paths.get(rootPath).toAbsolutePath().normalize();
    }

    public Path getProjectsRoot() {
        return projectsRoot;
    }

    public Project createProject(String name, String rootPath) {
        Project project = new Project(name, rootPath);
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

    public Project addConfigurations(String projectName, ArrayList<String> configurationPaths)
            throws ProjectNotFoundException {
        Project project = getProject(projectName);

        for (String path : configurationPaths) {
            Configuration config = new Configuration(path);
            project.addConfiguration(config);
        }

        return project;
    }

    public boolean updateConfigurationXml(String projectName, String filepath, String xmlContent)
            throws ProjectNotFoundException, ConfigurationNotFoundException {

        Project project = getProject(projectName);

        for (Configuration config : project.getConfigurations()) {
            if (config.getFilepath().equals(filepath)) {
                config.setXmlContent(xmlContent);
                return true;
            }
        }

        throw new ConfigurationNotFoundException(
                String.format("Configuration with filepath: %s can not be found", filepath));
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
            throw new InvalidFilterTypeException("Invalid filter type: " + type);
        }

        project.disableFilter(filterType);
        return project;
    }

    public boolean updateAdapter(String projectName, String configurationPath, String adapterName, String newAdapterXml)
            throws ProjectNotFoundException, ConfigurationNotFoundException, AdapterNotFoundException {
        Project project = getProject(projectName);

        Optional<Configuration> configOptional = project.getConfigurations().stream()
                .filter(configuration -> configuration.getFilepath().equals(configurationPath))
                .findFirst();

        if (configOptional.isEmpty()) {
            System.err.println("Configuration not found: " + configurationPath);
            throw new ConfigurationNotFoundException("Configuration not found: " + configurationPath);
        }

        Configuration config = configOptional.get();

        try {
            // Parse existing config
            Document configDoc = XmlSecurityUtils.createSecureDocumentBuilder()
                    .parse(new ByteArrayInputStream(config.getXmlContent().getBytes(StandardCharsets.UTF_8)));

            // Parse new adapter
            Document newAdapterDoc = XmlSecurityUtils.createSecureDocumentBuilder()
                    .parse(new ByteArrayInputStream(newAdapterXml.getBytes(StandardCharsets.UTF_8)));

            Node newAdapterNode = configDoc.importNode(newAdapterDoc.getDocumentElement(), true);

            if (!XmlAdapterUtils.replaceAdapterInDocument(configDoc, adapterName, newAdapterNode)) {
                throw new AdapterNotFoundException("Adapter not found: " + adapterName);
            }

            String xmlOutput = XmlAdapterUtils.convertDocumentToString(configDoc);
            config.setXmlContent(xmlOutput);

            return true;

        } catch (AdapterNotFoundException | ConfigurationNotFoundException | ProjectNotFoundException e) {
            throw e;
        } catch (SAXParseException e) {
            System.err.println("Invalid XML for adapter " + adapterName + ": " + e.getMessage());
            return false;
        } catch (Exception e) {
            System.err.println("Unexpected error updating adapter: " + e.getMessage());
            e.printStackTrace();
            return false;
        }
    }

    public Project addConfiguration(String projectName, String configurationName) throws ProjectNotFoundException {
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
                if (parts.length < MIN_PARTS_LENGTH) continue;

                String relativePath = parts[1]; // e.g. "testproject/Configuration1.xml"
                String projectName = relativePath.substring(0, relativePath.indexOf("/"));

                // Get or create the Project object
                Project project;
                try {
                    project = getProject(projectName);
                } catch (ProjectNotFoundException e) {
                    project = createProject(projectName, projectsRoot.toString());
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
