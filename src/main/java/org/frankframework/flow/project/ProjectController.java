package org.frankframework.flow.project;

import java.io.IOException;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import jakarta.servlet.http.HttpServletResponse;

import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
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

import lombok.extern.slf4j.Slf4j;

import org.frankframework.flow.common.AllowAllFrankUserRoles;
import org.frankframework.flow.common.FrankFrameworkService;
import org.frankframework.flow.common.config.ClientSession;
import org.frankframework.flow.exception.ApiException;
import org.frankframework.flow.recentproject.RecentProjectsService;
import org.frankframework.management.bus.BusAction;
import org.frankframework.management.bus.BusTopic;
import org.frankframework.management.bus.message.RequestMessageBuilder;
import org.frankframework.util.JacksonUtils;

@Slf4j
@RestController
@RequestMapping("/projects")
public class ProjectController {

	private final ProjectService projectService;
	private final RecentProjectsService recentProjectsService;
	private final FrankFrameworkService frankFrameworkService;
	private final ClientSession session;

	public ProjectController(
			ProjectService projectService,
			RecentProjectsService recentProjectsService,
			FrankFrameworkService frankFrameworkService,
			ClientSession session
	) {
		this.projectService = projectService;
		this.recentProjectsService = recentProjectsService;
		this.frankFrameworkService = frankFrameworkService;
		this.session = session;
	}

	@GetMapping
	public ResponseEntity<List<ProjectDTO>> getAllProjects() {
		List<Project> projects = projectService.getProjects();
		List<ProjectDTO> dtos =
				projects.stream().map(this.projectService::toDto).toList();
		return ResponseEntity.ok(dtos);
	}

	@GetMapping("/{projectName}")
	public ResponseEntity<ProjectDTO> getProject(@PathVariable String projectName) throws ApiException {
		Project project = projectService.getProject(projectName);
		return ResponseEntity.ok(projectService.toDto(project));
	}

	@PostMapping
	public ResponseEntity<ProjectDTO> createProject(@RequestBody ProjectCreateDTO projectCreateDTO) throws IOException {
		Project project = projectService.createProjectOnDisk(projectCreateDTO);
		recentProjectsService.addRecentProject(project.getName(), project.getRootPath());
		return ResponseEntity.ok(projectService.toDto(project));
	}

	@PostMapping("/clone")
	public ResponseEntity<ProjectDTO> cloneProject(
			@RequestBody ProjectCloneDTO projectCloneDTO) throws IOException {
		Project project = projectService.cloneAndOpenProject(
				projectCloneDTO.repoUrl(), projectCloneDTO.localPath(), projectCloneDTO.token());
		recentProjectsService.addRecentProject(project.getName(), project.getRootPath());
		return ResponseEntity.ok(projectService.toDto(project));
	}

	@PostMapping("/open")
	public ResponseEntity<ProjectDTO> openProject(@RequestBody ProjectCreateDTO projectCreateDTO) throws IOException, ApiException {
		Project project = projectService.openProjectFromDisk(projectCreateDTO.rootPath());
		recentProjectsService.addRecentProject(project.getName(), project.getRootPath());
		return ResponseEntity.ok(projectService.toDto(project));
	}

	@PatchMapping("/{projectname}/filters/{type}/enable")
	public ResponseEntity<ProjectDTO> enableFilter(@PathVariable String projectname, @PathVariable String type) throws ApiException {
		Project project = projectService.enableFilter(projectname, type);
		return ResponseEntity.ok(projectService.toDto(project));
	}

	@PatchMapping("/{projectname}/filters/{type}/disable")
	public ResponseEntity<ProjectDTO> disableFilter(@PathVariable String projectname, @PathVariable String type) throws ApiException {
		Project project = projectService.disableFilter(projectname, type);
		return ResponseEntity.ok(projectService.toDto(project));
	}

	@GetMapping("/{projectName}/export")
	public void exportProject(@PathVariable String projectName, HttpServletResponse response) throws IOException, ApiException {
		response.setContentType("application/zip");
		response.setHeader(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + projectName + ".zip\"");
		projectService.exportProjectAsZip(projectName, response.getOutputStream());
	}

	@PostMapping("/import")
	public ResponseEntity<ProjectDTO> importProject(
			@RequestParam("files") List<MultipartFile> files,
			@RequestParam("paths") List<String> paths,
			@RequestParam("projectName") String projectName
	) throws IOException {
		if (files.isEmpty() || files.size() != paths.size()) {
			return ResponseEntity.badRequest().build();
		}

		Project project = projectService.importProjectFromFiles(projectName, files, paths);
		recentProjectsService.addRecentProject(project.getName(), project.getRootPath());
		return ResponseEntity.ok(projectService.toDto(project));
	}

	@AllowAllFrankUserRoles
	@GetMapping("/configurations")
	public Map<String, Object> getFrameworkConfigurations() throws ApiException {
		if (session.getMemberTarget() == null) {
			throw new ApiException("No cluster member target found for the current session.", HttpStatus.NOT_FOUND);
		}

		RequestMessageBuilder builder = RequestMessageBuilder.create(BusTopic.CONFIGURATION, BusAction.FIND);
		ResponseEntity<?> configurations = frankFrameworkService.callSyncGateway(builder);

		if (configurations.getBody() == null) {
			throw new ApiException("Failed to retrieve configurations from the cluster member.", HttpStatus.INTERNAL_SERVER_ERROR);
		}

		Map<String, Object> response = new HashMap<>();
		response.put("configurations", JacksonUtils.convertToDTO(configurations.getBody(), FFConfigurationDTO[].class));
		response.put("name", session.getMemberTarget());
		return response;
	}

	private record FFConfigurationDTO(
			String name,
			String version,
			Boolean stubbed,
			String directory,
			String filename,
			String parent
	) {
	}
}
