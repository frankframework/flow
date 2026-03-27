package org.frankframework.flow.adapter;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardOpenOption;
import javax.xml.parsers.ParserConfigurationException;
import javax.xml.transform.TransformerException;
import lombok.extern.slf4j.Slf4j;
import org.frankframework.flow.configuration.Configuration;
import org.frankframework.flow.configuration.ConfigurationNotFoundException;
import org.frankframework.flow.exception.ApiException;
import org.frankframework.flow.filesystem.FileSystemStorage;
import org.frankframework.flow.project.Project;
import org.frankframework.flow.project.ProjectService;
import org.frankframework.flow.utility.XmlAdapterUtils;
import org.frankframework.flow.utility.XmlConfigurationUtils;
import org.frankframework.flow.utility.XmlSecurityUtils;
import org.frankframework.flow.xml.XmlDTO;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;
import org.w3c.dom.Document;
import org.w3c.dom.Node;
import org.xml.sax.SAXException;

@Slf4j
@Service
public class AdapterService {

	private final ProjectService projectService;
	private final FileSystemStorage fileSystemStorage;

	public AdapterService(ProjectService projectService, FileSystemStorage fileSystemStorage) {
		this.projectService = projectService;
		this.fileSystemStorage = fileSystemStorage;
	}

	public XmlDTO getAdapter(String projectName, String configurationPath, String adapterName)
			throws IOException, ApiException, SAXException, ParserConfigurationException, TransformerException {

		Project project = projectService.getProject(projectName);

		Configuration config = project.getConfigurations().stream()
				.filter(c -> c.getFilepath().equals(configurationPath))
				.findFirst()
				.orElseThrow(() -> new ConfigurationNotFoundException(
						String.format("Configuration with filepath: %s not found", configurationPath)));

		Document configDoc = XmlSecurityUtils.createSecureDocumentBuilder()
				.parse(new ByteArrayInputStream(config.getXmlContent().getBytes(StandardCharsets.UTF_8)));

		Node adapterNode = XmlAdapterUtils.findAdapterInDocument(configDoc, adapterName);
		if (adapterNode == null) {
			throw new AdapterNotFoundException("Adapter not found: " + adapterName);
		}

		return new XmlDTO(XmlConfigurationUtils.convertNodeToString(adapterNode));
	}

	public boolean updateAdapter(Path configurationFile, String adapterName, String newAdapterXml)
			throws ConfigurationNotFoundException, AdapterNotFoundException, IOException {

		Path absConfigFile = fileSystemStorage.toAbsolutePath(configurationFile.toString());

		if (!Files.exists(absConfigFile)) {
			throw new ConfigurationNotFoundException("Configuration file not found: " + configurationFile);
		}

		try {
			Document configDoc =
					XmlSecurityUtils.createSecureDocumentBuilder().parse(Files.newInputStream(absConfigFile));

			Document newAdapterDoc = XmlSecurityUtils.createSecureDocumentBuilder()
					.parse(new ByteArrayInputStream(newAdapterXml.getBytes(StandardCharsets.UTF_8)));

			Node newAdapterNode = newAdapterDoc.getDocumentElement();

			if (!XmlAdapterUtils.replaceAdapterInDocument(configDoc, adapterName, newAdapterNode)) {
				throw new AdapterNotFoundException("Adapter not found: " + adapterName);
			}

			String updatedXml = XmlConfigurationUtils.convertNodeToString(configDoc);
			Files.writeString(absConfigFile, updatedXml, StandardCharsets.UTF_8, StandardOpenOption.TRUNCATE_EXISTING);
			return true;

		} catch (AdapterNotFoundException e) {
			throw e;
		} catch (Exception e) {
			log.error("Error updating adapter in file: {}", e.getMessage(), e);
			return false;
		}
	}

