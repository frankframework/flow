package org.frankframework.flow.filesystem;

import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.nio.file.AccessDeniedException;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(FilesystemController.class)
@AutoConfigureMockMvc(addFilters = false)
class FilesystemControllerTest {

	@Autowired
	private MockMvc mockMvc;

	@MockitoBean
	private FileSystemStorage fileSystemStorage;

	@Test
	void browseWithoutPathReturnsRoots() throws Exception {
		when(fileSystemStorage.browse(""))
				.thenReturn(new BrowseResult("", "", List.of(new FilesystemEntry("C:", "C:", "directory", true))));

		mockMvc.perform(get("/api/filesystem/browse"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.entries[0].name").value("C:"))
				.andExpect(jsonPath("$.entries[0].path").value("C:"))
				.andExpect(jsonPath("$.entries[0].type").value("directory"))
				.andExpect(jsonPath("$.entries[0].projectRoot").value(true));

		verify(fileSystemStorage).browse("");
	}

	@Test
	void browseWithPathReturnsDirectoryEntries() throws Exception {
		String path = "workspace/project";
		when(fileSystemStorage.browse(path))
				.thenReturn(new BrowseResult(path, "workspace", List.of(new FilesystemEntry("configurations", path + "/configurations", "directory", false))));

		mockMvc.perform(get("/api/filesystem/browse").param("path", path))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.entries[0].name").value("configurations"))
				.andExpect(jsonPath("$.entries[0].path").value(path + "/configurations"));

		verify(fileSystemStorage).browse(path);
	}

	@Test
	void browseWithInaccessiblePathReturnsForbidden() throws Exception {
		String path = "protected";
		when(fileSystemStorage.browse(path)).thenThrow(new AccessDeniedException(path));

		mockMvc.perform(get("/api/filesystem/browse").param("path", path))
				.andExpect(status().isForbidden());

		verify(fileSystemStorage).browse(path);
	}

	@Test
	void defaultPathReturnsUserHomeDirectory() throws Exception {
		mockMvc.perform(get("/api/filesystem/default-path"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.path").value(System.getProperty("user.home")));
	}
}
