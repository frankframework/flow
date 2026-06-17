package org.frankframework.flow.configuration;

import jakarta.annotation.PostConstruct;
import java.io.IOException;
import java.io.StringReader;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import javax.xml.parsers.ParserConfigurationException;
import javax.xml.transform.TransformerException;
import lombok.extern.log4j.Log4j2;
import org.frankframework.flow.exception.ApiException;
import org.frankframework.flow.file.FileTreeService;
import org.frankframework.flow.filesystem.FileSystemStorage;
import org.frankframework.flow.frankconfig.FrankConfigXsdService;
import org.frankframework.flow.project.ConfigurationProject;
import org.frankframework.flow.project.ConfigurationProjectService;
import org.frankframework.flow.utility.XmlConfigurationUtils;
import org.frankframework.flow.utility.XmlFormatterUtils;
import org.frankframework.flow.utility.XmlSecurityUtils;
import org.frankframework.flow.utility.XsdAttributeOrdererUtils;
import org.springframework.core.io.ClassPathResource;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.w3c.dom.Document;
import org.xml.sax.InputSource;
import org.xml.sax.SAXException;

@Log4j2
@Service
public class ConfigurationService {

	private static final String CONFIGURATIONS_DIR = "src/main/configurations";

	private final FileSystemStorage fileSystemStorage;
	private final ConfigurationProjectService configurationProjectService;
	private final FileTreeService fileTreeService;
	private final FrankConfigXsdService frankConfigXsdService;
	private XsdAttributeOrdererUtils xsdOrderer;

	public ConfigurationService(
			FileSystemStorage fileSystemStorage,
			ConfigurationProjectService configurationProjectService,
			FrankConfigXsdService frankConfigXsdService,
			FileTreeService fileTreeService) {
		this.fileSystemStorage = fileSystemStorage;
		this.configurationProjectService = configurationProjectService;
		this.frankConfigXsdService = frankConfigXsdService;
		this.fileTreeService = fileTreeService;
	}

	@PostConstruct
	// XsdOrderer cannot be injected directly because FrankConfigXsdService fetches the XSD lazily after startup.
	public void initXsdOrderer() {
		this.xsdOrderer = loadXsdOrderer();
	}

	public ConfigurationDTO getConfigurationContent(String projectName, String filepath) throws IOException, ApiException {
		Path filePath = fileSystemStorage.toAbsolutePath(filepath);

		if (!Files.exists(filePath) || Files.isDirectory(filePath)) {
			throw new ApiException("Invalid configuration path: " + filepath, HttpStatus.NOT_FOUND);
		}

		String content = fileSystemStorage.readFile(filePath.toString());
		// Repair configurations that were saved with undeclared flow:* layout metadata (e.g. <Module>
		// roots) so the studio can parse and open their adapters again.
		content = XmlConfigurationUtils.repairFlowNamespace(content);
		return new ConfigurationDTO(filepath, content);
	}

	public String updateConfiguration(String projectName, String filepath, String content, boolean format)
			throws ApiException {
		Path absolutePath = fileSystemStorage.toAbsolutePath(filepath);

		if (!Files.exists(absolutePath) || Files.isDirectory(absolutePath)) {
			throw new ApiException("Invalid file path: " + filepath, HttpStatus.NOT_FOUND);
		}

		if (content == null || content.isBlank()) {
			throw new ApiException("Configuration content must not be blank", HttpStatus.BAD_REQUEST);
		}

		try {
			String withNamespace = ensureFlowNamespace(content);

			if (!format) {
				fileSystemStorage.writeFile(absolutePath.toString(), withNamespace);
				return withNamespace;
			}

			String formatted = XmlFormatterUtils.format(withNamespace, getXsdOrderer());
			fileSystemStorage.writeFile(absolutePath.toString(), formatted);
			return formatted;
		} catch (Exception e) {
			throw new ApiException("Failed to save configuration: " + e.getMessage(), HttpStatus.BAD_REQUEST);
		}
	}

	public String addConfiguration(String projectName, String configurationName) throws IOException, ApiException, TransformerException, ParserConfigurationException, SAXException {
		ConfigurationProject configurationProject = configurationProjectService.getProject(projectName);
		Path absProjectPath = fileSystemStorage.toAbsolutePath(configurationProject.getRootPath());
		Path configDir = absProjectPath.resolve(CONFIGURATIONS_DIR).normalize();

		if (!Files.exists(configDir)) {
			Files.createDirectories(configDir);
		}

		Path filePath = configDir.resolve(configurationName).normalize();
		if (!filePath.startsWith(configDir)) {
			throw new ApiException("Invalid configuration name: " + configurationName, HttpStatus.BAD_REQUEST);
		}

		Files.createDirectories(filePath.getParent());

		String defaultXml = loadDefaultConfigurationXml();
		Document updatedDocument = XmlConfigurationUtils.insertFlowNamespace(defaultXml);
		String updatedContent = XmlConfigurationUtils.convertNodeToString(updatedDocument);
		fileSystemStorage.writeFile(filePath.toString(), updatedContent);
		fileTreeService.invalidateTreeCache(projectName);
		return updatedContent;
	}

	private String ensureFlowNamespace(String xml) {
		if (xml.contains("xmlns:flow")) {
			return xml;
		}

		return xml.replaceFirst("(<(?:Configuration|Module))\\b", "$1 xmlns:flow=\"urn:frank-flow\"");
	}

	private String loadDefaultConfigurationXml() throws IOException {
		return new String(
				new ClassPathResource("templates/default-configuration.xml")
						.getInputStream()
						.readAllBytes(),
				StandardCharsets.UTF_8
		);
	}

	private XsdAttributeOrdererUtils getXsdOrderer() {
		return xsdOrderer;
	}

	private XsdAttributeOrdererUtils loadXsdOrderer() {
		try {
			String xsdContent = frankConfigXsdService.getFrankConfigXsd();
			Document doc = XmlSecurityUtils.createSecureDocumentBuilder().parse(new InputSource(new StringReader(xsdContent)));
			return new XsdAttributeOrdererUtils(doc);
		} catch (ApiException exception) {
			log.warn("FrankConfig XSD unavailable; attribute ordering will be skipped: {}", exception.getMessage());
		} catch (Exception exception) {
			log.warn("Failed to parse FrankConfig XSD; attribute ordering will be skipped: {}", exception.getMessage());
		}
		return null;
	}
}
