package org.frankframework.flow.configuration;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;

import javax.xml.parsers.ParserConfigurationException;
import javax.xml.transform.TransformerException;

import org.springframework.core.io.ClassPathResource;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.w3c.dom.Document;
import org.xml.sax.SAXException;

import org.frankframework.flow.exception.ApiException;
import org.frankframework.flow.filesystem.FileSystemStorage;
import org.frankframework.flow.project.Project;
import org.frankframework.flow.project.ProjectService;
import org.frankframework.flow.utility.XmlConfigurationUtils;

@Service
public class ConfigurationService {

	private static final String CONFIGURATIONS_DIR = "src/main/configurations";

	private final FileSystemStorage fileSystemStorage;
	private final ProjectService projectService;

	public ConfigurationService(FileSystemStorage fileSystemStorage, ProjectService projectService) {
		this.fileSystemStorage = fileSystemStorage;
		this.projectService = projectService;
	}

	public ConfigurationDTO getConfigurationContent(String projectName, String filepath) throws IOException, ApiException {
		Path filePath = fileSystemStorage.toAbsolutePath(filepath);

		if (!Files.exists(filePath) || Files.isDirectory(filePath)) {
			throw new ApiException("Invalid configuration path: " + filepath, HttpStatus.NOT_FOUND);
		}

		// TODO check if filepath is part of configuration files
		String content = fileSystemStorage.readFile(filePath.toString());
		return new ConfigurationDTO(filepath, content);
	}

	public String updateConfiguration(String projectName, String filepath, String content)
			throws IOException, ApiException, ParserConfigurationException, SAXException, TransformerException {
		Path absolutePath = fileSystemStorage.toAbsolutePath(filepath);

		if (!Files.exists(absolutePath) || Files.isDirectory(absolutePath)) {
			// TODO should be a custom FileSystem/IO Exception
			throw new ApiException("Invalid file path: " + filepath, HttpStatus.NOT_FOUND);
		}

		// TODO check if filepath is part of configuration files
		Document updatedDocument = XmlConfigurationUtils.insertFlowNamespace(content);
		String updatedContent = XmlConfigurationUtils.convertNodeToString(updatedDocument);

		fileSystemStorage.writeFile(absolutePath.toString(), updatedContent);
		return updatedContent;
	}

	public String addConfiguration(String projectName, String configurationName) throws IOException, ApiException {
		Project project =  projectService.getProject(projectName);
		Path absProjectPath = fileSystemStorage.toAbsolutePath(project.getRootPath());
		Path configDir = absProjectPath.resolve(CONFIGURATIONS_DIR).normalize();

		if (!Files.exists(configDir)) {
			Files.createDirectories(configDir);
		}

		Path filePath = configDir.resolve(configurationName).normalize();
		if (!filePath.startsWith(configDir)) {
			// TODO should be a custom FileSystem/IO Exception
			throw new ApiException("Invalid configuration name: " + configurationName, HttpStatus.BAD_REQUEST);
		}

		// TODO check if filepath is part of configuration files

		String defaultXml = loadDefaultConfigurationXml();
		fileSystemStorage.writeFile(filePath.toString(), defaultXml);
		return defaultXml;
	}


	/*
	 * Gets called from FileTreeService, maybe this should be part of that there?
	 * TODO see if this should be reworked
	 * */
	public Project addConfigurationToFolder(String projectName, String configurationName, String folderPath)
			throws IOException, ApiException {
		Project project = projectService.getProject(projectName);

		Path absProjectPath = fileSystemStorage.toAbsolutePath(project.getRootPath());
		Path targetDir = fileSystemStorage.toAbsolutePath(folderPath);

		if (!targetDir.startsWith(absProjectPath)) {
			// TODO should be a custom FileSystem/IO Exception
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

		return project;
	}

	private String loadDefaultConfigurationXml() throws IOException {
		return new String(
				new ClassPathResource("templates/default-configuration.xml")
						.getInputStream()
						.readAllBytes(),
				StandardCharsets.UTF_8
		);
	}
}