	public void createAdapter(String configurationPath, String adapterName)
			throws ConfigurationNotFoundException, IOException {
		if (configurationPath == null || configurationPath.isBlank()) {
			throw new IllegalArgumentException("Configuration path must not be empty");
		}
		if (adapterName == null || adapterName.isBlank()) {
			throw new IllegalArgumentException("Adapter name must not be empty");
		}
		Path absConfigFile = fileSystemStorage.toAbsolutePath(configurationPath);

		if (!Files.exists(absConfigFile)) {
			throw new ConfigurationNotFoundException("Configuration file not found: " + configurationPath);
		}

		try {
			Document configDoc =
					XmlSecurityUtils.createSecureDocumentBuilder().parse(Files.newInputStream(absConfigFile));

			String template = loadDefaultAdapterXml();
			String adapterXml = template.replace("${adapterName}", adapterName);

			XmlAdapterUtils.addAdapterToDocument(configDoc, adapterXml);

			String updatedXml = XmlConfigurationUtils.convertNodeToString(configDoc);
			Files.writeString(absConfigFile, updatedXml, StandardCharsets.UTF_8, StandardOpenOption.TRUNCATE_EXISTING);
		} catch (Exception e) {
			throw new IOException("Failed to create adapter: " + e.getMessage(), e);
		}
	}

	public void renameAdapter(String configurationPath, String oldName, String newName)
			throws ConfigurationNotFoundException, AdapterNotFoundException, IOException {
		if (configurationPath == null || configurationPath.isBlank()) {
			throw new IllegalArgumentException("Configuration path must not be empty");
		}
		Path absConfigFile = fileSystemStorage.toAbsolutePath(configurationPath);

		if (!Files.exists(absConfigFile)) {
			throw new ConfigurationNotFoundException("Configuration file not found: " + configurationPath);
		}

		try {
			Document configDoc =
					XmlSecurityUtils.createSecureDocumentBuilder().parse(Files.newInputStream(absConfigFile));

			if (!XmlAdapterUtils.renameAdapterInDocument(configDoc, oldName, newName)) {
				throw new AdapterNotFoundException("Adapter not found: " + oldName);
			}

			String updatedXml = XmlConfigurationUtils.convertNodeToString(configDoc);
			Files.writeString(absConfigFile, updatedXml, StandardCharsets.UTF_8, StandardOpenOption.TRUNCATE_EXISTING);
		} catch (AdapterNotFoundException e) {
			throw e;
		} catch (Exception e) {
			throw new IOException("Failed to rename adapter: " + e.getMessage(), e);
		}
	}

	public void deleteAdapter(String configurationPath, String adapterName)
			throws ConfigurationNotFoundException, AdapterNotFoundException, IOException {
		if (configurationPath == null || configurationPath.isBlank()) {
			throw new IllegalArgumentException("Configuration path must not be empty");
		}
		Path absConfigFile = fileSystemStorage.toAbsolutePath(configurationPath);

		if (!Files.exists(absConfigFile)) {
			throw new ConfigurationNotFoundException("Configuration file not found: " + configurationPath);
		}

		try {
			Document configDoc =
					XmlSecurityUtils.createSecureDocumentBuilder().parse(Files.newInputStream(absConfigFile));

			if (!XmlAdapterUtils.removeAdapterFromDocument(configDoc, adapterName)) {
				throw new AdapterNotFoundException("Adapter not found: " + adapterName);
			}

			String updatedXml = XmlConfigurationUtils.convertNodeToString(configDoc);
			Files.writeString(absConfigFile, updatedXml, StandardCharsets.UTF_8, StandardOpenOption.TRUNCATE_EXISTING);
		} catch (AdapterNotFoundException e) {
			throw e;
		} catch (Exception e) {
			throw new IOException("Failed to delete adapter: " + e.getMessage(), e);
		}
	}

	private String loadDefaultAdapterXml() throws IOException {
		return new String(
				new ClassPathResource("templates/default-adapter.xml")
						.getInputStream()
						.readAllBytes(),
				StandardCharsets.UTF_8);
	}
}
