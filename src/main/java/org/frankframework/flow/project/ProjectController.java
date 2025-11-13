package org.frankframework.flow.project;

import org.frankframework.flow.projectsettings.FilterType;
import org.frankframework.flow.configuration.Configuration;
import org.frankframework.flow.configuration.ConfigurationDTO;
import org.frankframework.flow.utility.XmlValidator;
import org.springframework.http.HttpStatus;
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
import java.util.Map;

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

		for (Project project : projects)  {
			ProjectDTO projectDTO = new ProjectDTO();
			projectDTO.name = project.getName();
			ArrayList<String> filenames = new ArrayList<>();
			for (Configuration c : project.getConfigurations()) {
				filenames.add(c.getFilename());
			}
			projectDTO.filenames = filenames;
			projectDTO.filters = project.getProjectSettings().getFilters();
			projectDTOList.add(projectDTO);
		}
		return ResponseEntity.ok(projectDTOList);
	}

	@GetMapping("/{projectname}")
	public ResponseEntity<ProjectDTO> getProject(@PathVariable String projectname)  {
		try {
			Project project = projectService.getProject(projectname);
			if (project == null) {
				return ResponseEntity.notFound().build();
			}
			ProjectDTO projectDTO = new ProjectDTO();
			projectDTO.name = project.getName();
			ArrayList<String> filenames = new ArrayList<>();
			for (Configuration c : project.getConfigurations()) {
				filenames.add(c.getFilename());
			}
			projectDTO.filenames = filenames;
			projectDTO.filters = project.getProjectSettings().getFilters();
			return ResponseEntity.ok(projectDTO);
		} catch (Exception e) {
			return ResponseEntity.badRequest().build();
		}
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
	public ResponseEntity<Object> updateConfiguration(
			@PathVariable String projectName,
			@PathVariable String filename,
			@RequestBody ConfigurationDTO configurationDTO) {
		try {
			String validationError = XmlValidator.validateXml(configurationDTO.xmlContent);
			if (validationError != null) {
				return ResponseEntity
						.badRequest()
						.body(new ErrorDTO("Invalid XML Content", validationError));
			}

			boolean updated = projectService.updateConfigurationXml(
					projectName, filename, configurationDTO.xmlContent);

			if (!updated) {
				String notFoundMessage = String.format("Project with name %s or file with name $s can not be found", projectName, filename);
				return ResponseEntity
						.status(HttpStatus.NOT_FOUND)
						.body(new ErrorDTO("Not found", notFoundMessage));
			}

			return ResponseEntity.ok().build();
		} catch (Exception e) {
			e.printStackTrace();
			return ResponseEntity
					.status(HttpStatus.INTERNAL_SERVER_ERROR)
					.body(new ErrorDTO("Invalid XML", e.getMessage()));
		}

	}

	@PostMapping("/{projectname}")
	public ResponseEntity<ProjectDTO> createProject(@PathVariable String projectname) {
		try {
			projectService.createProject(projectname);
			ProjectDTO projectDTO = new ProjectDTO();
			projectDTO.name = projectname;
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
				filenames.add(c.getFilename());
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
				filenames.add(c.getFilename());
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
