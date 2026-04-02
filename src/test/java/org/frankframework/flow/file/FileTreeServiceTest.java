package org.frankframework.flow.file;

import static org.junit.Assert.assertSame;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Comparator;
import java.util.List;
import org.frankframework.flow.exception.ApiException;
import org.frankframework.flow.filesystem.FileSystemStorage;
import org.frankframework.flow.project.Project;
import org.frankframework.flow.project.ProjectNotFoundException;
import org.frankframework.flow.project.ProjectService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
public class FileTreeServiceTest {

	@Mock
	private ProjectService projectService;

	@Mock
	private FileSystemStorage fileSystemStorage;

	private FileTreeService fileTreeService;
	private Path tempProjectRoot;
	private static final String TEST_PROJECT_NAME = "FrankFlowTestProject";

	@BeforeEach
	public void setUp() throws IOException {
		FileService fileService = new FileService(projectService, fileSystemStorage);
		tempProjectRoot = Files.createTempDirectory("flow_unit_test");
		fileTreeService = new FileTreeService(projectService, fileSystemStorage, fileService);
	}

	@AfterEach
	public void tearDown() throws IOException {
		if (tempProjectRoot != null && Files.exists(tempProjectRoot)) {
			try (var stream = Files.walk(tempProjectRoot)) {
				stream.sorted(Comparator.reverseOrder()).forEach(p -> {
					try {
						Files.delete(p);
					} catch (IOException ignored) {
						// Ignored to ensure cleanup continues even if some files couldn't be removed
					}
				});
			}
		}
	}

	private void stubToAbsolutePath() {
		when(fileSystemStorage.toAbsolutePath(anyString())).thenAnswer(invocation -> {
			String path = invocation.getArgument(0);
			Path p = Paths.get(path);
			return p.isAbsolute() ? p : tempProjectRoot.resolve(p).normalize();
		});
	}

	@Test
	@DisplayName("Should build a recursive tree structure for deep directories")
	public void getProjectTree_DeepStructure() throws IOException, ProjectNotFoundException {
		stubToAbsolutePath();
		when(fileSystemStorage.isLocalEnvironment()).thenReturn(true);

		Files.writeString(tempProjectRoot.resolve("fileA.xml"), "A");
		Path dir1 = Files.createDirectory(tempProjectRoot.resolve("dir1"));
		Files.writeString(dir1.resolve("fileB.xml"), "B");
		Path dir2 = Files.createDirectory(dir1.resolve("dir2"));
		Files.writeString(dir2.resolve("fileC.xml"), "C");

		Project project =
				new Project(TEST_PROJECT_NAME, tempProjectRoot.toAbsolutePath().toString());
		when(projectService.getProject(TEST_PROJECT_NAME)).thenReturn(project);

		FileTreeNode tree = fileTreeService.getProjectTree(TEST_PROJECT_NAME);

		assertNotNull(tree);
		assertEquals(tempProjectRoot.getFileName().toString(), tree.getName());

		List<FileTreeNode> children = tree.getChildren();
		assertTrue(children.stream().anyMatch(n -> n.getName().equals("fileA.xml")));

		FileTreeNode nodeDir1 = children.stream()
				.filter(n -> n.getName().equals("dir1"))
				.findFirst()
				.orElseThrow();
		assertEquals(2, nodeDir1.getChildren().size());

		FileTreeNode nodeDir2 = nodeDir1.getChildren().stream()
				.filter(n -> n.getName().equals("dir2"))
				.findFirst()
				.orElseThrow();
		assertEquals("fileC.xml", nodeDir2.getChildren().getFirst().getName());
	}

	@Test
	@DisplayName("Should fail if the project is not registered in ProjectService")
	public void getProjectTree_ProjectMissing() throws ProjectNotFoundException {
		when(projectService.getProject("Unknown")).thenThrow(new ProjectNotFoundException("err"));
		assertThrows(IllegalArgumentException.class, () -> fileTreeService.getProjectTree("Unknown"));
	}

