package org.frankframework.flow.file;

import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.frankframework.flow.exception.ApiException;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(FileController.class)
@AutoConfigureMockMvc(addFilters = false)
class FileControllerTest {

	@Autowired
	private MockMvc mockMvc;

	@MockitoBean
	private FileService fileService;

	@Test
	void getFileReturnsFileContents() throws Exception {
		when(fileService.readFile("MyProject", "src/main/configurations/config.xml"))
				.thenReturn(new FileDTO("<configuration/>", "xml"));

		mockMvc.perform(get("/api/projects/MyProject/file")
						.param("path", "src/main/configurations/config.xml"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.content").value("<configuration/>"))
				.andExpect(jsonPath("$.type").value("xml"));

		verify(fileService).readFile("MyProject", "src/main/configurations/config.xml");
	}

	@Test
	void getFileMapsApiExceptionToHttpStatus() throws Exception {
		when(fileService.readFile("MyProject", "missing.xml"))
				.thenThrow(new ApiException("Missing file", HttpStatus.NOT_FOUND));

		mockMvc.perform(get("/api/projects/MyProject/file").param("path", "missing.xml"))
				.andExpect(status().isNotFound())
				.andExpect(jsonPath("$.error").value("Missing file"));
	}

	@Test
	void createOrUpdateFileReturnsCreatedNode() throws Exception {
		FileTreeNode node = new FileTreeNode();
		node.setName("config.xml");
		node.setPath("src/main/configurations/config.xml");
		node.setType(NodeType.FILE);

		when(fileService.createOrUpdateFile("MyProject", "src/main/configurations/config.xml", "<configuration/>"))
				.thenReturn(node);

		mockMvc.perform(put("/api/projects/MyProject/file")
						.param("path", "src/main/configurations/config.xml")
						.contentType(MediaType.TEXT_PLAIN)
						.content("<configuration/>"))
				.andExpect(status().isCreated())
				.andExpect(jsonPath("$.name").value("config.xml"))
				.andExpect(jsonPath("$.path").value("src/main/configurations/config.xml"))
				.andExpect(jsonPath("$.type").value("FILE"));

		verify(fileService).createOrUpdateFile("MyProject", "src/main/configurations/config.xml", "<configuration/>");
	}

	@Test
	void renameFileReturnsUpdatedNode() throws Exception {
		FileTreeNode node = new FileTreeNode();
		node.setName("renamed.xml");
		node.setPath("src/main/configurations/renamed.xml");
		node.setType(NodeType.FILE);

		when(fileService.renameFile("MyProject", "src/main/configurations/config.xml", "src/main/configurations/renamed.xml"))
				.thenReturn(node);

		mockMvc.perform(post("/api/projects/MyProject/file/move")
						.contentType(MediaType.APPLICATION_JSON)
						.content("""
								{
									"oldPath": "src/main/configurations/config.xml",
									"newPath": "src/main/configurations/renamed.xml"
								}
								"""))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.name").value("renamed.xml"))
				.andExpect(jsonPath("$.path").value("src/main/configurations/renamed.xml"));

		verify(fileService)
				.renameFile("MyProject", "src/main/configurations/config.xml", "src/main/configurations/renamed.xml");
	}

	@Test
	void deleteFileReturnsNoContent() throws Exception {
		mockMvc.perform(delete("/api/projects/MyProject/file")
						.param("path", "src/main/configurations/config.xml"))
				.andExpect(status().isNoContent());

		verify(fileService).deleteFile("MyProject", "src/main/configurations/config.xml");
	}
}
