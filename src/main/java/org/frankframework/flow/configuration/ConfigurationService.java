package org.frankframework.flow.configuration;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import org.frankframework.flow.exception.ApiException;
import org.frankframework.flow.filesystem.FileSystemStorage;
import org.frankframework.flow.project.Project;
import org.frankframework.flow.project.ProjectNotFoundException;
import org.frankframework.flow.project.ProjectService;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;

@Service
public class ConfigurationService {

    private static final String CONFIGURATIONS_DIR = "src/main/configurations";

    private final FileSystemStorage fileSystemStorage;
    private final ProjectService projectService;

    public ConfigurationService(FileSystemStorage fileSystemStorage, ProjectService projectService) {
        this.fileSystemStorage = fileSystemStorage;
        this.projectService = projectService;
    }

    public String getConfigurationContent(String filepath) throws IOException, ConfigurationNotFoundException {
        Path filePath = fileSystemStorage.toAbsolutePath(filepath);

        if (!Files.exists(filePath)) {
            throw new ConfigurationNotFoundException("Configuration file not found: " + filepath);
        }

        if (Files.isDirectory(filePath)) {
            throw new ConfigurationNotFoundException("Invalid configuration path: " + filepath);
        }

        return fileSystemStorage.readFile(filePath.toString());
    }

    public void updateConfiguration(String projectName, String filepath, String content)
            throws IOException, ConfigurationNotFoundException, ProjectNotFoundException {
        Path absolutePath = fileSystemStorage.toAbsolutePath(filepath);

        if (!Files.exists(absolutePath)) {
            throw new ConfigurationNotFoundException("Invalid file path: " + filepath);
        }

        if (Files.isDirectory(absolutePath)) {
            throw new ConfigurationNotFoundException("Invalid file path: " + filepath);
        }

        fileSystemStorage.writeFile(absolutePath.toString(), content);
        projectService.updateConfigurationXml(projectName, filepath, content);
    }

    public Project addConfiguration(String projectName, String configurationName)
            throws ProjectNotFoundException, IOException {
        Project project = projectService.getProject(projectName);

        Path absProjectPath = fileSystemStorage.toAbsolutePath(project.getRootPath());
        Path configDir = absProjectPath.resolve(CONFIGURATIONS_DIR).normalize();

        if (!Files.exists(configDir)) {
            Files.createDirectories(configDir);
        }

        Path filePath = configDir.resolve(configurationName).normalize();
        if (!filePath.startsWith(configDir)) {
            throw new SecurityException("Invalid configuration name: " + configurationName);
        }

        String defaultXml = loadDefaultConfigurationXml();
        fileSystemStorage.writeFile(filePath.toString(), defaultXml);

        String relativePath = fileSystemStorage.toRelativePath(filePath.toString());
        Configuration configuration = new Configuration(relativePath);
        configuration.setXmlContent(defaultXml);
        project.addConfiguration(configuration);
        return project;
    }

    public Project addConfigurationToFolder(String projectName, String configurationName, String folderPath)
            throws IOException, ApiException {
        Project project = projectService.getProject(projectName);

        Path absProjectPath = fileSystemStorage.toAbsolutePath(project.getRootPath());
        Path targetDir = fileSystemStorage.toAbsolutePath(folderPath);

        if (!targetDir.startsWith(absProjectPath)) {
            throw new SecurityException("Configuration location must be within the project directory");
        }

        if (!Files.exists(targetDir)) {
            Files.createDirectories(targetDir);
        }

        Path filePath = targetDir.resolve(configurationName).normalize();
        if (!filePath.startsWith(targetDir)) {
            throw new SecurityException("Invalid configuration name: " + configurationName);
        }

        if (Files.exists(filePath)) {
            throw new ConfigurationAlreadyExistsException(configurationName + " already exists at: " + filePath);
        }

        String defaultXml = loadDefaultConfigurationXml();
        fileSystemStorage.writeFile(filePath.toString(), defaultXml);

        String relativePath = fileSystemStorage.toRelativePath(filePath.toString());
        Configuration configuration = new Configuration(relativePath);
        configuration.setXmlContent(defaultXml);
        project.addConfiguration(configuration);
        return project;
    }

    private String loadDefaultConfigurationXml() throws IOException {
        return new String(
                new ClassPathResource("templates/default-configuration.xml")
                        .getInputStream()
                        .readAllBytes(),
                StandardCharsets.UTF_8);
    }
}
