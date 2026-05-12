package org.frankframework.flow.recentproject;

import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.nio.file.Path;
import java.util.List;
import org.frankframework.flow.filesystem.FileSystemStorage;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(RecentProjectController.class)
@AutoConfigureMockMvc(addFilters = false)
class RecentProjectControllerTest {

	@Autowired
	private MockMvc mockMvc;

	@MockitoBean
	private RecentProjectsService recentProjectsService;

	@MockitoBean
	private FileSystemStorage fileSystemStorage;

	@Test
	void getRecentProjectsReturnsStoredPathsInLocalEnvironment() throws Exception {
		when(fileSystemStorage.isLocalEnvironment()).thenReturn(true);
		when(recentProjectsService.getRecentProjects())
				.thenReturn(List.of(new RecentProject("Project", "/workspace/project", "2026-05-07T12:00:00Z")));

		mockMvc.perform(get("/api/recent-projects"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$[0].name").value("Project"))
				.andExpect(jsonPath("$[0].rootPath").value("/workspace/project"))
				.andExpect(jsonPath("$[0].lastOpened").value("2026-05-07T12:00:00Z"));

		verify(fileSystemStorage).isLocalEnvironment();
		verify(recentProjectsService).getRecentProjects();
	}

	@Test
	void getRecentProjectsConvertsPathsInCloudEnvironment() throws Exception {
		String absolutePath = "/workspace/project";
		when(fileSystemStorage.isLocalEnvironment()).thenReturn(false);
		when(fileSystemStorage.toRelativePath(absolutePath)).thenReturn("project");
		when(recentProjectsService.getRecentProjects())
				.thenReturn(List.of(new RecentProject("Project", absolutePath, "2026-05-07T12:00:00Z")));

		mockMvc.perform(get("/api/recent-projects"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$[0].rootPath").value("project"));

		verify(fileSystemStorage).toRelativePath(absolutePath);
	}

	@Test
	void removeRecentProjectReturnsBadRequestWhenRootPathIsMissing() throws Exception {
		mockMvc.perform(delete("/api/recent-projects")
						.contentType(MediaType.APPLICATION_JSON)
						.content("{}"))
				.andExpect(status().isBadRequest());

		verify(recentProjectsService, never()).removeRecentProject(org.mockito.ArgumentMatchers.anyString());
	}

	@Test
	void removeRecentProjectReturnsBadRequestWhenCloudPathCannotBeResolved() throws Exception {
		when(fileSystemStorage.isLocalEnvironment()).thenReturn(false);
		when(fileSystemStorage.toAbsolutePath("project")).thenThrow(new IllegalArgumentException("Invalid path"));

		mockMvc.perform(delete("/api/recent-projects")
						.contentType(MediaType.APPLICATION_JSON)
						.content("{" +
								"\"rootPath\":\"project\"" +
								"}"))
				.andExpect(status().isBadRequest());

		verify(recentProjectsService, never()).removeRecentProject(org.mockito.ArgumentMatchers.anyString());
	}

	@Test
	void removeRecentProjectConvertsRelativePathInCloudEnvironment() throws Exception {
		Path absolutePath = Path.of("workspace", "project");
		when(fileSystemStorage.isLocalEnvironment()).thenReturn(false);
		when(fileSystemStorage.toAbsolutePath("project")).thenReturn(absolutePath);

		mockMvc.perform(delete("/api/recent-projects")
						.contentType(MediaType.APPLICATION_JSON)
						.content("{" +
								"\"rootPath\":\"project\"" +
								"}"))
				.andExpect(status().isOk());

		verify(recentProjectsService).removeRecentProject(absolutePath.toString());
	}
}
