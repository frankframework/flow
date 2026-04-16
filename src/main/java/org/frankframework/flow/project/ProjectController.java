package org.frankframework.flow.project;

import jakarta.servlet.ServletResponse;
import jakarta.servlet.http.HttpServletResponse;

import java.io.IOException;
import java.util.List;

import lombok.extern.slf4j.Slf4j;

import org.frankframework.flow.common.FrankFrameworkService;
import org.frankframework.flow.exception.ApiException;
import org.frankframework.flow.projectsettings.InvalidFilterTypeException;
import org.frankframework.flow.recentproject.RecentProjectsService;
import org.frankframework.management.bus.BusAction;
import org.frankframework.management.bus.BusTopic;
import org.frankframework.management.bus.message.RequestMessageBuilder;

import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@Slf4j
@RestController
@RequestMapping("/projects")
public class ProjectController {

	private final ProjectService projectService;
	private final RecentProjectsService recentProjectsService;
	private final FrankFrameworkService frankFrameworkService;

	public ProjectController(ProjectService projectService, RecentProjectsService recentProjectsService, FrankFrameworkService frankFrameworkService) {
		this.projectService = projectService;
		this.recentProjectsService = recentProjectsService;
		this.frankFrameworkService = frankFrameworkService;
	}

	@GetMapping
	public ResponseEntity<List<ProjectDTO>> getAllProjects() {
		List<Project> projects = projectService.getProjects();
		List<ProjectDTO> dtos =
				projects.stream().map(this.projectService::toDto).toList();
		return ResponseEntity.ok(dtos);
	}

	@GetMapping("/{projectName}")
	public ResponseEntity<ProjectDTO> getProject(@PathVariable String projectName) throws ProjectNotFoundException {
		Project project = projectService.getProject(projectName);
		return ResponseEntity.ok(projectService.toDto(project));
	}

	@PostMapping
	public ResponseEntity<ProjectDTO> createProject(@RequestBody ProjectCreateDTO projectCreateDTO) throws IOException {
		Project project = projectService.createProjectOnDisk(projectCreateDTO.rootPath());
		recentProjectsService.addRecentProject(project.getName(), project.getRootPath());
		return ResponseEntity.ok(projectService.toDto(project));
	}

	@PostMapping("/clone")
	public ResponseEntity<ProjectDTO> cloneProject(
			@RequestBody ProjectCloneDTO projectCloneDTO, ServletResponse servletResponse) throws IOException {
		Project project = projectService.cloneAndOpenProject(
				projectCloneDTO.repoUrl(), projectCloneDTO.localPath(), projectCloneDTO.token());
		recentProjectsService.addRecentProject(project.getName(), project.getRootPath());
		return ResponseEntity.ok(projectService.toDto(project));
	}

	@PostMapping("/open")
	public ResponseEntity<ProjectDTO> openProject(@RequestBody ProjectCreateDTO projectCreateDTO)
			throws IOException, ProjectNotFoundException {
		Project project = projectService.openProjectFromDisk(projectCreateDTO.rootPath());
		recentProjectsService.addRecentProject(project.getName(), project.getRootPath());
		return ResponseEntity.ok(projectService.toDto(project));
	}

	@PatchMapping("/{projectname}/filters/{type}/enable")
	public ResponseEntity<ProjectDTO> enableFilter(@PathVariable String projectname, @PathVariable String type)
			throws ProjectNotFoundException, InvalidFilterTypeException {
		Project project = projectService.enableFilter(projectname, type);
		return ResponseEntity.ok(projectService.toDto(project));
	}

	@PatchMapping("/{projectname}/filters/{type}/disable")
	public ResponseEntity<ProjectDTO> disableFilter(@PathVariable String projectname, @PathVariable String type)
			throws ProjectNotFoundException, InvalidFilterTypeException {
		Project project = projectService.disableFilter(projectname, type);
		return ResponseEntity.ok(projectService.toDto(project));
	}

	@GetMapping("/{projectName}/export")
	public void exportProject(@PathVariable String projectName, HttpServletResponse response)
			throws IOException, ProjectNotFoundException {
		response.setContentType("application/zip");
		response.setHeader(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + projectName + ".zip\"");
		projectService.exportProjectAsZip(projectName, response.getOutputStream());
	}

	@PostMapping("/import")
	public ResponseEntity<ProjectDTO> importProject(
			@RequestParam("files") List<MultipartFile> files,
			@RequestParam("paths") List<String> paths,
			@RequestParam("projectName") String projectName)
			throws IOException {

		if (files.isEmpty() || files.size() != paths.size()) {
			return ResponseEntity.badRequest().build();
		}

		Project project = projectService.importProjectFromFiles(projectName, files, paths);
		recentProjectsService.addRecentProject(project.getName(), project.getRootPath());
		return ResponseEntity.ok(projectService.toDto(project));
	}

	@GetMapping("/configurations")
	public ResponseEntity<?> getFrameworkConfigurations() throws ApiException {
		RequestMessageBuilder builder = RequestMessageBuilder.create(BusTopic.CONFIGURATION, BusAction.FIND);
		return frankFrameworkService.callSyncGateway(builder);
	}
}
