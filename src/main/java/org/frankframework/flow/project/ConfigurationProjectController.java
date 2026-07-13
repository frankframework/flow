package org.frankframework.flow.project;

import jakarta.servlet.http.HttpServletResponse;

import java.io.IOException;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import lombok.extern.log4j.Log4j2;

import org.frankframework.flow.common.AllowAllFrankUserRoles;
import org.frankframework.flow.common.FrankFrameworkService;
import org.frankframework.flow.common.config.ClientSession;
import org.frankframework.flow.exception.ApiException;
import org.frankframework.flow.recentproject.RecentProjectsService;
import org.frankframework.management.bus.BusAction;
import org.frankframework.management.bus.BusTopic;
import org.frankframework.management.bus.message.RequestMessageBuilder;
import org.frankframework.util.JacksonUtils;

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

@Log4j2
@RestController
@RequestMapping("/projects")
public class ConfigurationProjectController {

	private final ConfigurationProjectService configurationProjectService;
	private final RecentProjectsService recentProjectsService;
	private final FrankFrameworkService frankFrameworkService;
	private final ClientSession session;

	public ConfigurationProjectController(
			ConfigurationProjectService configurationProjectService,
			RecentProjectsService recentProjectsService,
			FrankFrameworkService frankFrameworkService,
			ClientSession session
	) {
		this.configurationProjectService = configurationProjectService;
		this.recentProjectsService = recentProjectsService;
		this.frankFrameworkService = frankFrameworkService;
		this.session = session;
	}

	@GetMapping
	public ResponseEntity<List<ConfigurationProjectDTO>> getAllProjects() {
		List<ConfigurationProject> configurationProjects = configurationProjectService.getProjects();
		List<ConfigurationProjectDTO> dtos =
				configurationProjects.stream().map(this.configurationProjectService::toDto).toList();
		return ResponseEntity.ok(dtos);
	}

	@GetMapping("/{projectName}")
	public ResponseEntity<ConfigurationProjectDTO> getProject(@PathVariable String projectName) throws ApiException {
		ConfigurationProject configurationProject = configurationProjectService.getProject(projectName);
		return ResponseEntity.ok(configurationProjectService.toDto(configurationProject));
	}

	@PostMapping
	public ResponseEntity<ConfigurationProjectDTO> createProject(@RequestBody ConfigurationProjectCreateDTO configurationProjectCreateDTO) throws IOException {
		ConfigurationProject configurationProject = configurationProjectService.createProjectOnDisk(configurationProjectCreateDTO);
		recentProjectsService.addRecentProject(configurationProject.getName(), configurationProject.getRootPath());
		return ResponseEntity.ok(configurationProjectService.toDto(configurationProject));
	}

	@PostMapping("/clone")
	public ResponseEntity<ConfigurationProjectDTO> cloneProject(@RequestBody ConfigurationProjectCloneDTO configurationProjectCloneDTO) throws IOException {
		ConfigurationProject configurationProject = configurationProjectService.cloneAndOpenProject(
				configurationProjectCloneDTO.repoUrl(),
				configurationProjectCloneDTO.localPath(),
				configurationProjectCloneDTO.token()
		);
		recentProjectsService.addRecentProject(configurationProject.getName(), configurationProject.getRootPath());
		return ResponseEntity.ok(configurationProjectService.toDto(configurationProject));
	}

	@PostMapping("/open")
	public ResponseEntity<ConfigurationProjectDTO> openProject(@RequestBody ConfigurationProjectCreateDTO configurationProjectCreateDTO)
			throws IOException, ApiException {
		ConfigurationProject configurationProject = configurationProjectService.openProjectFromDisk(configurationProjectCreateDTO.rootPath());
		recentProjectsService.addRecentProject(configurationProject.getName(), configurationProject.getRootPath());
		return ResponseEntity.ok(configurationProjectService.toDto(configurationProject));
	}

	@PatchMapping("/{projectname}/filters/{type}/enable")
	public ResponseEntity<ConfigurationProjectDTO> enableFilter(@PathVariable String projectname, @PathVariable String type) throws ApiException {
		ConfigurationProject configurationProject = configurationProjectService.enableFilter(projectname, type);
		return ResponseEntity.ok(configurationProjectService.toDto(configurationProject));
	}

	@PatchMapping("/{projectname}/filters/{type}/disable")
	public ResponseEntity<ConfigurationProjectDTO> disableFilter(@PathVariable String projectname, @PathVariable String type) throws ApiException {
		ConfigurationProject configurationProject = configurationProjectService.disableFilter(projectname, type);
		return ResponseEntity.ok(configurationProjectService.toDto(configurationProject));
	}

	@GetMapping("/{projectName}/export")
	public void exportProject(@PathVariable String projectName, HttpServletResponse response) throws IOException, ApiException {
		response.setContentType("application/zip");
		response.setHeader(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + projectName + ".zip\"");
		configurationProjectService.exportProjectAsZip(projectName, response.getOutputStream());
	}

	@PostMapping("/import")
	public ResponseEntity<ConfigurationProjectDTO> importProject(
			@RequestParam("file") MultipartFile file,
			@RequestParam("projectName") String projectName
	) throws IOException {
		if (file.isEmpty()) {
			log.warn("Rejected import for project \"{}\": uploaded file is empty", projectName);
			return ResponseEntity.badRequest().build();
		}

		ConfigurationProject configurationProject = configurationProjectService.importProjectFromZip(projectName, file);
		recentProjectsService.addRecentProject(configurationProject.getName(), configurationProject.getRootPath());
		return ResponseEntity.ok(configurationProjectService.toDto(configurationProject));
	}

	@AllowAllFrankUserRoles
	@GetMapping("/configurations")
	public Map<String, Object> getFrameworkConfigurations() throws ApiException {
		if (session.getMemberTarget() == null) {
			throw new ApiException("No cluster member target found for the current session.", HttpStatus.NO_CONTENT);
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
