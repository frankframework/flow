package org.frankframework.flow.project;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.stream.Stream;
import lombok.Getter;
import lombok.extern.slf4j.Slf4j;
import org.frankframework.flow.adapter.AdapterNotFoundException;
import org.frankframework.flow.configuration.Configuration;
import org.frankframework.flow.configuration.ConfigurationNotFoundException;
import org.frankframework.flow.projectsettings.FilterType;
import org.frankframework.flow.projectsettings.InvalidFilterTypeException;
import org.springframework.stereotype.Service;

@Slf4j
@Service
public class ProjectService {

    @Getter
    private final List<Project> projects = new CopyOnWriteArrayList<>();

    private static final String CONFIGURATIONS_DIR = "src/main/configurations";
    private static final String DEFAULT_CONFIGURATION_XML =
            """
            <Configuration name="DefaultConfig">
                <Adapter name="SampleAdapter">
                    <Receiver name="SampleReceiver">
                        <ApiListener method="GET" uriPattern="/sample" />
                    </Receiver>
                    <Pipeline>
                        <FixedResultPipe name="Result" returnString="Hello from Flow!" />
                    </Pipeline>
                </Adapter>
            </Configuration>
            """;

    public Project createProjectOnDisk(String absolutePath) throws IOException {
        if (absolutePath == null || absolutePath.isBlank()) {
            throw new IllegalArgumentException("Project path must not be blank");
        }

        Path projectDir = Paths.get(absolutePath).toAbsolutePath().normalize();
        if (Files.exists(projectDir)) {
            throw new IllegalArgumentException("Project directory already exists: " + absolutePath);
        }

        Path configurationsDir = projectDir.resolve(CONFIGURATIONS_DIR);
        Files.createDirectories(configurationsDir);

        Path configFile = configurationsDir.resolve("Configuration.xml");
        Files.writeString(configFile, DEFAULT_CONFIGURATION_XML, StandardCharsets.UTF_8);

        String name = projectDir.getFileName().toString();
        String rootPath = projectDir.toString();

        Project project = new Project(name, rootPath);
        Configuration configuration =
                new Configuration(configFile.toAbsolutePath().normalize().toString());
        configuration.setXmlContent(DEFAULT_CONFIGURATION_XML);
        project.addConfiguration(configuration);

        projects.add(project);
        return project;
    }

    public Project openProjectFromDisk(String absolutePath) throws IOException {
        Path projectDir = Paths.get(absolutePath).toAbsolutePath().normalize();

        // Check if already registered in memory
        for (Project project : projects) {
            if (Paths.get(project.getRootPath()).toAbsolutePath().normalize().equals(projectDir)) {
                return project;
            }
        }

        if (!Files.exists(projectDir) || !Files.isDirectory(projectDir)) {
            throw new IllegalArgumentException("Project directory does not exist: " + absolutePath);
        }

        String name = projectDir.getFileName().toString();
        String rootPath = projectDir.toString();

        Project project = new Project(name, rootPath);

        // Scan for XML files in src/main/configurations/
        Path configurationsDir = projectDir.resolve(CONFIGURATIONS_DIR);
        if (Files.exists(configurationsDir) && Files.isDirectory(configurationsDir)) {
            scanXmlFiles(configurationsDir, project);
        } else {
            // Fallback: scan project root for XML files (backward compat)
            scanXmlFiles(projectDir, project);
        }

        projects.add(project);
        return project;
    }

    private void scanXmlFiles(Path directory, Project project) throws IOException {
        try (Stream<Path> paths = Files.walk(directory)) {
            List<Path> xmlFiles = paths.filter(Files::isRegularFile)
                    .filter(p -> p.toString().endsWith(".xml"))
                    .toList();

            for (Path xmlFile : xmlFiles) {
                String absolutePath = xmlFile.toAbsolutePath().normalize().toString();
                try {
                    String xmlContent = Files.readString(xmlFile, StandardCharsets.UTF_8);
                    Configuration configuration = new Configuration(absolutePath);
                    configuration.setXmlContent(xmlContent);
                    project.addConfiguration(configuration);
                } catch (java.nio.charset.MalformedInputException e) {
                    log.warn("Skipping file with invalid UTF-8 encoding: {}", absolutePath);
                }
            }
        }
    }

    public Project cloneAndOpenProject(String repoUrl, String localPath) throws IOException {
        if (repoUrl == null || repoUrl.isBlank()) {
            throw new IllegalArgumentException("Repository URL must not be blank");
        }
        if (localPath == null || localPath.isBlank()) {
            throw new IllegalArgumentException("Local path must not be blank");
        }

        Path targetDir = Paths.get(localPath).toAbsolutePath().normalize();
        if (Files.exists(targetDir)) {
            throw new IllegalArgumentException("Target directory already exists: " + targetDir);
        }

        try {
            ProcessBuilder processBuilder = new ProcessBuilder("git", "clone", repoUrl, targetDir.toString());
            processBuilder.redirectErrorStream(true);
            Process process = processBuilder.start();

            String output = new String(process.getInputStream().readAllBytes(), StandardCharsets.UTF_8);
            int exitCode = process.waitFor();

            if (exitCode != 0) {
                log.error("git clone failed (exit code {}): {}", exitCode, output);
                throw new IOException(
                        "git clone failed: " + output.lines().findFirst().orElse("unknown error"));
            }

            log.info("Cloned repository {} to {}", repoUrl, targetDir);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new IOException("git clone was interrupted");
        }

        return openProjectFromDisk(targetDir.toString());
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
            throw new InvalidFilterTypeException("Invalid filter type: " + type);
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
            throw new ConfigurationNotFoundException("Configuration not found: " + configurationPath);
        }

        Configuration config = configOptional.get();

        try {
            var configDoc = org.frankframework.flow.utility.XmlSecurityUtils.createSecureDocumentBuilder()
                    .parse(new java.io.ByteArrayInputStream(
                            config.getXmlContent().getBytes(StandardCharsets.UTF_8)));

            var newAdapterDoc = org.frankframework.flow.utility.XmlSecurityUtils.createSecureDocumentBuilder()
                    .parse(new java.io.ByteArrayInputStream(newAdapterXml.getBytes(StandardCharsets.UTF_8)));

            var newAdapterNode = configDoc.importNode(newAdapterDoc.getDocumentElement(), true);

            if (!org.frankframework.flow.utility.XmlAdapterUtils.replaceAdapterInDocument(
                    configDoc, adapterName, newAdapterNode)) {
                throw new AdapterNotFoundException("Adapter not found: " + adapterName);
            }

            String xmlOutput = org.frankframework.flow.utility.XmlAdapterUtils.convertDocumentToString(configDoc);
            config.setXmlContent(xmlOutput);

            return true;

        } catch (AdapterNotFoundException | ConfigurationNotFoundException | ProjectNotFoundException e) {
            throw e;
        } catch (org.xml.sax.SAXParseException e) {
            log.warn("Invalid XML for adapter {}: {}", adapterName, e.getMessage());
            return false;
        } catch (Exception e) {
            log.error("Unexpected error updating adapter: {}", e.getMessage(), e);
            return false;
        }
    }

    public Project addConfiguration(String projectName, String configurationName) throws ProjectNotFoundException {
        Project project = getProject(projectName);

        Configuration configuration = new Configuration(configurationName);
        project.addConfiguration(configuration);
        return project;
    }
}
