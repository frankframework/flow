package org.frankframework.flow.project;

import org.frankframework.flow.configuration.Configuration;
import org.frankframework.flow.configuration.ConfigurationDTO;

import org.springframework.http.HttpStatus;
import org.frankframework.flow.projectsettings.FilterType;
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
			for (Configuration c : project.getConfigurations()) {
				filenames.add(c.getFilepath());
			}
			projectDTO.filenames = filenames;
			projectDTO.filters = project.getProjectSettings().getFilters();
			projectDTOList.add(projectDTO);
		}
		return ResponseEntity.ok(projectDTOList);
	}

	@GetMapping("/{projectname}")
	public ResponseEntity<ProjectDTO> getProject(@PathVariable String projectname) {
		try {
			Project project = projectService.getProject(projectname);
			if (project == null) {
				return ResponseEntity.notFound().build();
			}
			ProjectDTO projectDTO = new ProjectDTO();
			projectDTO.name = project.getName();
			ArrayList<String> filenames = new ArrayList<>();
			for (Configuration c : project.getConfigurations()) {
				filenames.add(c.getFilepath());
			}
			projectDTO.filenames = filenames;
			projectDTO.filters = project.getProjectSettings().getFilters();
			return ResponseEntity.ok(projectDTO);
		} catch (Exception e) {
			return ResponseEntity.badRequest().build();
		}
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
			if (projectDTO.name != null && !projectDTO.name.equals(project.getName())) {
				project.setName(projectDTO.name);
			}

			// 2. Update configuration list (only if present)
			if (projectDTO.filenames != null) {
				// Replace entire configuration list
				project.clearConfigurations();
				for (String filepath : projectDTO.filenames) {
					project.addConfiguration(new Configuration(filepath));
				}
			}

			// 3. Merge filter map (only update provided filters)
			if (projectDTO.filters != null) {
				for (var entry : projectDTO.filters.entrySet()) {
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
			ProjectDTO dto = new ProjectDTO();
			dto.name = project.getName();

			List<String> filenames = new ArrayList<>();
			for (Configuration c : project.getConfigurations()) {
				filenames.add(c.getFilepath());
			}
			dto.filenames = filenames;
			dto.filters = project.getProjectSettings().getFilters();

			return ResponseEntity.ok(dto);

		} catch (Exception e) {
			e.printStackTrace();
			return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
		}
	}

	@PostMapping("/{projectName}/configuration")
	public ResponseEntity<ConfigurationDTO> getConfigurationByPath(
			@PathVariable String projectName,
			@RequestBody ConfigurationPathDTO requestBody) {

		Project project = projectService.getProject(projectName);
		if (project == null) {
			return ResponseEntity.notFound().build();
		}

		String filepath = requestBody.filepath();

		// Find configuration by filepath
		for (Configuration config : project.getConfigurations()) {
			if (config.getFilepath().equals(filepath)) {
				ConfigurationDTO dto = new ConfigurationDTO();
				dto.filepath = config.getFilepath();
				dto.xmlContent = config.getXmlContent();
				return ResponseEntity.ok(dto);
			}
		}

		return ResponseEntity.notFound().build();
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

		ProjectDTO dto = new ProjectDTO();
			dto.name = project.getName();

			List<String> filenames = new ArrayList<>();
			for (Configuration c : project.getConfigurations()) {
				filenames.add(c.getFilepath());
			}
			dto.filenames = filenames;
			dto.filters = project.getProjectSettings().getFilters();

		return ResponseEntity.ok(dto);
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
		try {
			Project project = projectService.createProject(projectname);
			ProjectDTO projectDTO = new ProjectDTO();
			projectDTO.name = project.getName();
			ArrayList<String> filenames = new ArrayList<>();
			for (Configuration c : project.getConfigurations()) {
				filenames.add(c.getFilepath());
			}
			projectDTO.filenames = filenames;
			projectDTO.filters = project.getProjectSettings().getFilters();
			return ResponseEntity.ok(projectDTO);
		} catch (Exception e) {
			return ResponseEntity.badRequest().build();
		}
	}

	@PostMapping("/{projectname}/configurations/{configname}")
	public ResponseEntity<ProjectDTO> addConfiguration(
			@PathVariable String projectname,
			@PathVariable String configname) {
		try {
			Project project = projectService.addConfiguration(projectname, configname);
			if (project == null) {
				return ResponseEntity.notFound().build();
			}
			ProjectDTO projectDTO = new ProjectDTO();
			projectDTO.name = project.getName();
			ArrayList<String> filenames = new ArrayList<>();
			for (Configuration c : project.getConfigurations()) {
				filenames.add(c.getFilepath());
			}
			projectDTO.filenames = filenames;
			projectDTO.filters = project.getProjectSettings().getFilters();
			return ResponseEntity.ok(projectDTO);
		} catch (Exception e) {
			return ResponseEntity.badRequest().build();
		}
	}

	@PatchMapping("/{projectname}/filters/{type}/enable")
	public ResponseEntity<ProjectDTO> enableFilter(
			@PathVariable String projectname,
			@PathVariable String type) {
		try {
			Project project = projectService.getProject(projectname);
			if (project == null) {
				return ResponseEntity.notFound().build();
			}

			// Parse enum safely
			FilterType filterType = FilterType.valueOf(type.toUpperCase());

			// Enable the filter
			project.enableFilter(filterType);

			// Return updated DTO
			ProjectDTO dto = new ProjectDTO();
			dto.name = project.getName();
			ArrayList<String> filenames = new ArrayList<>();
			for (Configuration c : project.getConfigurations()) {
				filenames.add(c.getFilepath());
			}
			dto.filenames = filenames;
			dto.filters = project.getProjectSettings().getFilters();

			return ResponseEntity.ok(dto);

		} catch (IllegalArgumentException e) {
			// thrown if invalid type string
			return ResponseEntity.badRequest().body(null);
		} catch (Exception e) {
			return ResponseEntity.internalServerError().build();
		}
	}

	@PatchMapping("/{projectname}/filters/{type}/disable")
	public ResponseEntity<ProjectDTO> disableFilter(
			@PathVariable String projectname,
			@PathVariable String type) {
		try {
			Project project = projectService.getProject(projectname);
			if (project == null) {
				return ResponseEntity.notFound().build();
			}

			// Parse enum safely
			FilterType filterType = FilterType.valueOf(type.toUpperCase());

			// Disable the filter
			project.disableFilter(filterType);

			// Return updated DTO
			ProjectDTO dto = new ProjectDTO();
			dto.name = project.getName();
			ArrayList<String> filenames = new ArrayList<>();
			for (Configuration c : project.getConfigurations()) {
				filenames.add(c.getFilepath());
			}
			dto.filenames = filenames;
			dto.filters = project.getProjectSettings().getFilters();

			return ResponseEntity.ok(dto);

		} catch (IllegalArgumentException e) {
			// thrown if invalid type string
			return ResponseEntity.badRequest().body(null);
		} catch (Exception e) {
			return ResponseEntity.internalServerError().build();
		}
	}
}
