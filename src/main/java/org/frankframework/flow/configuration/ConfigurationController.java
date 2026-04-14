package org.frankframework.flow.configuration;

import java.io.IOException;
import javax.xml.parsers.ParserConfigurationException;
import javax.xml.transform.TransformerException;
import lombok.extern.slf4j.Slf4j;
import org.frankframework.flow.exception.ApiException;
import org.frankframework.flow.xml.XmlDTO;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.xml.sax.SAXException;

@Slf4j
@RestController
@RequestMapping("/projects/{projectName}/configuration")
public class ConfigurationController {

	private final ConfigurationService configurationService;

	public ConfigurationController(ConfigurationService configurationService) {
		this.configurationService = configurationService;
	}

	@GetMapping()
	public ResponseEntity<ConfigurationDTO> getConfigurationByPath(
			@PathVariable String projectName,
			@RequestParam String path
	) throws IOException, ApiException {
		ConfigurationDTO dto = configurationService.getConfigurationContent(projectName, path);
		return ResponseEntity.ok(dto);
	}

	@PutMapping()
	public ResponseEntity<XmlDTO> updateConfiguration(
			@PathVariable String projectName,
			@RequestParam String path,
			@RequestBody String content
	) throws ApiException, IOException, ParserConfigurationException, SAXException, TransformerException {
		String updatedContent = configurationService.updateConfiguration(projectName, path, content);
		XmlDTO xmlDTO = new XmlDTO(updatedContent);
		return ResponseEntity.ok(xmlDTO);
	}

	@PostMapping()
	public ResponseEntity<XmlDTO> addConfiguration(
			@PathVariable String projectName,
			@RequestParam String name
	) throws ApiException, IOException {
		String content = configurationService.addConfiguration(projectName, name);
		XmlDTO xmlDTO = new XmlDTO(content);
		return ResponseEntity.ok(xmlDTO);
	}
}
