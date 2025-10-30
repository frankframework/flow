package org.frankframework.flow.project;

import org.frankframework.flow.configuration.Configuration;
import org.frankframework.flow.configuration.ConfigurationDTO;

import org.springframework.core.io.ClassPathResource;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
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
			ArrayList<String> filenames = new ArrayList<>();
			for (Configuration c :  project.getConfigurations()) {
				filenames.add(c.getFilename());
			}
			projectDTO.filenames = filenames;
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
			ArrayList<String> filenames = new ArrayList<>();
			for (Configuration c :  project.getConfigurations()) {
				filenames.add(c.getFilename());
			}
			projectDTO.filenames = filenames;
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
