package org.frankframework.flow.file;

import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(FileTreeController.class)
@AutoConfigureMockMvc(addFilters = false)
class FileTreeControllerTest {

	@Autowired
	private MockMvc mockMvc;

	@MockitoBean
	private FileTreeService fileTreeService;

	@Test
	void getProjectTreeReturnsTree() throws Exception {
		FileTreeNode treeNode = new FileTreeNode();
		treeNode.setName("MyProject");
		treeNode.setPath("MyProject");
		treeNode.setType(NodeType.DIRECTORY);
		treeNode.setProjectRoot(true);

		when(fileTreeService.getProjectTree("MyProject")).thenReturn(treeNode);

		mockMvc.perform(get("/api/projects/MyProject/tree"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.name").value("MyProject"))
				.andExpect(jsonPath("$.path").value("MyProject"))
				.andExpect(jsonPath("$.type").value("DIRECTORY"))
				.andExpect(jsonPath("$.projectRoot").value(true));

		verify(fileTreeService).getProjectTree("MyProject");
	}

	@Test
	void getConfigurationTreeUsesShallowServiceWhenRequested() throws Exception {
		FileTreeNode treeNode = new FileTreeNode();
		treeNode.setName("configurations");
		treeNode.setPath("src/main/configurations");
		treeNode.setType(NodeType.DIRECTORY);

		when(fileTreeService.getShallowConfigurationsDirectoryTree("MyProject")).thenReturn(treeNode);

		mockMvc.perform(get("/api/projects/MyProject/tree/configuration").param("shallow", "true"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.name").value("configurations"));

		verify(fileTreeService).getShallowConfigurationsDirectoryTree("MyProject");
		verify(fileTreeService, never()).getConfigurationsDirectoryTree("MyProject");
	}

	@Test
	void getConfigurationTreeUsesFullServiceByDefault() throws Exception {
		FileTreeNode treeNode = new FileTreeNode();
		treeNode.setName("configurations");
		treeNode.setPath("src/main/configurations");
		treeNode.setType(NodeType.DIRECTORY);

		when(fileTreeService.getConfigurationsDirectoryTree("MyProject")).thenReturn(treeNode);

		mockMvc.perform(get("/api/projects/MyProject/tree/configuration"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.path").value("src/main/configurations"));

		verify(fileTreeService).getConfigurationsDirectoryTree("MyProject");
	}

	@Test
	void getDirectoryContentRequiresPathParameter() throws Exception {
		mockMvc.perform(get("/api/projects/MyProject/tree/directory"))
				.andExpect(status().isBadRequest());

		verify(fileTreeService, never()).getShallowDirectoryTree("MyProject", "");
	}

	@Test
	void getAncestorPathReturnsSparseTreeNode() throws Exception {
		FileTreeNode spineChild = new FileTreeNode();
		spineChild.setName("MyConfig");
		spineChild.setPath("configurations/MyConfig");
		spineChild.setType(NodeType.DIRECTORY);
		spineChild.setChildren(List.of());

		FileTreeNode rootNode = new FileTreeNode();
		rootNode.setName("configurations");
		rootNode.setPath("configurations");
		rootNode.setType(NodeType.DIRECTORY);
		rootNode.setChildren(List.of(spineChild));

		when(fileTreeService.getAncestorPath("MyProject", "configurations/MyConfig")).thenReturn(rootNode);

		mockMvc.perform(get("/api/projects/MyProject/tree/ancestors").param("path", "configurations/MyConfig"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.name").value("configurations"))
				.andExpect(jsonPath("$.type").value("DIRECTORY"))
				.andExpect(jsonPath("$.children[0].name").value("MyConfig"))
				.andExpect(jsonPath("$.children[0].children").isArray());

		verify(fileTreeService).getAncestorPath("MyProject", "configurations/MyConfig");
	}

	@Test
	void getAncestorPathRequiresPathParameter() throws Exception {
		mockMvc.perform(get("/api/projects/MyProject/tree/ancestors"))
				.andExpect(status().isBadRequest());

		verify(fileTreeService, never()).getAncestorPath("MyProject", null);
	}

	@Test
	void getAncestorPathForwardsExactPathValueToService() throws Exception {
		FileTreeNode node = new FileTreeNode();
		node.setName("nested");
		node.setPath("a/b/c/nested");
		node.setType(NodeType.DIRECTORY);
		node.setChildren(List.of());

		when(fileTreeService.getAncestorPath("MyProject", "a/b/c/nested")).thenReturn(node);

		mockMvc.perform(get("/api/projects/MyProject/tree/ancestors").param("path", "a/b/c/nested"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.name").value("nested"));

		verify(fileTreeService).getAncestorPath("MyProject", "a/b/c/nested");
	}

	@Test
	void createFolderReturnsCreatedNode() throws Exception {
		FileTreeNode treeNode = new FileTreeNode();
		treeNode.setName("new-folder");
		treeNode.setPath("src/main/configurations/new-folder");
		treeNode.setType(NodeType.DIRECTORY);

		when(fileTreeService.createFolder("MyProject", "src/main/configurations/new-folder"))
				.thenReturn(treeNode);

		mockMvc.perform(post("/api/projects/MyProject/folder")
						.contentType(MediaType.APPLICATION_JSON)
						.content("{" +
								"\"path\":\"src/main/configurations/new-folder\"" +
								"}"))
				.andExpect(status().isCreated())
				.andExpect(jsonPath("$.name").value("new-folder"))
				.andExpect(jsonPath("$.type").value("DIRECTORY"));

		verify(fileTreeService).createFolder("MyProject", "src/main/configurations/new-folder");
	}
}
