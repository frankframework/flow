package org.frankframework.flow.git;

import java.io.IOException;
import lombok.extern.slf4j.Slf4j;
import org.frankframework.flow.project.ProjectNotFoundException;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@Slf4j
@RestController
@RequestMapping("/projects/{projectName}/git")
public class GitController {
	private static final int SHORT_ID_LENGTH = 7;

	private final GitService gitService;

	public GitController(GitService gitService) {
		this.gitService = gitService;
	}

	@GetMapping("/status")
	public ResponseEntity<GitStatusDTO> getStatus(@PathVariable String projectName)
			throws ProjectNotFoundException, IOException, NotAGitRepositoryException, GitOperationException {
		log.info("Getting git status for project '{}'", projectName);
		GitStatusDTO status = gitService.getStatus(projectName);
		log.info(
				"Git status for '{}': branch={}, staged={}, modified={}, untracked={}, conflicts={}, ahead={}, behind={}",
				projectName,
				status.branch(),
				status.staged().size(),
				status.modified().size(),
				status.untracked().size(),
				status.conflicting().size(),
				status.ahead(),
				status.behind());
		return ResponseEntity.ok(status);
	}

	@GetMapping("/diff")
	public ResponseEntity<GitFileDiffDTO> getFileDiff(
			@PathVariable String projectName, @RequestParam("file") String filePath)
			throws ProjectNotFoundException, IOException, NotAGitRepositoryException {
		log.info("Getting diff for file '{}' in project '{}'", filePath, projectName);
		GitFileDiffDTO diff = gitService.getFileDiff(projectName, filePath);
		log.info("Diff for '{}': {} hunks found", filePath, diff.hunks().size());
		return ResponseEntity.ok(diff);
	}

	@PostMapping("/stage")
	public ResponseEntity<Void> stageFile(@PathVariable String projectName, @RequestBody GitFilePathDTO dto)
			throws ProjectNotFoundException, IOException, NotAGitRepositoryException, GitOperationException {
		log.info("Staging file '{}' in project '{}'", dto.filePath(), projectName);
		gitService.stageFile(projectName, dto.filePath());
		return ResponseEntity.ok().build();
	}

	@PostMapping("/stage-hunks")
	public ResponseEntity<Void> stageHunks(@PathVariable String projectName, @RequestBody GitStageHunksDTO dto)
			throws ProjectNotFoundException, IOException, NotAGitRepositoryException, GitOperationException {
		log.info(
				"Staging {} hunks for file '{}' in project '{}'",
				dto.hunkIndices().size(),
				dto.filePath(),
				projectName);
		gitService.stageHunks(projectName, dto.filePath(), dto.hunkIndices());
		return ResponseEntity.ok().build();
	}

	@PostMapping("/commit")
	public ResponseEntity<GitCommitResultDTO> commit(
			@PathVariable String projectName, @RequestBody GitCommitRequestDTO dto)
			throws ProjectNotFoundException, IOException, NotAGitRepositoryException, GitOperationException {
		log.info("Creating commit in project '{}' with message: '{}'", projectName, dto.message());
		GitCommitResultDTO result = gitService.commit(projectName, dto.message());
		log.info("Commit created in '{}': {}", projectName, result.commitId().substring(0, SHORT_ID_LENGTH));

		return ResponseEntity.ok(result);
	}

	@PostMapping("/push")
	public ResponseEntity<GitPushResultDTO> push(
			@PathVariable String projectName, @RequestBody(required = false) GitTokenDTO dto)
			throws ProjectNotFoundException, IOException, NotAGitRepositoryException, GitOperationException {
		String token = dto != null ? dto.token() : null;
		log.info("Pushing changes for project '{}' (token provided: {})", projectName, token != null);
		GitPushResultDTO result = gitService.push(projectName, token);
		log.info("Push result for '{}': success={}, message='{}'", projectName, result.success(), result.message());
		return ResponseEntity.ok(result);
	}

	@PostMapping("/pull")
	public ResponseEntity<GitPullResultDTO> pull(
			@PathVariable String projectName, @RequestBody(required = false) GitTokenDTO dto)
			throws ProjectNotFoundException, IOException, NotAGitRepositoryException, GitOperationException {
		String token = dto != null ? dto.token() : null;
		log.info("Pulling changes for project '{}' (token provided: {})", projectName, token != null);
		GitPullResultDTO result = gitService.pull(projectName, token);
		log.info("Pull result for '{}': success={}, message='{}'", projectName, result.success(), result.message());
		return ResponseEntity.ok(result);
	}
}
