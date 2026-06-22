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
import org.frankframework.flow.project.ConfigurationProject;
import org.frankframework.flow.project.ConfigurationProjectService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;

@ExtendWith(MockitoExtension.class)
public class FileTreeServiceTest {

	@Mock
	private ConfigurationProjectService configurationProjectService;

	@Mock
	private FileSystemStorage fileSystemStorage;

	@Mock
	private FileTreeService fileTreeService;

	private Path tempProjectRoot;
	private Path tempConfigurationRoot;
	private static final String TEST_PROJECT_NAME = "FrankFlowTestProject";

	@BeforeEach
	public void setUp() throws IOException {
		FileService fileService = new FileService(configurationProjectService, fileSystemStorage, fileTreeService);
		tempProjectRoot = Files.createTempDirectory("flow_unit_test");
		tempConfigurationRoot = tempProjectRoot.resolve("src/main/configurations/"+TEST_PROJECT_NAME);
		fileTreeService = new FileTreeService(configurationProjectService, fileSystemStorage, fileService);
	}

	@AfterEach
	public void tearDown() throws IOException {
		if (tempProjectRoot != null && Files.exists(tempProjectRoot)) {
			try (var stream = Files.walk(tempProjectRoot)) {
				stream.sorted(Comparator.reverseOrder()).forEach(path -> {
					try {
						Files.delete(path);
					} catch (IOException _) {
						// Ignored to ensure cleanup continues even if some files couldn't be removed
					}
				});
			}
		}
	}

	private void stubToAbsolutePath() {
		when(fileSystemStorage.toAbsolutePath(anyString())).thenAnswer(invocation -> {
			String pathStr = invocation.getArgument(0);
			Path path = Paths.get(pathStr);
			return path.isAbsolute() ? path : tempProjectRoot.resolve(path).normalize();
		});
	}