	@Test
	void getProjectTreeThrowsIfProjectDoesNotExist() throws ProjectNotFoundException {
		when(projectService.getProject("NonExistentProject")).thenThrow(new ProjectNotFoundException("err"));
		IllegalArgumentException exception = assertThrows(
				IllegalArgumentException.class, () -> fileTreeService.getProjectTree("NonExistentProject"));
		assertTrue(exception.getMessage().contains("Project does not exist: NonExistentProject"));
	}

	@Test
	public void getShallowDirectoryTreeReturnsTreeForValidDirectory() throws IOException, ProjectNotFoundException {
		stubToAbsolutePath();

		Files.writeString(tempProjectRoot.resolve("config1.xml"), "<config/>");
		Files.writeString(tempProjectRoot.resolve("readme.txt"), "hello");

		Project project =
				new Project(TEST_PROJECT_NAME, tempProjectRoot.toAbsolutePath().toString());
		when(projectService.getProject(TEST_PROJECT_NAME)).thenReturn(project);

		FileTreeNode node = fileTreeService.getShallowDirectoryTree(TEST_PROJECT_NAME, ".");

		assertNotNull(node);
		assertEquals(NodeType.DIRECTORY, node.getType());
		assertNotNull(node.getChildren());
		assertEquals(2, node.getChildren().size());

		assertTrue(node.getChildren().stream().anyMatch(c -> c.getName().equals("config1.xml")));
		assertTrue(node.getChildren().stream().anyMatch(c -> c.getName().equals("readme.txt")));
	}

	@Test
	void getShallowDirectoryTreeThrowsSecurityExceptionForPathTraversal() throws ProjectNotFoundException {
		stubToAbsolutePath();

		Project project =
				new Project(TEST_PROJECT_NAME, tempProjectRoot.toAbsolutePath().toString());
		when(projectService.getProject(TEST_PROJECT_NAME)).thenReturn(project);

		SecurityException ex = assertThrows(
				SecurityException.class, () -> fileTreeService.getShallowDirectoryTree(TEST_PROJECT_NAME, "../other"));

		assertTrue(ex.getMessage().contains("Invalid path"));
	}

	@Test
	void getShallowDirectoryTreeThrowsIllegalArgumentExceptionIfDirectoryDoesNotExist() throws ProjectNotFoundException {
		stubToAbsolutePath();

		Project project =
				new Project(TEST_PROJECT_NAME, tempProjectRoot.toAbsolutePath().toString());
		when(projectService.getProject(TEST_PROJECT_NAME)).thenReturn(project);

		IllegalArgumentException ex = assertThrows(
				IllegalArgumentException.class,
				() -> fileTreeService.getShallowDirectoryTree(TEST_PROJECT_NAME, "nonexistent")
		);

		assertTrue(ex.getMessage().contains("Directory does not exist"));
	}

	@Test
	public void getShallowConfigurationsDirectoryTreeReturnsTreeForExistingDirectory() throws IOException, ProjectNotFoundException {
		stubToAbsolutePath();

		Path configsDir = tempProjectRoot.resolve("src/main/configurations");
		Files.createDirectories(configsDir);
		Files.writeString(configsDir.resolve("config1.xml"), "<config/>");
		Files.writeString(configsDir.resolve("readme.txt"), "hello");

		Project project =
				new Project(TEST_PROJECT_NAME, tempProjectRoot.toAbsolutePath().toString());
		when(projectService.getProject(TEST_PROJECT_NAME)).thenReturn(project);

		FileTreeNode node = fileTreeService.getShallowConfigurationsDirectoryTree(TEST_PROJECT_NAME);

		assertNotNull(node);
		assertEquals("configurations", node.getName().toLowerCase());
		assertEquals(NodeType.DIRECTORY, node.getType());
		assertNotNull(node.getChildren());
		assertEquals(2, node.getChildren().size());

		assertTrue(node.getChildren().stream().anyMatch(c -> c.getName().equals("config1.xml")));
		assertTrue(node.getChildren().stream().anyMatch(c -> c.getName().equals("readme.txt")));
	}

