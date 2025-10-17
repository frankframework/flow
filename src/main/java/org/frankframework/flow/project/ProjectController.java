package org.frankframework.flow.project;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController("/projects")
public class ProjectController {
	private final ProjectService projectService;

	public ProjectController(ProjectService projectService) {
		this.projectService = projectService;
	}

	@GetMapping("/{projectname}")
	public ResponseEntity<Project> getProject(@PathVariable String projectname){
		try {
			Project project = projectService.getProject(projectname);
			if (project == null) {
				return ResponseEntity.notFound().build();
			}
			return ResponseEntity.ok(project);
		} catch (Exception e) {
			return ResponseEntity.badRequest().build();
		}
	}

	@PostMapping("/{projectname}")
	public ResponseEntity<Project> createProject(@PathVariable String projectname){
		try {
			Project project = projectService.createProject(projectname);
			return ResponseEntity.ok(project);
		} catch (Exception e) {
			return ResponseEntity.badRequest().build();
		}
	}
}
