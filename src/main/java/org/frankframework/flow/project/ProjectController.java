package org.frankframework.flow.project;

import org.frankframework.flow.configuration.Configuration;
import org.frankframework.flow.configuration.ConfigurationDTO;
import org.frankframework.flow.configuration.ConfigurationNotFoundException;
import org.frankframework.flow.projectsettings.InvalidFilterTypeException;
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
			ProjectDTO projectDTO = new ProjectDTO();
			projectDTO.name = project.getName();
			ArrayList<String> filenames = new ArrayList<>();
			for (Configuration c :  project.getConfigurations()) {
				filenames.add(c.getFilename());
			}
			projectDTO.filenames = filenames;
			projectDTO.filters = project.getProjectSettings().getFilters();
			projectDTOList.add(projectDTO);
		}
		return ResponseEntity.ok(projectDTOList);
	}

	@GetMapping("/{projectName}")
	public ResponseEntity<ProjectDTO> getProject(@PathVariable String projectName)
			throws ProjectNotFoundException {

		Project project = projectService.getProject(projectName);

		ProjectDTO projectDTO = new ProjectDTO();
		projectDTO.name = project.getName();

		ArrayList<String> filenames = new ArrayList<>();
		for (Configuration c : project.getConfigurations()) {
			filenames.add(c.getFilename());
		}

		projectDTO.filenames = filenames;
		projectDTO.filters = project.getProjectSettings().getFilters();

		return ResponseEntity.ok(projectDTO);
	}

	@GetMapping("/{projectName}/{filename}")
	public ResponseEntity<ConfigurationDTO> getConfiguration(
			@PathVariable String projectName,
			@PathVariable String filename)
			throws ProjectNotFoundException, ConfigurationNotFoundException {

		Project project = projectService.getProject(projectName);

		for (Configuration config : project.getConfigurations()) {
			if (config.getFilename().equals(filename)) {
				ConfigurationDTO dto = new ConfigurationDTO();
				dto.name = config.getFilename();
				dto.xmlContent = config.getXmlContent();
				return ResponseEntity.ok(dto);
			}
		}

		throw new ConfigurationNotFoundException(
				"Configuration with filename: " + filename + " cannot be found");
	}

	@PutMapping("/{projectName}/{filename}")
	public ResponseEntity<String> updateConfiguration(
			@PathVariable String projectName,
			@PathVariable String filename,
			@RequestBody ConfigurationDTO configurationDTO)
			throws ProjectNotFoundException, ConfigurationNotFoundException {

		projectService.updateConfigurationXml(projectName, filename, configurationDTO.xmlContent);
		return ResponseEntity.ok().build();
	}

	@GetMapping("/{projectName}/{filename}")
	public ResponseEntity<ConfigurationDTO> getConfiguration(
			@PathVariable String projectName,
			@PathVariable String filename) {

		Project project = projectService.getProject(projectName);
		if (project == null) {
			return ResponseEntity.notFound().build();
		}

		// Find configuration by filename
		for (var config : project.getConfigurations()) {
			if (config.getFilename().equals(filename)) {
				ConfigurationDTO dto = new ConfigurationDTO();
				dto.name = config.getFilename();
				dto.xmlContent = config.getXmlContent();
				return ResponseEntity.ok(dto);
			}
		}

		return ResponseEntity.notFound().build(); // No matching config found
	}

	@PutMapping("/{projectName}/{filename}")
	public ResponseEntity<Void> updateConfiguration(
			@PathVariable String projectName,
			@PathVariable String filename,
			@RequestBody ConfigurationDTO configurationDTO) {
		try {
			boolean updated = projectService.updateConfigurationXml(
					projectName, filename, configurationDTO.xmlContent);

			if (!updated) {
				return ResponseEntity.notFound().build(); // Project or config not found
			}

			return ResponseEntity.ok().build();
		} catch (Exception e) {
			e.printStackTrace();
			return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
		}
	}

	@PostMapping("/{projectname}")
	public ResponseEntity<ProjectDTO> createProject(@PathVariable String projectname) {
		projectService.createProject(projectname);

		ProjectDTO projectDTO = new ProjectDTO();
		projectDTO.name = projectname;

		return ResponseEntity.ok(projectDTO);
	}

	@PatchMapping("/{projectname}/filters/{type}/enable")
	public ResponseEntity<ProjectDTO> enableFilter(
			@PathVariable String projectname,
			@PathVariable String type)
			throws ProjectNotFoundException, InvalidFilterTypeException {

		Project project = projectService.enableFilter(projectname, type);
		return ResponseEntity.ok(convertProjectToDTO(project));
	}

	@PatchMapping("/{projectname}/filters/{type}/disable")
	public ResponseEntity<ProjectDTO> disableFilter(
			@PathVariable String projectname,
			@PathVariable String type)
			throws ProjectNotFoundException, InvalidFilterTypeException {

		Project project = projectService.disableFilter(projectname, type);
		return ResponseEntity.ok(convertProjectToDTO(project));
	}

	private ProjectDTO convertProjectToDTO(Project project) {
		ProjectDTO dto = new ProjectDTO();
		dto.name = project.getName();

		ArrayList<String> filenames = new ArrayList<>();
		for (Configuration c : project.getConfigurations()) {
			filenames.add(c.getFilename());
		}

		dto.filenames = filenames;
		dto.filters = project.getProjectSettings().getFilters();

		return dto;
	}
}
