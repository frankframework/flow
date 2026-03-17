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
import org.frankframework.flow.utility.XmlConfigurationUtils;
import org.frankframework.flow.utility.XmlSecurityUtils;
import org.frankframework.flow.xml.XmlDTO;
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

		Node adapterNode = XmlConfigurationUtils.findAdapterInDocument(configDoc, adapterName);
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

			if (!XmlConfigurationUtils.replaceAdapterInDocument(configDoc, adapterName, newAdapterNode)) {
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
}