	@Test
	public void getShallowConfigurationsDirectoryTreeThrowsIfDirectoryDoesNotExist() throws ProjectNotFoundException {
		stubToAbsolutePath();

		Project project = new Project(TEST_PROJECT_NAME, tempProjectRoot.toAbsolutePath().toString());
		when(projectService.getProject(TEST_PROJECT_NAME)).thenReturn(project);

		IllegalArgumentException ex = assertThrows(
				IllegalArgumentException.class,
				() -> fileTreeService.getShallowConfigurationsDirectoryTree(TEST_PROJECT_NAME)
		);

		assertTrue(ex.getMessage().contains("Configurations directory does not exist"));
	}

	@Test
	public void getShallowConfigurationsDirectoryTreeThrowsIfProjectDoesNotExist() throws ProjectNotFoundException {
		when(projectService.getProject("NonExistentProject")).thenThrow(new ProjectNotFoundException("err"));

		IllegalArgumentException ex = assertThrows(
				IllegalArgumentException.class,
				() -> fileTreeService.getShallowConfigurationsDirectoryTree("NonExistentProject")
		);

		assertTrue(ex.getMessage().contains("Configurations directory does not exist"));
	}

	@Test
	public void getConfigurationsDirectoryTreeReturnsFullTreeForExistingDirectory() throws IOException, ProjectNotFoundException {
		stubToAbsolutePath();
		when(fileSystemStorage.isLocalEnvironment()).thenReturn(true);

		Path configsDir = tempProjectRoot.resolve("src/main/configurations");
		Files.createDirectories(configsDir);
		Files.writeString(configsDir.resolve("config1.xml"), "<config/>");
		Files.writeString(configsDir.resolve("readme.txt"), "hello");
		Path subDir = configsDir.resolve("subconfigs");
		Files.createDirectory(subDir);
		Files.writeString(subDir.resolve("nested.xml"), "<nested></nested>");

		Project project =
				new Project(TEST_PROJECT_NAME, tempProjectRoot.toAbsolutePath().toString());
		when(projectService.getProject(TEST_PROJECT_NAME)).thenReturn(project);

		FileTreeNode node = fileTreeService.getConfigurationsDirectoryTree(TEST_PROJECT_NAME);

		assertNotNull(node);
		assertEquals("configurations", node.getName().toLowerCase());
		assertEquals(NodeType.DIRECTORY, node.getType());
		assertNotNull(node.getChildren());
		assertEquals(3, node.getChildren().size());

		assertTrue(node.getChildren().stream().anyMatch(c -> c.getName().equals("config1.xml")));
		assertTrue(node.getChildren().stream().anyMatch(c -> c.getName().equals("readme.txt")));

		FileTreeNode subConfigNode = node.getChildren().stream()
				.filter(c -> c.getName().equals("subconfigs"))
				.findFirst()
				.orElseThrow();
		assertEquals(NodeType.DIRECTORY, subConfigNode.getType());
		assertEquals(1, subConfigNode.getChildren().size());
		assertEquals("nested.xml", subConfigNode.getChildren().getFirst().getName());
	}

	@Test
	public void getConfigurationsDirectoryTreeThrowsIfDirectoryDoesNotExist() throws ProjectNotFoundException {
		stubToAbsolutePath();

		Project project =
				new Project(TEST_PROJECT_NAME, tempProjectRoot.toAbsolutePath().toString());
		when(projectService.getProject(TEST_PROJECT_NAME)).thenReturn(project);

		IllegalArgumentException ex = assertThrows(
				IllegalArgumentException.class,
				() -> fileTreeService.getConfigurationsDirectoryTree(TEST_PROJECT_NAME)
		);

		assertTrue(ex.getMessage().contains("Configurations directory does not exist"));
	}

