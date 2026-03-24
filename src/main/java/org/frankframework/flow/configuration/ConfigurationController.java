package org.frankframework.flow.configuration;

import java.io.IOException;
import javax.xml.parsers.ParserConfigurationException;
import javax.xml.transform.TransformerException;
import lombok.extern.slf4j.Slf4j;
import org.frankframework.flow.project.Project;
import org.frankframework.flow.project.ProjectDTO;
import org.frankframework.flow.project.ProjectNotFoundException;
import org.frankframework.flow.project.ProjectService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.xml.sax.SAXException;

@Slf4j
@RestController
@RequestMapping("/projects")
public class ConfigurationController {

	private final ConfigurationService configurationService;
	private final ProjectService projectService;

	public ConfigurationController(ConfigurationService configurationService, ProjectService projectService) {
		this.configurationService = configurationService;
		this.projectService = projectService;
	}

	@PostMapping("/{projectName}/configuration")
	public ResponseEntity<ConfigurationDTO> getConfigurationByPath(@RequestBody ConfigurationPathDTO requestBody)
			throws ConfigurationNotFoundException, IOException {
		String content = configurationService.getConfigurationContent(requestBody.filepath());
		return ResponseEntity.ok(new ConfigurationDTO(requestBody.filepath(), content));
	}

	@PutMapping("/{projectName}/configuration")
	public ResponseEntity<Void> updateConfiguration(
			@RequestBody ConfigurationDTO configurationDTO)
			throws ConfigurationNotFoundException, IOException {
		configurationService.updateConfiguration(configurationDTO.filepath(), configurationDTO.content());
		return ResponseEntity.ok().build();
	}

	@PostMapping("/{projectName}/configurations/{configName}")
	public ResponseEntity<ProjectDTO> addConfiguration(
			@PathVariable String projectName, @PathVariable String configName)
			throws ProjectNotFoundException, IOException, ParserConfigurationException, TransformerException, SAXException {
		Project project = configurationService.addConfiguration(projectName, configName);
		return ResponseEntity.ok(projectService.toDto(project));
	}
}
