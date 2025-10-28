package org.frankframework.flow.project;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
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
}