	@Test
	public void getConfigurationsDirectoryTreeThrowsIfProjectDoesNotExist() throws ProjectNotFoundException {
		when(projectService.getProject("NonExistingProject")).thenThrow(new ProjectNotFoundException("err"));

		IllegalArgumentException ex = assertThrows(
				IllegalArgumentException.class,
				() -> fileTreeService.getConfigurationsDirectoryTree("NonExistingProject")
		);

		assertTrue(ex.getMessage().contains("Configurations directory does not exist"));
	}

	@Test
	@DisplayName("Should delegate to ConfigurationService when creating an .xml file")
	void createFile_ShouldDelegateToConfigurationService_WhenXml() throws Exception {
		stubToAbsolutePath();

		Project project =
				new Project(TEST_PROJECT_NAME, tempProjectRoot.toAbsolutePath().toString());

		when(configurationService.addConfigurationToFolder(eq(TEST_PROJECT_NAME), eq("config.xml"), anyString()))
				.thenReturn(project);
		when(projectService.getProject(TEST_PROJECT_NAME)).thenReturn(project);

		FileTreeNode node = fileService.createOrUpdateFile(
				TEST_PROJECT_NAME, tempProjectRoot.toAbsolutePath().toString(), "config.xml");

		assertNotNull(node);
		verify(configurationService).addConfigurationToFolder(eq(TEST_PROJECT_NAME), eq("config.xml"), anyString());
	}

	@Test
	@DisplayName("Should create a folder and return a FileTreeNode with DIRECTORY type")
	void createFolder_Success() throws IOException, ApiException {
		stubToAbsolutePath();
		stubCreateProjectDirectory();

		Project project =
				new Project(TEST_PROJECT_NAME, tempProjectRoot.toAbsolutePath().toString());
		when(projectService.getProject(TEST_PROJECT_NAME)).thenReturn(project);

		Path path = tempProjectRoot.toAbsolutePath().resolve("newFolder");
		FileTreeNode node = fileTreeService.createFolder(TEST_PROJECT_NAME, path.toString());

		assertNotNull(node);
		assertEquals("newFolder", node.getName());
		assertEquals(NodeType.DIRECTORY, node.getType());
		assertTrue(node.getPath().endsWith("newFolder"));
	}

	@Test
	@DisplayName("Should throw IllegalArgumentException for a null folder name")
	void createFolder_NullName_ThrowsIllegalArgument() {
		assertThrows(
				IllegalArgumentException.class,
				() -> fileTreeService.createFolder(TEST_PROJECT_NAME, null)
		);
	}

	@Test
	@DisplayName("Should clear all cache entries so the tree is fully rebuilt on the next call")
	void invalidateTreeCache_AllEntries_ForcesRebuild() throws IOException, ProjectNotFoundException {
		stubToAbsolutePath();
		when(fileSystemStorage.isLocalEnvironment()).thenReturn(true);

		Project project =
				new Project(TEST_PROJECT_NAME, tempProjectRoot.toAbsolutePath().toString());
		when(projectService.getProject(TEST_PROJECT_NAME)).thenReturn(project);

		fileTreeService.getProjectTree(TEST_PROJECT_NAME);
		fileTreeService.invalidateTreeCache();
		fileTreeService.getProjectTree(TEST_PROJECT_NAME);

		verify(projectService, times(2)).getProject(TEST_PROJECT_NAME);
	}

	@Test
	@DisplayName("Should clear only the named project's cache entry so a rebuild is triggered")
	void invalidateTreeCache_SpecificProject_ForcesRebuild() throws IOException, ProjectNotFoundException {
		stubToAbsolutePath();
		when(fileSystemStorage.isLocalEnvironment()).thenReturn(true);

		Project project =
				new Project(TEST_PROJECT_NAME, tempProjectRoot.toAbsolutePath().toString());
		when(projectService.getProject(TEST_PROJECT_NAME)).thenReturn(project);

		fileTreeService.getProjectTree(TEST_PROJECT_NAME);
		fileTreeService.invalidateTreeCache(TEST_PROJECT_NAME);
		fileTreeService.getProjectTree(TEST_PROJECT_NAME);

		verify(projectService, times(2)).getProject(TEST_PROJECT_NAME);
	}