	@Test
	@DisplayName("Should build a recursive tree structure for deep directories")
	public void getProjectTree_DeepStructure() throws IOException, ApiException {
		stubToAbsolutePath();
		when(fileSystemStorage.isLocalEnvironment()).thenReturn(true);

		Files.writeString(tempProjectRoot.resolve("fileA.xml"), "A");
		Path dir1 = Files.createDirectory(tempProjectRoot.resolve("dir1"));
		Files.writeString(dir1.resolve("fileB.xml"), "B");
		Path dir2 = Files.createDirectory(dir1.resolve("dir2"));
		Files.writeString(dir2.resolve("fileC.xml"), "C");

		ConfigurationProject configurationProject = new ConfigurationProject(TEST_PROJECT_NAME, tempProjectRoot.toAbsolutePath().toString());
		when(configurationProjectService.getProject(TEST_PROJECT_NAME)).thenReturn(configurationProject);

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
	public void getProjectTree_ProjectMissing() throws ApiException {
		when(configurationProjectService.getProject("Unknown")).thenThrow(new ApiException("err", HttpStatus.NOT_FOUND));
		assertThrows(IllegalArgumentException.class, () -> fileTreeService.getProjectTree("Unknown"));
	}

	@Test
	void getProjectTreeThrowsIfProjectDoesNotExist() throws ApiException {
		when(configurationProjectService.getProject("NonExistentProject")).thenThrow(new ApiException("err", HttpStatus.NOT_FOUND));
		IllegalArgumentException exception = assertThrows(
				IllegalArgumentException.class, () -> fileTreeService.getProjectTree("NonExistentProject"));
		assertTrue(exception.getMessage().contains("Project does not exist: NonExistentProject"));
	}

	@Test
	public void getShallowDirectoryTreeReturnsTreeForValidDirectory() throws IOException, ApiException {
		stubToAbsolutePath();

		Files.writeString(tempProjectRoot.resolve("config1.xml"), "<config/>");
		Files.writeString(tempProjectRoot.resolve("readme.txt"), "hello");

		ConfigurationProject configurationProject =
				new ConfigurationProject(TEST_PROJECT_NAME, tempProjectRoot.toAbsolutePath().toString());
		when(configurationProjectService.getProject(TEST_PROJECT_NAME)).thenReturn(configurationProject);

		FileTreeNode node = fileTreeService.getShallowDirectoryTree(TEST_PROJECT_NAME, ".");

		assertNotNull(node);
		assertEquals(NodeType.DIRECTORY, node.getType());
		assertNotNull(node.getChildren());
		assertEquals(2, node.getChildren().size());

		assertTrue(node.getChildren().stream().anyMatch(childNode -> childNode.getName().equals("config1.xml")));
		assertTrue(node.getChildren().stream().anyMatch(childNode -> childNode.getName().equals("readme.txt")));
	}

	@Test
	@DisplayName("Studio directory tree should strip non-configuration files but keep subfolders")
	public void getShallowStudioDirectoryTreeFiltersNonConfigurationFiles() throws IOException, ApiException {
		stubToAbsolutePath();

		Files.writeString(tempProjectRoot.resolve("config1.xml"), "<config/>");
		Files.writeString(tempProjectRoot.resolve("readme.txt"), "hello");
		Files.writeString(tempProjectRoot.resolve("application.properties"), "key=value");
		Files.createDirectory(tempProjectRoot.resolve("subfolder"));

		ConfigurationProject configurationProject =
				new ConfigurationProject(TEST_PROJECT_NAME, tempProjectRoot.toAbsolutePath().toString());
		when(configurationProjectService.getProject(TEST_PROJECT_NAME)).thenReturn(configurationProject);

		FileTreeNode node = fileTreeService.getShallowStudioDirectoryTree(TEST_PROJECT_NAME, ".");

		assertNotNull(node);
		assertEquals(2, node.getChildren().size());
		assertTrue(node.getChildren().stream().anyMatch(childNode -> childNode.getName().equals("config1.xml")));
		assertTrue(node.getChildren().stream().anyMatch(childNode -> childNode.getName().equals("subfolder")));
		assertFalse(node.getChildren().stream().anyMatch(childNode -> childNode.getName().equals("readme.txt")));
		assertFalse(node.getChildren().stream().anyMatch(childNode -> childNode.getName().equals("application.properties")));
	}

	@Test
	void getShallowDirectoryTreeThrowsSecurityExceptionForPathTraversal() throws ApiException {
		stubToAbsolutePath();

		ConfigurationProject configurationProject =
				new ConfigurationProject(TEST_PROJECT_NAME, tempProjectRoot.toAbsolutePath().toString());
		when(configurationProjectService.getProject(TEST_PROJECT_NAME)).thenReturn(configurationProject);

		SecurityException ex = assertThrows(
				SecurityException.class, () -> fileTreeService.getShallowDirectoryTree(TEST_PROJECT_NAME, "../other"));

		assertTrue(ex.getMessage().contains("Invalid path"));
	}

	@Test
	void getShallowDirectoryTreeThrowsIllegalArgumentExceptionIfDirectoryDoesNotExist() throws ApiException {
		stubToAbsolutePath();

		ConfigurationProject configurationProject = new ConfigurationProject(TEST_PROJECT_NAME, tempProjectRoot.toAbsolutePath().toString());
		when(configurationProjectService.getProject(TEST_PROJECT_NAME)).thenReturn(configurationProject);

		IllegalArgumentException ex = assertThrows(
				IllegalArgumentException.class,
				() -> fileTreeService.getShallowDirectoryTree(TEST_PROJECT_NAME, "nonexistent")
		);

		assertTrue(ex.getMessage().contains("Directory does not exist"));
	}

	@Test
	public void getShallowConfigurationsDirectoryTreeReturnsTreeForExistingDirectory() throws IOException, ApiException {
		stubToAbsolutePath();

		Files.createDirectories(tempConfigurationRoot);
		Files.writeString(tempConfigurationRoot.resolve("config1.xml"), "<config/>");
		Files.writeString(tempConfigurationRoot.resolve("readme.txt"), "hello");

		ConfigurationProject configurationProject =
				new ConfigurationProject(TEST_PROJECT_NAME, tempConfigurationRoot.toAbsolutePath().toString());
		when(configurationProjectService.getProject(TEST_PROJECT_NAME)).thenReturn(configurationProject);

		FileTreeNode node = fileTreeService.getShallowConfigurationsDirectoryTree(TEST_PROJECT_NAME);

		assertNotNull(node);
		assertEquals(TEST_PROJECT_NAME, node.getName());
		assertEquals(NodeType.DIRECTORY, node.getType());
		assertNotNull(node.getChildren());
		assertEquals(1, node.getChildren().size());

		assertTrue(node.getChildren().stream().anyMatch(childNode -> childNode.getName().equals("config1.xml")));
		assertFalse(node.getChildren().stream().anyMatch(childNode -> childNode.getName().equals("readme.txt")));
	}

	@Test
	public void getShallowConfigurationsDirectoryTreeThrowsIfDirectoryDoesNotExist() throws ApiException {
		stubToAbsolutePath();

		ConfigurationProject configurationProject = new ConfigurationProject(TEST_PROJECT_NAME, tempConfigurationRoot.toAbsolutePath().toString());
		when(configurationProjectService.getProject(TEST_PROJECT_NAME)).thenReturn(configurationProject);

		IllegalArgumentException ex = assertThrows(
				IllegalArgumentException.class,
				() -> fileTreeService.getShallowConfigurationsDirectoryTree(TEST_PROJECT_NAME)
		);

		assertTrue(ex.getMessage().contains("Configurations directory does not exist"));
	}

	@Test
	public void getShallowConfigurationsDirectoryTreeThrowsIfProjectDoesNotExist() throws ApiException {
		when(configurationProjectService.getProject("NonExistentProject")).thenThrow(new ApiException("err", HttpStatus.NOT_FOUND));

		IllegalArgumentException ex = assertThrows(
				IllegalArgumentException.class,
				() -> fileTreeService.getShallowConfigurationsDirectoryTree("NonExistentProject")
		);

		assertTrue(ex.getMessage().contains("Configurations directory does not exist"));
	}

	@Test
	public void getConfigurationsDirectoryTreeReturnsFullTreeForExistingDirectory() throws IOException, ApiException {
		stubToAbsolutePath();
		when(fileSystemStorage.isLocalEnvironment()).thenReturn(true);

		Files.createDirectories(tempConfigurationRoot);
		Files.writeString(tempConfigurationRoot.resolve("config1.xml"), "<config/>");
		Files.writeString(tempConfigurationRoot.resolve("readme.txt"), "hello");
		Path subDir = tempConfigurationRoot.resolve("subconfigs");
		Files.createDirectory(subDir);
		Files.writeString(subDir.resolve("nested.xml"), "<nested></nested>");
		Files.writeString(subDir.resolve("notes.txt"), "ignored");
		Files.createDirectory(tempConfigurationRoot.resolve("emptyDir"));
		Path docsOnly = tempConfigurationRoot.resolve("docsOnly");
		Files.createDirectory(docsOnly);
		Files.writeString(docsOnly.resolve("guide.md"), "# guide");

		ConfigurationProject configurationProject = new ConfigurationProject(TEST_PROJECT_NAME, tempConfigurationRoot.toAbsolutePath().toString());
		when(configurationProjectService.getProject(TEST_PROJECT_NAME)).thenReturn(configurationProject);

		FileTreeNode node = fileTreeService.getConfigurationsDirectoryTree(TEST_PROJECT_NAME);

		assertNotNull(node);
		assertEquals(TEST_PROJECT_NAME, node.getName());
		assertEquals(NodeType.DIRECTORY, node.getType());
		assertNotNull(node.getChildren());
		assertEquals(2, node.getChildren().size());

		assertTrue(node.getChildren().stream().anyMatch(childNode -> childNode.getName().equals("config1.xml")));
		assertFalse(node.getChildren().stream().anyMatch(childNode -> childNode.getName().equals("readme.txt")));
		assertFalse(node.getChildren().stream().anyMatch(childNode -> childNode.getName().equals("emptyDir")));
		assertFalse(node.getChildren().stream().anyMatch(childNode -> childNode.getName().equals("docsOnly")));

		FileTreeNode subConfigNode = node.getChildren().stream()
				.filter(c -> c.getName().equals("subconfigs"))
				.findFirst()
				.orElseThrow();
		assertEquals(NodeType.DIRECTORY, subConfigNode.getType());
		assertEquals(1, subConfigNode.getChildren().size());
		assertEquals("nested.xml", subConfigNode.getChildren().getFirst().getName());
	}

	@Test
	public void getConfigurationsDirectoryTreeThrowsIfDirectoryDoesNotExist() throws ApiException {
		stubToAbsolutePath();

		ConfigurationProject configurationProject =
				new ConfigurationProject(TEST_PROJECT_NAME, tempConfigurationRoot.toAbsolutePath().toString());
		when(configurationProjectService.getProject(TEST_PROJECT_NAME)).thenReturn(configurationProject);

		IllegalArgumentException ex = assertThrows(
				IllegalArgumentException.class,
				() -> fileTreeService.getConfigurationsDirectoryTree(TEST_PROJECT_NAME)
		);

		assertTrue(ex.getMessage().contains("Configurations directory does not exist"));
	}

	@Test
	public void getConfigurationsDirectoryTreeThrowsIfProjectDoesNotExist() throws ApiException {
		when(configurationProjectService.getProject("NonExistingProject")).thenThrow(new ApiException("err", HttpStatus.NOT_FOUND));

		IllegalArgumentException ex = assertThrows(
				IllegalArgumentException.class,
				() -> fileTreeService.getConfigurationsDirectoryTree("NonExistingProject")
		);

		assertTrue(ex.getMessage().contains("Configurations directory does not exist"));
	}

	@Test
	@DisplayName("Should create a folder and return a FileTreeNode with DIRECTORY type")
	void createFolder_Success() throws IOException, ApiException {
		stubToAbsolutePath();
		stubCreateProjectDirectory();

		ConfigurationProject configurationProject =
				new ConfigurationProject(TEST_PROJECT_NAME, tempProjectRoot.toAbsolutePath().toString());
		when(configurationProjectService.getProject(TEST_PROJECT_NAME)).thenReturn(configurationProject);

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
	void invalidateTreeCache_AllEntries_ForcesRebuild() throws IOException, ApiException {
		stubToAbsolutePath();
		when(fileSystemStorage.isLocalEnvironment()).thenReturn(true);

		ConfigurationProject configurationProject =
				new ConfigurationProject(TEST_PROJECT_NAME, tempProjectRoot.toAbsolutePath().toString());
		when(configurationProjectService.getProject(TEST_PROJECT_NAME)).thenReturn(configurationProject);

		fileTreeService.getProjectTree(TEST_PROJECT_NAME);
		fileTreeService.invalidateTreeCache();
		fileTreeService.getProjectTree(TEST_PROJECT_NAME);

		verify(configurationProjectService, times(2)).getProject(TEST_PROJECT_NAME);
	}

	@Test
	@DisplayName("Should clear only the named project's cache entry so a rebuild is triggered")
	void invalidateTreeCache_SpecificProject_ForcesRebuild() throws IOException, ApiException {
		stubToAbsolutePath();
		when(fileSystemStorage.isLocalEnvironment()).thenReturn(true);

		ConfigurationProject configurationProject =
				new ConfigurationProject(TEST_PROJECT_NAME, tempProjectRoot.toAbsolutePath().toString());
		when(configurationProjectService.getProject(TEST_PROJECT_NAME)).thenReturn(configurationProject);

		fileTreeService.getProjectTree(TEST_PROJECT_NAME);
		fileTreeService.invalidateTreeCache(TEST_PROJECT_NAME);
		fileTreeService.getProjectTree(TEST_PROJECT_NAME);

		verify(configurationProjectService, times(2)).getProject(TEST_PROJECT_NAME);
	}

	@Test
	@DisplayName("Should return the same cached instance on subsequent calls without rebuilding")
	void getProjectTree_ReturnsCachedResult() throws IOException, ApiException {
		stubToAbsolutePath();
		when(fileSystemStorage.isLocalEnvironment()).thenReturn(true);

		ConfigurationProject configurationProject =
				new ConfigurationProject(TEST_PROJECT_NAME, tempProjectRoot.toAbsolutePath().toString());
		when(configurationProjectService.getProject(TEST_PROJECT_NAME)).thenReturn(configurationProject);

		FileTreeNode first = fileTreeService.getProjectTree(TEST_PROJECT_NAME);
		FileTreeNode second = fileTreeService.getProjectTree(TEST_PROJECT_NAME);

		assertSame(first, second);
		verify(configurationProjectService, times(1)).getProject(TEST_PROJECT_NAME);
	}

	@Test
	@DisplayName("Should use relative paths for tree nodes when not in local environment")
	void getProjectTree_NonLocalEnvironment_UsesRelativePaths() throws IOException, ApiException {
		stubToAbsolutePath();
		when(fileSystemStorage.isLocalEnvironment()).thenReturn(false);

		Files.writeString(tempProjectRoot.resolve("test.xml"), "content");

		ConfigurationProject configurationProject =
				new ConfigurationProject(TEST_PROJECT_NAME, tempProjectRoot.toAbsolutePath().toString());
		when(configurationProjectService.getProject(TEST_PROJECT_NAME)).thenReturn(configurationProject);

		FileTreeNode tree = fileTreeService.getProjectTree(TEST_PROJECT_NAME);

		assertNotNull(tree);
		assertEquals(".", tree.getPath());
		assertTrue(tree.getChildren().stream().anyMatch(n -> n.getPath().equals("test.xml")));
	}

	@Test
	@DisplayName("Should throw IllegalArgumentException when the project directory does not exist on disk")
	void getProjectTree_ProjectDirectoryDoesNotExist_ThrowsIllegalArgument() throws ApiException {
		stubToAbsolutePath();

		Path nonExistentDir = tempProjectRoot.resolve("nonexistent");
		ConfigurationProject configurationProject =
				new ConfigurationProject(TEST_PROJECT_NAME, nonExistentDir.toAbsolutePath().toString());
		when(configurationProjectService.getProject(TEST_PROJECT_NAME)).thenReturn(configurationProject);

		IllegalArgumentException ex =
				assertThrows(IllegalArgumentException.class, () -> fileTreeService.getProjectTree(TEST_PROJECT_NAME));
		assertTrue(ex.getMessage().contains("Project directory does not exist"));
	}

	@Test
	@DisplayName("Should return absolute paths for all nodes in local environment")
	void getShallowDirectoryTree_LocalEnvironment_UsesAbsolutePaths() throws IOException, ApiException {
		stubToAbsolutePath();
		when(fileSystemStorage.isLocalEnvironment()).thenReturn(true);

		Files.writeString(tempProjectRoot.resolve("file.xml"), "<config/>");

		ConfigurationProject configurationProject =
				new ConfigurationProject(TEST_PROJECT_NAME, tempProjectRoot.toAbsolutePath().toString());
		when(configurationProjectService.getProject(TEST_PROJECT_NAME)).thenReturn(configurationProject);

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

	@Test
	@DisplayName("Should throw IllegalArgumentException when the project is not registered")
	void getAncestorPath_unknownProject_throwsIllegalArgument() throws ApiException {
		when(configurationProjectService.getProject("Unknown")).thenThrow(new ApiException("err", HttpStatus.NOT_FOUND));
		assertThrows(IllegalArgumentException.class, () -> fileTreeService.getAncestorPath("Unknown", "."));
	}

	@Test
	@DisplayName("Should throw SecurityException when the path escapes the project root")
	void getAncestorPath_pathTraversal_throwsSecurityException() throws ApiException {
		stubToAbsolutePath();
		ConfigurationProject project = new ConfigurationProject(TEST_PROJECT_NAME, tempProjectRoot.toAbsolutePath().toString());
		when(configurationProjectService.getProject(TEST_PROJECT_NAME)).thenReturn(project);

		SecurityException ex = assertThrows(
				SecurityException.class,
				() -> fileTreeService.getAncestorPath(TEST_PROJECT_NAME, "../outside")
		);
		assertTrue(ex.getMessage().contains("Invalid path"));
	}

	@Test
	@DisplayName("Should throw IllegalArgumentException when the target directory does not exist on disk")
	void getAncestorPath_nonExistentDirectory_throwsIllegalArgument() throws ApiException {
		stubToAbsolutePath();
		ConfigurationProject project = new ConfigurationProject(TEST_PROJECT_NAME, tempProjectRoot.toAbsolutePath().toString());
		when(configurationProjectService.getProject(TEST_PROJECT_NAME)).thenReturn(project);

		IllegalArgumentException ex = assertThrows(
				IllegalArgumentException.class,
				() -> fileTreeService.getAncestorPath(TEST_PROJECT_NAME, "nonexistent")
		);
		assertTrue(ex.getMessage().contains("Directory does not exist"));
	}

	@Test
	@DisplayName("Should throw IllegalArgumentException when the target path points to a file instead of a directory")
	void getAncestorPath_pathIsFile_throwsIllegalArgument() throws IOException, ApiException {
		stubToAbsolutePath();
		Files.writeString(tempProjectRoot.resolve("aFile.xml"), "<config/>");
		ConfigurationProject project = new ConfigurationProject(TEST_PROJECT_NAME, tempProjectRoot.toAbsolutePath().toString());
		when(configurationProjectService.getProject(TEST_PROJECT_NAME)).thenReturn(project);

		assertThrows(
				IllegalArgumentException.class,
				() -> fileTreeService.getAncestorPath(TEST_PROJECT_NAME, "aFile.xml")
		);
	}

	@Test
	@DisplayName("Should return the shallow project-root tree when the target is the project root itself")
	void getAncestorPath_targetIsProjectRoot_returnsShallowRootTree() throws IOException, ApiException {
		stubToAbsolutePath();
		when(fileSystemStorage.isLocalEnvironment()).thenReturn(true);

		Files.writeString(tempProjectRoot.resolve("config.xml"), "<config/>");
		Files.createDirectory(tempProjectRoot.resolve("subdir"));

		ConfigurationProject project = new ConfigurationProject(TEST_PROJECT_NAME, tempProjectRoot.toAbsolutePath().toString());
		when(configurationProjectService.getProject(TEST_PROJECT_NAME)).thenReturn(project);

		FileTreeNode result = fileTreeService.getAncestorPath(TEST_PROJECT_NAME, tempProjectRoot.toAbsolutePath().toString());

		assertNotNull(result);
		assertEquals(NodeType.DIRECTORY, result.getType());
		assertEquals(2, result.getChildren().size());
		assertTrue(result.getChildren().stream().anyMatch(c -> c.getName().equals("config.xml")));
		assertTrue(result.getChildren().stream().anyMatch(c -> c.getName().equals("subdir")));
		result.getChildren().forEach(c -> assertNull(c.getChildren()));
	}

	@Test
	@DisplayName("Should return a node with empty children list when the target directory is empty")
	void getAncestorPath_emptyTargetDirectory_spineHasEmptyChildrenList() throws IOException, ApiException {
		stubToAbsolutePath();
		when(fileSystemStorage.isLocalEnvironment()).thenReturn(true);

		Path emptyDir = Files.createDirectory(tempProjectRoot.resolve("emptyDir"));

		ConfigurationProject project = new ConfigurationProject(TEST_PROJECT_NAME, tempProjectRoot.toAbsolutePath().toString());
		when(configurationProjectService.getProject(TEST_PROJECT_NAME)).thenReturn(project);

		FileTreeNode root = fileTreeService.getAncestorPath(TEST_PROJECT_NAME, emptyDir.toAbsolutePath().toString());

		FileTreeNode spineChild = root.getChildren().stream()
				.filter(c -> c.getName().equals("emptyDir"))
				.findFirst().orElseThrow();
		assertNotNull(spineChild.getChildren());
		assertTrue(spineChild.getChildren().isEmpty());
	}

	@Test
	@DisplayName("Spine child has children populated; all siblings have null children")
	void getAncestorPath_singleLevel_spineHasChildrenSiblingsAreShallow() throws IOException, ApiException {
		stubToAbsolutePath();
		when(fileSystemStorage.isLocalEnvironment()).thenReturn(true);

		Path target = Files.createDirectory(tempProjectRoot.resolve("target"));
		Files.writeString(target.resolve("content.xml"), "<c/>");
		Files.createDirectory(tempProjectRoot.resolve("sibling"));
		Files.writeString(tempProjectRoot.resolve("root.xml"), "<r/>");

		ConfigurationProject project = new ConfigurationProject(TEST_PROJECT_NAME, tempProjectRoot.toAbsolutePath().toString());
		when(configurationProjectService.getProject(TEST_PROJECT_NAME)).thenReturn(project);

		FileTreeNode root = fileTreeService.getAncestorPath(TEST_PROJECT_NAME, target.toAbsolutePath().toString());

		assertEquals(3, root.getChildren().size());

		FileTreeNode spineChild = root.getChildren().stream()
				.filter(c -> c.getName().equals("target"))
				.findFirst().orElseThrow();
		assertNotNull(spineChild.getChildren());
		assertEquals(1, spineChild.getChildren().size());
		assertEquals("content.xml", spineChild.getChildren().getFirst().getName());

		root.getChildren().stream()
				.filter(c -> !c.getName().equals("target"))
				.forEach(c -> assertNull(c.getChildren()));
	}

	@Test
	@DisplayName("Two-level path: root has full shallow children; spine expands into target with its shallow children")
	void getAncestorPath_twoLevel_correctSpineAtBothLevels() throws IOException, ApiException {
		stubToAbsolutePath();
		when(fileSystemStorage.isLocalEnvironment()).thenReturn(true);

		Path level1 = Files.createDirectory(tempProjectRoot.resolve("level1"));
		Path level2 = Files.createDirectory(level1.resolve("level2"));
		Files.writeString(level2.resolve("target.xml"), "<t/>");
		Files.createDirectory(level1.resolve("level1Sibling"));
		Files.createDirectory(tempProjectRoot.resolve("rootSibling"));

		ConfigurationProject project = new ConfigurationProject(TEST_PROJECT_NAME, tempProjectRoot.toAbsolutePath().toString());
		when(configurationProjectService.getProject(TEST_PROJECT_NAME)).thenReturn(project);

		FileTreeNode root = fileTreeService.getAncestorPath(TEST_PROJECT_NAME, level2.toAbsolutePath().toString());

		FileTreeNode level1Node = root.getChildren().stream()
				.filter(c -> c.getName().equals("level1")).findFirst().orElseThrow();
		FileTreeNode rootSiblingNode = root.getChildren().stream()
				.filter(c -> c.getName().equals("rootSibling")).findFirst().orElseThrow();
		assertNotNull(level1Node.getChildren());
		assertNull(rootSiblingNode.getChildren());

		FileTreeNode level2Node = level1Node.getChildren().stream()
				.filter(c -> c.getName().equals("level2")).findFirst().orElseThrow();
		FileTreeNode level1SiblingNode = level1Node.getChildren().stream()
				.filter(c -> c.getName().equals("level1Sibling")).findFirst().orElseThrow();
		assertNotNull(level2Node.getChildren());
		assertNull(level1SiblingNode.getChildren());

		assertEquals(1, level2Node.getChildren().size());
		assertEquals("target.xml", level2Node.getChildren().getFirst().getName());
		assertNull(level2Node.getChildren().getFirst().getChildren());
	}

	@Test
	@DisplayName("Three-level deep path: spine is correctly threaded through all intermediate directories")
	void getAncestorPath_threeLevel_spineThreadedCorrectly() throws IOException, ApiException {
		stubToAbsolutePath();
		when(fileSystemStorage.isLocalEnvironment()).thenReturn(true);

		Path l1 = Files.createDirectory(tempProjectRoot.resolve("l1"));
		Path l2 = Files.createDirectory(l1.resolve("l2"));
		Path l3 = Files.createDirectory(l2.resolve("l3"));
		Files.writeString(l3.resolve("deep.xml"), "<d/>");
		Files.createDirectory(l2.resolve("l2Sibling"));
		Files.createDirectory(l1.resolve("l1Sibling"));

		ConfigurationProject project = new ConfigurationProject(TEST_PROJECT_NAME, tempProjectRoot.toAbsolutePath().toString());
		when(configurationProjectService.getProject(TEST_PROJECT_NAME)).thenReturn(project);

		FileTreeNode root = fileTreeService.getAncestorPath(TEST_PROJECT_NAME, l3.toAbsolutePath().toString());

		FileTreeNode l1Node = root.getChildren().stream().filter(c -> c.getName().equals("l1")).findFirst().orElseThrow();
		assertNotNull(l1Node.getChildren());

		FileTreeNode l1SiblingNode = l1Node.getChildren().stream()
				.filter(c -> c.getName().equals("l1Sibling")).findFirst().orElseThrow();
		assertNull(l1SiblingNode.getChildren());

		FileTreeNode l2Node = l1Node.getChildren().stream().filter(c -> c.getName().equals("l2")).findFirst().orElseThrow();
		assertNotNull(l2Node.getChildren());

		FileTreeNode l2SiblingNode = l2Node.getChildren().stream()
				.filter(c -> c.getName().equals("l2Sibling")).findFirst().orElseThrow();
		assertNull(l2SiblingNode.getChildren());

		FileTreeNode l3Node = l2Node.getChildren().stream().filter(c -> c.getName().equals("l3")).findFirst().orElseThrow();
		assertNotNull(l3Node.getChildren());
		assertEquals(1, l3Node.getChildren().size());
		assertEquals("deep.xml", l3Node.getChildren().getFirst().getName());
		assertNull(l3Node.getChildren().getFirst().getChildren());
	}

	@Test
	@DisplayName("Multiple siblings at each spine level: only the single spine child has children set")
	void getAncestorPath_manySiblingsAtEachLevel_exactlyOneSpineChildPerLevel() throws IOException, ApiException {
		stubToAbsolutePath();
		when(fileSystemStorage.isLocalEnvironment()).thenReturn(true);

		Path target = Files.createDirectory(tempProjectRoot.resolve("target"));
		Files.writeString(target.resolve("file.xml"), "<f/>");
		for (int i = 0; i < 4; i++) {
			Files.createDirectory(tempProjectRoot.resolve("sibling" + i));
		}

		ConfigurationProject project = new ConfigurationProject(TEST_PROJECT_NAME, tempProjectRoot.toAbsolutePath().toString());
		when(configurationProjectService.getProject(TEST_PROJECT_NAME)).thenReturn(project);

		FileTreeNode root = fileTreeService.getAncestorPath(TEST_PROJECT_NAME, target.toAbsolutePath().toString());

		long spineCount = root.getChildren().stream().filter(c -> c.getChildren() != null).count();
		assertEquals(1, spineCount);

		FileTreeNode spineChild = root.getChildren().stream()
				.filter(c -> c.getChildren() != null).findFirst().orElseThrow();
		assertEquals("target", spineChild.getName());
	}

	@Test
	@DisplayName("Should use relative paths for all nodes when not in local environment")
	void getAncestorPath_nonLocalEnvironment_usesRelativePaths() throws IOException, ApiException {
		stubToAbsolutePath();
		when(fileSystemStorage.isLocalEnvironment()).thenReturn(false);

		Path subDir = Files.createDirectory(tempProjectRoot.resolve("subdir"));
		Files.writeString(subDir.resolve("file.xml"), "<f/>");

		ConfigurationProject project = new ConfigurationProject(TEST_PROJECT_NAME, tempProjectRoot.toAbsolutePath().toString());
		when(configurationProjectService.getProject(TEST_PROJECT_NAME)).thenReturn(project);

		FileTreeNode root = fileTreeService.getAncestorPath(TEST_PROJECT_NAME, subDir.toAbsolutePath().toString());

		assertFalse(Paths.get(root.getPath()).isAbsolute());

		FileTreeNode spineChild = root.getChildren().stream()
				.filter(c -> c.getName().equals("subdir")).findFirst().orElseThrow();
		assertFalse(Paths.get(spineChild.getPath()).isAbsolute());
		assertFalse(Paths.get(spineChild.getChildren().getFirst().getPath()).isAbsolute());
	}

	@Test
	@DisplayName("Should extract adapter names from .xml files at the target level")
	void getAncestorPath_xmlFilesAtTargetLevel_haveAdapterNamesExtracted() throws IOException, ApiException {
		stubToAbsolutePath();
		when(fileSystemStorage.isLocalEnvironment()).thenReturn(true);

		Path subDir = Files.createDirectory(tempProjectRoot.resolve("subdir"));
		Files.writeString(subDir.resolve("config.xml"),
				"<Configuration><Adapter name=\"MyAdapter\"/></Configuration>");

		ConfigurationProject project = new ConfigurationProject(TEST_PROJECT_NAME, tempProjectRoot.toAbsolutePath().toString());
		when(configurationProjectService.getProject(TEST_PROJECT_NAME)).thenReturn(project);

		FileTreeNode root = fileTreeService.getAncestorPath(TEST_PROJECT_NAME, subDir.toAbsolutePath().toString());
		FileTreeNode spineChild = root.getChildren().stream()
				.filter(c -> c.getName().equals("subdir")).findFirst().orElseThrow();
		FileTreeNode xmlNode = spineChild.getChildren().stream()
				.filter(c -> c.getName().equals("config.xml")).findFirst().orElseThrow();

		assertNotNull(xmlNode.getAdapterNames());
		assertEquals(List.of("MyAdapter"), xmlNode.getAdapterNames());
	}

	@Test
	@DisplayName("Non-.xml files at target level should have null adapterNames")
	void getAncestorPath_nonXmlFilesAtTargetLevel_haveNoAdapterNames() throws IOException, ApiException {
		stubToAbsolutePath();
		when(fileSystemStorage.isLocalEnvironment()).thenReturn(true);

		Path subDir = Files.createDirectory(tempProjectRoot.resolve("subdir"));
		Files.writeString(subDir.resolve("readme.txt"), "hello");

		ConfigurationProject project = new ConfigurationProject(TEST_PROJECT_NAME, tempProjectRoot.toAbsolutePath().toString());
		when(configurationProjectService.getProject(TEST_PROJECT_NAME)).thenReturn(project);

		FileTreeNode root = fileTreeService.getAncestorPath(TEST_PROJECT_NAME, subDir.toAbsolutePath().toString());
		FileTreeNode spineChild = root.getChildren().stream()
				.filter(c -> c.getName().equals("subdir")).findFirst().orElseThrow();
		FileTreeNode txtNode = spineChild.getChildren().stream()
				.filter(c -> c.getName().equals("readme.txt")).findFirst().orElseThrow();

		assertNull(txtNode.getAdapterNames());
	}

	@Test
	@DisplayName("Node types should be correct: DIRECTORY for directories, FILE for files at target level")
	void getAncestorPath_nodeTypesAreCorrect() throws IOException, ApiException {
		stubToAbsolutePath();
		when(fileSystemStorage.isLocalEnvironment()).thenReturn(true);

		Path subDir = Files.createDirectory(tempProjectRoot.resolve("subdir"));
		Files.writeString(subDir.resolve("file.xml"), "<f/>");
		Files.createDirectory(subDir.resolve("nested"));

		ConfigurationProject project = new ConfigurationProject(TEST_PROJECT_NAME, tempProjectRoot.toAbsolutePath().toString());
		when(configurationProjectService.getProject(TEST_PROJECT_NAME)).thenReturn(project);

		FileTreeNode root = fileTreeService.getAncestorPath(TEST_PROJECT_NAME, subDir.toAbsolutePath().toString());
		FileTreeNode spineChild = root.getChildren().stream()
				.filter(c -> c.getName().equals("subdir")).findFirst().orElseThrow();

		assertEquals(NodeType.DIRECTORY, spineChild.getType());

		FileTreeNode fileNode = spineChild.getChildren().stream()
				.filter(c -> c.getName().equals("file.xml")).findFirst().orElseThrow();
		FileTreeNode nestedNode = spineChild.getChildren().stream()
				.filter(c -> c.getName().equals("nested")).findFirst().orElseThrow();

		assertEquals(NodeType.FILE, fileNode.getType());
		assertEquals(NodeType.DIRECTORY, nestedNode.getType());
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
