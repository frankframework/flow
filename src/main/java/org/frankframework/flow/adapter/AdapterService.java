package org.frankframework.flow.adapter;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardOpenOption;
import javax.xml.parsers.ParserConfigurationException;
import javax.xml.transform.TransformerException;
import lombok.extern.log4j.Log4j2;
import org.frankframework.flow.configuration.ConfigurationFile;
import org.frankframework.flow.configuration.ConfigurationXmlDTO;
import org.frankframework.flow.exception.ApiException;
import org.frankframework.flow.filesystem.FileSystemStorage;
import org.frankframework.flow.project.ConfigurationProject;
import org.frankframework.flow.project.ConfigurationProjectService;
import org.frankframework.flow.utility.PathUtils;
import org.frankframework.flow.utility.XmlAdapterUtils;
import org.frankframework.flow.utility.XmlConfigurationUtils;
import org.frankframework.flow.utility.XmlSecurityUtils;
import org.springframework.core.io.ClassPathResource;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.w3c.dom.Document;
import org.w3c.dom.Node;
import org.xml.sax.SAXException;

@Log4j2
@Service
public class AdapterService {

	private final ConfigurationProjectService configurationProjectService;
	private final FileSystemStorage fileSystemStorage;

	public AdapterService(ConfigurationProjectService configurationProjectService, FileSystemStorage fileSystemStorage) {
		this.configurationProjectService = configurationProjectService;
		this.fileSystemStorage = fileSystemStorage;
	}

	public ConfigurationXmlDTO getAdapter(String projectName, String configurationPath, String adapterName)
			throws IOException, ApiException, SAXException, ParserConfigurationException, TransformerException {

		ConfigurationProject configurationProject = configurationProjectService.getProject(projectName);
		String normalizedConfigPath = PathUtils.toForwardSlash(configurationPath);
		ConfigurationFile config = configurationProject.getConfigurationFiles().stream()
				.filter(configurationFile -> normalizedConfigPath.equals(configurationFile.getFilepath()))
				.findFirst()
				.orElseThrow(() -> new ApiException(String.format("Configuration File with path: %s not found", configurationPath), HttpStatus.NOT_FOUND));

		Document configDoc = XmlSecurityUtils.createSecureDocumentBuilder()
				.parse(new ByteArrayInputStream(config.getXmlContent().getBytes(StandardCharsets.UTF_8)));

		Node adapterNode = XmlAdapterUtils.findAdapterInDocument(configDoc, adapterName);
		if (adapterNode == null) {
			throw new ApiException("Adapter not found: " + adapterName, HttpStatus.NOT_FOUND);
		}

		return new ConfigurationXmlDTO(XmlConfigurationUtils.convertNodeToString(adapterNode));
	}

	public boolean updateAdapter(Path configurationFile, String adapterName, String newAdapterXml) throws IOException {

		Path absConfigFile = fileSystemStorage.toAbsolutePath(configurationFile.toString());

		if (!Files.exists(absConfigFile)) {
			throw new ApiException("Configuration file not found: " + configurationFile, HttpStatus.NOT_FOUND);
		}

		try {
			Document configDoc = XmlSecurityUtils.createSecureDocumentBuilder().parse(Files.newInputStream(absConfigFile));
			Document newAdapterDoc = XmlSecurityUtils.createSecureDocumentBuilder()
					.parse(new ByteArrayInputStream(newAdapterXml.getBytes(StandardCharsets.UTF_8)));
			Node newAdapterNode = newAdapterDoc.getDocumentElement();

			if (!XmlAdapterUtils.replaceAdapterInDocument(configDoc, adapterName, newAdapterNode)) {
				throw new ApiException("Adapter not found: " + adapterName, HttpStatus.NOT_FOUND);
			}

			String updatedXml = XmlConfigurationUtils.convertNodeToString(configDoc);
			Files.writeString(absConfigFile, updatedXml, StandardCharsets.UTF_8, StandardOpenOption.TRUNCATE_EXISTING);
			return true;
		} catch (ParserConfigurationException | TransformerException | SAXException exception) {
			log.error("Error updating adapter in file: {}", exception.getMessage(), exception);
			return false;
		}
	}