	@Test
	@DisplayName("Should return the same cached instance on subsequent calls without rebuilding")
	void getProjectTree_ReturnsCachedResult() throws IOException, ProjectNotFoundException {
		stubToAbsolutePath();
		when(fileSystemStorage.isLocalEnvironment()).thenReturn(true);

		Project project =
				new Project(TEST_PROJECT_NAME, tempProjectRoot.toAbsolutePath().toString());
		when(projectService.getProject(TEST_PROJECT_NAME)).thenReturn(project);

		FileTreeNode first = fileTreeService.getProjectTree(TEST_PROJECT_NAME);
		FileTreeNode second = fileTreeService.getProjectTree(TEST_PROJECT_NAME);

		assertSame(first, second);
		verify(projectService, times(1)).getProject(TEST_PROJECT_NAME);
	}

	@Test
	@DisplayName("Should use relative paths for tree nodes when not in local environment")
	void getProjectTree_NonLocalEnvironment_UsesRelativePaths() throws IOException, ProjectNotFoundException {
		stubToAbsolutePath();
		when(fileSystemStorage.isLocalEnvironment()).thenReturn(false);

		Files.writeString(tempProjectRoot.resolve("test.xml"), "content");

		Project project =
				new Project(TEST_PROJECT_NAME, tempProjectRoot.toAbsolutePath().toString());
		when(projectService.getProject(TEST_PROJECT_NAME)).thenReturn(project);

		FileTreeNode tree = fileTreeService.getProjectTree(TEST_PROJECT_NAME);

		assertNotNull(tree);
		assertEquals(".", tree.getPath());
		assertTrue(tree.getChildren().stream().anyMatch(n -> n.getPath().equals("test.xml")));
	}

	@Test
	@DisplayName("Should throw IllegalArgumentException when the project directory does not exist on disk")
	void getProjectTree_ProjectDirectoryDoesNotExist_ThrowsIllegalArgument()
			throws IOException, ProjectNotFoundException {
		stubToAbsolutePath();

		Path nonExistentDir = tempProjectRoot.resolve("nonexistent");
		Project project =
				new Project(TEST_PROJECT_NAME, nonExistentDir.toAbsolutePath().toString());
		when(projectService.getProject(TEST_PROJECT_NAME)).thenReturn(project);

		IllegalArgumentException ex =
				assertThrows(IllegalArgumentException.class, () -> fileTreeService.getProjectTree(TEST_PROJECT_NAME));
		assertTrue(ex.getMessage().contains("Project directory does not exist"));
	}

	@Test
	@DisplayName("Should return absolute paths for all nodes in local environment")
	void getShallowDirectoryTree_LocalEnvironment_UsesAbsolutePaths() throws IOException, ProjectNotFoundException {
		stubToAbsolutePath();
		when(fileSystemStorage.isLocalEnvironment()).thenReturn(true);

		Files.writeString(tempProjectRoot.resolve("file.xml"), "<config/>");

		Project project =
				new Project(TEST_PROJECT_NAME, tempProjectRoot.toAbsolutePath().toString());
		when(projectService.getProject(TEST_PROJECT_NAME)).thenReturn(project);

		FileTreeNode node = fileTreeService.getShallowDirectoryTree(
				TEST_PROJECT_NAME, tempProjectRoot.toAbsolutePath().toString());

		assertNotNull(node);
		assertEquals(NodeType.DIRECTORY, node.getType());
		assertTrue(Paths.get(node.getPath()).isAbsolute(), "Root node path must be absolute");
		assertTrue(
				node.getChildren().stream().allMatch(c -> Paths.get(c.getPath()).isAbsolute()),
				"All child paths must be absolute"
		);
	}

	private void stubCreateProjectDirectory() throws IOException {
		when(fileSystemStorage.createProjectDirectory(anyString())).thenAnswer(invocation -> {
			String path = invocation.getArgument(0);
			Path dir = Paths.get(path);
			Files.createDirectories(dir);
			return dir;
		});
	}
}
