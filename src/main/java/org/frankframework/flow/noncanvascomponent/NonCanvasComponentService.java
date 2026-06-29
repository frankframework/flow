package org.frankframework.flow.noncanvascomponent;

import java.io.IOException;
import java.io.StringReader;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import javax.xml.parsers.ParserConfigurationException;
import javax.xml.transform.TransformerException;
import lombok.extern.log4j.Log4j2;
import org.frankframework.flow.exception.ApiException;
import org.frankframework.flow.filesystem.FileSystemStorage;
import org.frankframework.flow.utility.XmlConfigurationUtils;
import org.frankframework.flow.utility.XmlNonCanvasComponentUtils;
import org.frankframework.flow.utility.XmlSecurityUtils;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.w3c.dom.Document;
import org.w3c.dom.Element;
import org.xml.sax.InputSource;
import org.xml.sax.SAXException;

@Log4j2
@Service
public class NonCanvasComponentService {

	private static final String NAME_ATTRIBUTE = "name";

	private final FileSystemStorage fileSystemStorage;

	public NonCanvasComponentService(FileSystemStorage fileSystemStorage) {
		this.fileSystemStorage = fileSystemStorage;
	}

	public List<NonCanvasComponentDTO> getNonCanvasComponents(String configurationPath) {
		Document configurationDocument = readConfigurationDocument(configurationPath);
		return toDataTransferObjects(configurationDocument);
	}

	public List<NonCanvasComponentDTO> addNonCanvasComponent(String configurationPath, String tagName, Map<String, String> attributes) {
		validateTagName(tagName);
		Document configurationDocument = readConfigurationDocument(configurationPath);
		XmlNonCanvasComponentUtils.addNonCanvasComponent(configurationDocument, tagName, attributes);
		return writeAndList(configurationPath, configurationDocument);
	}

	public List<NonCanvasComponentDTO> updateNonCanvasComponent(String configurationPath, String tagName, int index, Map<String, String> attributes) {
		validateTagName(tagName);
		Document configurationDocument = readConfigurationDocument(configurationPath);
		boolean updated = XmlNonCanvasComponentUtils.updateNonCanvasComponent(configurationDocument, tagName, index, attributes);

		if (!updated) {
			throw new ApiException("Non-canvas component not found: " + tagName, HttpStatus.NOT_FOUND);
		}

		return writeAndList(configurationPath, configurationDocument);
	}

	public List<NonCanvasComponentDTO> deleteNonCanvasComponent(String configurationPath, String tagName, int index) {
		validateTagName(tagName);
		Document configurationDocument = readConfigurationDocument(configurationPath);
		boolean removed = XmlNonCanvasComponentUtils.removeNonCanvasComponent(configurationDocument, tagName, index);

		if (!removed) {
			throw new ApiException("Non-canvas component not found: " + tagName, HttpStatus.NOT_FOUND);
		}

		return writeAndList(configurationPath, configurationDocument);
	}

	private List<NonCanvasComponentDTO> writeAndList(String configurationPath, Document configurationDocument) {
		writeConfigurationDocument(configurationPath, configurationDocument);
		return toDataTransferObjects(configurationDocument);
	}

	private List<NonCanvasComponentDTO> toDataTransferObjects(Document configurationDocument) {
		List<NonCanvasComponentDTO> components = new ArrayList<>();
		Map<String, Integer> occurrenceByTagName = new HashMap<>();

		for (Element element : XmlNonCanvasComponentUtils.getNonCanvasComponents(configurationDocument)) {
			String tagName = element.getTagName();
			int index = occurrenceByTagName.merge(tagName, 1, Integer::sum) - 1;
			Map<String, String> attributes = XmlNonCanvasComponentUtils.getAttributes(element);
			String name = attributes.get(NAME_ATTRIBUTE);
			components.add(new NonCanvasComponentDTO(tagName, name, index, attributes));
		}

		return components;
	}

	private Document readConfigurationDocument(String configurationPath) {
		Path absolutePath = resolveExistingConfiguration(configurationPath);

		try {
			String content = fileSystemStorage.readFile(absolutePath.toString());
			String repairedContent = XmlConfigurationUtils.repairFlowNamespace(content);
			return XmlSecurityUtils.createSecureDocumentBuilder().parse(new InputSource(new StringReader(repairedContent)));
		} catch (IOException | ParserConfigurationException | SAXException exception) {
			throw new ApiException("Failed to read configuration: " + exception.getMessage(), HttpStatus.BAD_REQUEST);
		}
	}

	private void writeConfigurationDocument(String configurationPath, Document configurationDocument) {
		Path absolutePath = resolveExistingConfiguration(configurationPath);

		try {
			String updatedContent = XmlConfigurationUtils.convertNodeToString(configurationDocument);
			fileSystemStorage.writeFile(absolutePath.toString(), updatedContent);
		} catch (TransformerException | IOException exception) {
			throw new ApiException("Failed to write configuration: " + exception.getMessage(), HttpStatus.BAD_REQUEST);
		}
	}

	private Path resolveExistingConfiguration(String configurationPath) {
		if (configurationPath == null || configurationPath.isBlank()) {
			throw new ApiException("Configuration path must not be empty", HttpStatus.BAD_REQUEST);
		}

		Path absolutePath = fileSystemStorage.toAbsolutePath(configurationPath);
		if (!Files.exists(absolutePath) || Files.isDirectory(absolutePath)) {
			throw new ApiException("Configuration file not found: " + configurationPath, HttpStatus.NOT_FOUND);
		}

		return absolutePath;
	}

	private void validateTagName(String tagName) {
		if (tagName == null || tagName.isBlank()) {
			throw new ApiException("Component type must not be empty", HttpStatus.BAD_REQUEST);
		}
	}
}
