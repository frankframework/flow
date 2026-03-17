package org.frankframework.flow.git;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(GitController.class)
@AutoConfigureMockMvc(addFilters = false)
public class GitControllerTest {

	@Autowired
	private MockMvc mockMvc;

	@MockitoBean
	private GitService gitService;

	@MockitoBean
	private org.frankframework.flow.security.UserContextFilter userContextFilter;

	@MockitoBean
	private org.frankframework.flow.security.UserWorkspaceContext userWorkspaceContext;

	@Test
	public void getStatusReturnsGitStatus() throws Exception {
		GitStatusDTO status = new GitStatusDTO(
				List.of("staged.txt"),
				List.of("modified.txt"),
				List.of("untracked.txt"),
				List.of(),
				"main",
				1,
				0,
				true,
				false);

		when(gitService.getStatus("MyProject")).thenReturn(status);

		mockMvc.perform(get("/api/projects/MyProject/git/status").accept(MediaType.APPLICATION_JSON))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.branch").value("main"))
				.andExpect(jsonPath("$.ahead").value(1))
				.andExpect(jsonPath("$.behind").value(0))
				.andExpect(jsonPath("$.staged[0]").value("staged.txt"))
				.andExpect(jsonPath("$.modified[0]").value("modified.txt"))
				.andExpect(jsonPath("$.untracked[0]").value("untracked.txt"));
	}

	@Test
	public void getFileDiffReturnsDiff() throws Exception {
		GitFileDiffDTO diff = new GitFileDiffDTO(
				"test.txt",
				"old content",
				"new content",
				List.of(new GitHunkDTO(0, "@@ -1,1 +1,1 @@", "-old\n+new", 1, 1, 1, 1)));

		when(gitService.getFileDiff("MyProject", "test.txt")).thenReturn(diff);

		mockMvc.perform(get("/api/projects/MyProject/git/diff")
						.param("file", "test.txt")
						.accept(MediaType.APPLICATION_JSON))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.filePath").value("test.txt"))
				.andExpect(jsonPath("$.oldContent").value("old content"))
				.andExpect(jsonPath("$.newContent").value("new content"))
				.andExpect(jsonPath("$.hunks[0].index").value(0));
	}

	@Test
	public void stageFileReturnsOk() throws Exception {
		doNothing().when(gitService).stageFile("MyProject", "test.txt");

		mockMvc.perform(post("/api/projects/MyProject/git/stage")
						.contentType(MediaType.APPLICATION_JSON)
						.content("{\"filePath\": \"test.txt\"}"))
				.andExpect(status().isOk());

		verify(gitService).stageFile("MyProject", "test.txt");
	}

	@Test
	public void stageHunksReturnsOk() throws Exception {
		doNothing().when(gitService).stageHunks(eq("MyProject"), eq("test.txt"), eq(List.of(0, 1)));

		mockMvc.perform(post("/api/projects/MyProject/git/stage-hunks")
						.contentType(MediaType.APPLICATION_JSON)
						.content("{\"filePath\": \"test.txt\", \"hunkIndices\": [0, 1]}"))
				.andExpect(status().isOk());

		verify(gitService).stageHunks("MyProject", "test.txt", List.of(0, 1));
	}

	@Test
	public void commitReturnsCommitResult() throws Exception {
		GitCommitResultDTO result = new GitCommitResultDTO("abc1234", "Test commit", "Author", 1000L);
		when(gitService.commit("MyProject", "Test commit")).thenReturn(result);

		mockMvc.perform(post("/api/projects/MyProject/git/commit")
						.contentType(MediaType.APPLICATION_JSON)
						.content("{\"message\": \"Test commit\"}"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.commitId").value("abc1234"))
				.andExpect(jsonPath("$.message").value("Test commit"))
				.andExpect(jsonPath("$.author").value("Author"));
	}

	@Test
	public void pushReturnsPushResult() throws Exception {
		GitPushResultDTO result = new GitPushResultDTO(true, "Push completed");
		when(gitService.push(eq("MyProject"), isNull())).thenReturn(result);

		mockMvc.perform(post("/api/projects/MyProject/git/push"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.success").value(true))
				.andExpect(jsonPath("$.message").value("Push completed"));
	}

	@Test
	public void pullReturnsPullResult() throws Exception {
		GitPullResultDTO result = new GitPullResultDTO(true, "Already up to date", false);
		when(gitService.pull(eq("MyProject"), isNull())).thenReturn(result);

		mockMvc.perform(post("/api/projects/MyProject/git/pull"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.success").value(true))
				.andExpect(jsonPath("$.hasConflicts").value(false));
	}

	@Test
	public void notAGitRepositoryReturns400() throws Exception {
		when(gitService.getStatus("NotGit")).thenThrow(new NotAGitRepositoryException("NotGit"));

		mockMvc.perform(get("/api/projects/NotGit/git/status")).andExpect(status().isBadRequest());
	}

	@Test
	public void gitOperationExceptionReturns500() throws Exception {
		when(gitService.getStatus("MyProject")).thenThrow(new GitOperationException("Something failed"));

		mockMvc.perform(get("/api/projects/MyProject/git/status")).andExpect(status().isInternalServerError());
	}
}