	public int createAdapter(String configurationPath, String adapterName) throws IOException {
		if (configurationPath == null || configurationPath.isBlank()) {
			throw new IllegalArgumentException("Configuration path must not be empty");
		}
		if (adapterName == null || adapterName.isBlank()) {
			throw new IllegalArgumentException("Adapter name must not be empty");
		}
		Path absConfigFile = fileSystemStorage.toAbsolutePath(configurationPath);

		if (!Files.exists(absConfigFile)) {
			throw new ApiException("Configuration file not found: " + configurationPath, HttpStatus.NOT_FOUND);
		}

		try {
			Document configDoc = XmlSecurityUtils.createSecureDocumentBuilder().parse(Files.newInputStream(absConfigFile));

			String template = loadDefaultAdapterXml();
			String adapterXml = template.replace("${adapterName}", adapterName);

			XmlAdapterUtils.addAdapterToDocument(configDoc, adapterXml);

			String updatedXml = XmlConfigurationUtils.convertNodeToString(configDoc);
			Files.writeString(absConfigFile, updatedXml, StandardCharsets.UTF_8, StandardOpenOption.TRUNCATE_EXISTING);

			return XmlAdapterUtils.countAdapters(configDoc) - 1;
		} catch (Exception exception) {
			throw new IOException("Failed to create adapter: " + exception.getMessage(), exception);
		}
	}

	public void renameAdapter(String configurationPath, String oldName, String newName) throws IOException {
		if (configurationPath == null || configurationPath.isBlank()) {
			throw new IllegalArgumentException("Configuration path must not be empty");
		}
		Path absConfigFile = fileSystemStorage.toAbsolutePath(configurationPath);

		if (!Files.exists(absConfigFile)) {
			throw new ApiException("Configuration file not found: " + configurationPath, HttpStatus.NOT_FOUND);
		}

		try {
			Document configDoc = XmlSecurityUtils.createSecureDocumentBuilder().parse(Files.newInputStream(absConfigFile));

			if (!XmlAdapterUtils.renameAdapterInDocument(configDoc, oldName, newName)) {
				throw new ApiException("Adapter not found: " + oldName, HttpStatus.NOT_FOUND);
			}

			String updatedXml = XmlConfigurationUtils.convertNodeToString(configDoc);
			Files.writeString(absConfigFile, updatedXml, StandardCharsets.UTF_8, StandardOpenOption.TRUNCATE_EXISTING);
		} catch (ParserConfigurationException | TransformerException | SAXException exception) {
			throw new IOException("Failed to rename adapter: " + exception.getMessage(), exception);
		}
	}

	public void deleteAdapter(String configurationPath, String adapterName) throws IOException {
		if (configurationPath == null || configurationPath.isBlank()) {
			throw new IllegalArgumentException("Configuration path must not be empty");
		}
		Path absConfigFile = fileSystemStorage.toAbsolutePath(configurationPath);

		if (!Files.exists(absConfigFile)) {
			throw new ApiException("Configuration file not found: " + configurationPath, HttpStatus.NOT_FOUND);
		}

		try {
			Document configDoc = XmlSecurityUtils.createSecureDocumentBuilder().parse(Files.newInputStream(absConfigFile));

			if (!XmlAdapterUtils.removeAdapterFromDocument(configDoc, adapterName)) {
				throw new ApiException("Adapter not found: " + adapterName, HttpStatus.NOT_FOUND);
			}

			String updatedXml = XmlConfigurationUtils.convertNodeToString(configDoc);
			Files.writeString(absConfigFile, updatedXml, StandardCharsets.UTF_8, StandardOpenOption.TRUNCATE_EXISTING);
		} catch (ParserConfigurationException | TransformerException | SAXException exception) {
			throw new IOException("Failed to delete adapter: " + exception.getMessage(), exception);
		}
	}

	private String loadDefaultAdapterXml() throws IOException {
		return new String(
				new ClassPathResource("templates/default-adapter.xml")
						.getInputStream()
						.readAllBytes(),
				StandardCharsets.UTF_8
		);
	}
}
