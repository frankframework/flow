package org.frankframework.flow.project;

import org.frankframework.flow.configuration.Configuration;
import org.frankframework.flow.configuration.ConfigurationDTO;
import org.frankframework.flow.configuration.AdapterUpdateDTO;
import org.frankframework.flow.configuration.ConfigurationNotFoundException;
import org.frankframework.flow.projectsettings.FilterType;
import org.frankframework.flow.projectsettings.InvalidFilterTypeException;
import org.frankframework.flow.utility.XmlValidator;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.ArrayList;
import java.util.List;

@RestController()
@RequestMapping("/projects")
public class ProjectController {
	private final ProjectService projectService;

	public ProjectController(ProjectService projectService) {
		this.projectService = projectService;
	}

	@GetMapping
	public ResponseEntity<List<ProjectDTO>> getAllProjects() {
		List<ProjectDTO> projectDTOList = new ArrayList<>();
		List<Project> projects = projectService.getProjects();

		for (Project project : projects) {
			ProjectDTO dto = ProjectDTO.from(project);
			projectDTOList.add(dto);
		}
		return ResponseEntity.ok(projectDTOList);
	}

	@GetMapping("/{projectName}")
	public ResponseEntity<ProjectDTO> getProject(@PathVariable String projectName)
			throws ProjectNotFoundException {

		Project project = projectService.getProject(projectName);

		ProjectDTO dto = ProjectDTO.from(project);

		return ResponseEntity.ok(dto);
	}

	@PatchMapping("/{projectname}")
	public ResponseEntity<ProjectDTO> patchProject(
			@PathVariable String projectname,
			@RequestBody ProjectDTO projectDTO) {

		try {
			Project project = projectService.getProject(projectname);
			if (project == null) {
				return ResponseEntity.notFound().build();
			}

			// 1. Update project name (only if present)
			if (projectDTO.name() != null && !projectDTO.name().equals(project.getName())) {
				project.setName(projectDTO.name());
			}

			// 2. Update configuration list (only if present)
			if (projectDTO.filepaths() != null) {
				// Replace entire configuration list
				project.clearConfigurations();
				for (String filepath : projectDTO.filepaths()) {
					project.addConfiguration(new Configuration(filepath));
				}
			}

			// 3. Merge filter map (only update provided filters)
			if (projectDTO.filters() != null) {
				for (var entry : projectDTO.filters().entrySet()) {
					FilterType type = entry.getKey();
					Boolean enabled = entry.getValue();

					if (enabled == null)
						continue;

					if (enabled) {
						project.enableFilter(type);
					} else {
						project.disableFilter(type);
					}
				}
			}

			// Build updated DTO
			ProjectDTO dto = ProjectDTO.from(project);

			return ResponseEntity.ok(dto);

		} catch (Exception e) {
			e.printStackTrace();
			return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
		}
	}

	@PostMapping("/{projectName}/configuration")
	public ResponseEntity<ConfigurationDTO> getConfigurationByPath(
			@PathVariable String projectName,
			@RequestBody ConfigurationPathDTO requestBody)
			throws ProjectNotFoundException, ConfigurationNotFoundException {

		Project project = projectService.getProject(projectName);

		String filepath = requestBody.filepath();

		// Find configuration by filepath
		for (Configuration config : project.getConfigurations()) {
			if (config.getFilepath().equals(filepath)) {
				ConfigurationDTO dto = new ConfigurationDTO(config.getFilepath(), config.getXmlContent());
				return ResponseEntity.ok(dto);
			}
		}

		throw new ConfigurationNotFoundException(
				"Configuration with filename: " + requestBody.filepath() + " cannot be found");
	}

	@PostMapping("/{projectname}/import-configurations")
	public ResponseEntity<ProjectDTO> importConfigurations(
			@PathVariable String projectname,
			@RequestBody ProjectImportDTO importDTO) {

		Project project = projectService.getProject(projectname);
		if (project == null)
			return ResponseEntity.notFound().build();

		for (ImportConfigurationDTO conf : importDTO.configurations()) {
			Configuration c = new Configuration(conf.filepath());
			c.setXmlContent(conf.xmlContent());
			project.addConfiguration(c);
		}

		ProjectDTO dto = ProjectDTO.from(project);

		return ResponseEntity.ok(dto);
	}

	@PutMapping("/{projectName}/{filename}")
	public ResponseEntity<Void> updateConfiguration(
			@PathVariable String projectName,
			@PathVariable String filename,
			@RequestBody ConfigurationDTO configurationDTO)
			throws ProjectNotFoundException, ConfigurationNotFoundException, InvalidXmlContentException {

		XmlValidator.validateXml(configurationDTO.xmlContent());

		projectService.updateConfigurationXml(
				projectName,
				filename,
				configurationDTO.xmlContent());

		return ResponseEntity.ok().build();
	}

	@PutMapping("/{projectName}/{configurationName}/adapters/{adapterName}")
	public ResponseEntity<Void> updateAdapter(
			@PathVariable String projectName,
			@PathVariable String configurationName,
			@PathVariable String adapterName,
			@RequestBody AdapterUpdateDTO adapterUpdateDTO) {

		boolean updated = projectService.updateAdapter(
				projectName,
				configurationName,
				adapterName,
				adapterUpdateDTO.adapterXml());

		if (!updated) {
			return ResponseEntity.notFound().build();
		}

		return ResponseEntity.ok().build();
	}

	@PostMapping("/{projectname}")
	public ResponseEntity<ProjectDTO> createProject(@PathVariable String projectname) {
		Project project = projectService.createProject(projectname);

		ProjectDTO dto = ProjectDTO.from(project);

		return ResponseEntity.ok(dto);
	}

	@PostMapping("/{projectname}/configurations/{configname}")
	public ResponseEntity<ProjectDTO> addConfiguration(
			@PathVariable String projectname,
			@PathVariable String configname) throws ProjectNotFoundException {
		Project project = projectService.addConfiguration(projectname, configname);

		ProjectDTO projectDTO = ProjectDTO.from(project);
		return ResponseEntity.ok(projectDTO);
	}

	@PatchMapping("/{projectname}/filters/{type}/enable")
	public ResponseEntity<ProjectDTO> enableFilter(
			@PathVariable String projectname,
			@PathVariable String type)
			throws ProjectNotFoundException, InvalidFilterTypeException {

		Project project = projectService.enableFilter(projectname, type);
		ProjectDTO dto = ProjectDTO.from(project);
		return ResponseEntity.ok(dto);
	}

	@PatchMapping("/{projectname}/filters/{type}/disable")
	public ResponseEntity<ProjectDTO> disableFilter(
			@PathVariable String projectname,
			@PathVariable String type)
			throws ProjectNotFoundException, InvalidFilterTypeException {

		Project project = projectService.disableFilter(projectname, type);
		ProjectDTO dto = ProjectDTO.from(project);
		return ResponseEntity.ok(dto);
	}
}
