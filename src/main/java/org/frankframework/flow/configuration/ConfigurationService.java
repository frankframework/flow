package org.frankframework.flow.configuration;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import javax.xml.parsers.ParserConfigurationException;
import javax.xml.transform.TransformerException;
import org.frankframework.flow.exception.ApiException;
import org.frankframework.flow.filesystem.FileSystemStorage;
import org.frankframework.flow.project.Project;
import org.frankframework.flow.project.ProjectNotFoundException;
import org.frankframework.flow.project.ProjectService;
import org.frankframework.flow.utility.XmlConfigurationUtils;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;
import org.w3c.dom.Document;
import org.xml.sax.SAXException;

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

	public boolean updateConfiguration(String filepath, String content)
			throws IOException, ConfigurationNotFoundException {
		Path absolutePath = fileSystemStorage.toAbsolutePath(filepath);

		if (!Files.exists(absolutePath)) {
			throw new ConfigurationNotFoundException("Invalid file path: " + filepath);
		}

		if (Files.isDirectory(absolutePath)) {
			throw new ConfigurationNotFoundException("Invalid file path: " + filepath);
		}

		fileSystemStorage.writeFile(absolutePath.toString(), content);
		return true;
	}

	public Project addConfiguration(String projectName, String configurationName)
			throws ProjectNotFoundException, IOException, TransformerException, ParserConfigurationException, SAXException {
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
		Document updatedDocument = XmlConfigurationUtils.insertFlowNamespace(defaultXml);
		String updatedContent = XmlConfigurationUtils.convertNodeToString(updatedDocument);
		fileSystemStorage.writeFile(filePath.toString(), updatedContent);

		// Returning the project handles everything, as 'toDto' will pick up the new file
		return project;
	}

	public Project addConfigurationToFolder(String projectName, String configurationName, String folderPath)
			throws IOException, ApiException, ParserConfigurationException, SAXException, TransformerException {
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
		Document updatedDocument = XmlConfigurationUtils.insertFlowNamespace(defaultXml);
		String updatedContent = XmlConfigurationUtils.convertNodeToString(updatedDocument);
		fileSystemStorage.writeFile(filePath.toString(), updatedContent);

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
