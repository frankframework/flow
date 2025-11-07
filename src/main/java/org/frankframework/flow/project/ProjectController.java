package org.frankframework.flow.project;

import org.frankframework.flow.projectsettings.FilterType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
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

		for (Project project : projects){
			ProjectDTO projectDTO = new ProjectDTO();
			projectDTO.name = project.getName();
			projectDTO.filenames = project.getFilenames();
			projectDTO.filters = project.getProjectSettings().getFilters();
			projectDTOList.add(projectDTO);
		}
		return ResponseEntity.ok(projectDTOList);
	}

	@GetMapping("/{projectname}")
	public ResponseEntity<ProjectDTO> getProject(@PathVariable String projectname){
		try {
			Project project = projectService.getProject(projectname);
			if (project == null) {
				return ResponseEntity.notFound().build();
			}
			ProjectDTO projectDTO = new ProjectDTO();
			projectDTO.name = project.getName();
			projectDTO.filenames = project.getFilenames();
			projectDTO.filters = project.getProjectSettings().getFilters();
			return ResponseEntity.ok(projectDTO);
		} catch (Exception e) {
			return ResponseEntity.badRequest().build();
		}
	}

	@PostMapping("/{projectname}")
	public ResponseEntity<ProjectDTO> createProject(@PathVariable String projectname){
		try {
			projectService.createProject(projectname);
			ProjectDTO projectDTO = new ProjectDTO();
			projectDTO.name = projectname;
			return ResponseEntity.ok(projectDTO);
		} catch (Exception e) {
			return ResponseEntity.badRequest().build();
		}
	}

	@PatchMapping("/{projectname}/filters/{type}/toggle")
	public ResponseEntity<ProjectDTO> toggleFilter(
			@PathVariable String projectname,
			@PathVariable String type) {

		try {
			Project project = projectService.getProject(projectname);
			if (project == null) {
				return ResponseEntity.notFound().build();
			}

			// Parse enum safely
			FilterType filterType = FilterType.valueOf(type.toUpperCase());

			// Toggle the filter
			project.toggleFilter(filterType);

			// Return updated DTO
			ProjectDTO dto = new ProjectDTO();
			dto.name = project.getName();
			dto.filenames = project.getFilenames();
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
