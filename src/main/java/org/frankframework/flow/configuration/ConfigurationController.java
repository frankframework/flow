package org.frankframework.flow.configuration;

import java.io.IOException;
import javax.xml.parsers.ParserConfigurationException;
import javax.xml.transform.TransformerException;
import lombok.extern.log4j.Log4j2;
import org.frankframework.flow.exception.ApiException;
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

@Log4j2
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
	public ResponseEntity<ConfigurationXmlDTO> updateConfiguration(
			@PathVariable String projectName,
			@RequestParam String path,
			@RequestParam(defaultValue = "false") boolean format,
			@RequestBody String content
	) throws ApiException {
		String updatedContent = configurationService.updateConfiguration(projectName, path, content, format);
		ConfigurationXmlDTO configurationXmlDTO = new ConfigurationXmlDTO(updatedContent);
		return ResponseEntity.ok(configurationXmlDTO);
	}

	@PostMapping()
	public ResponseEntity<AdapterLocationDTO> addConfigurationFile(
			@PathVariable String projectName,
			@RequestParam String path
	) throws ApiException, IOException, TransformerException, ParserConfigurationException, SAXException {
		AdapterLocationDTO adapterLocation = configurationService.addConfigurationFile(projectName, path);
		return ResponseEntity.ok(adapterLocation);
	}
}
