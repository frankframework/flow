package org.frankframework.flow.file;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.when;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Comparator;

import org.frankframework.flow.exception.ApiException;
import org.frankframework.flow.filesystem.FileOperations;
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
class FileServiceTest {

	@Mock
	private ProjectService projectService;

	@Mock
	private FileSystemStorage fileSystemStorage;

	private FileService fileService;
	private Path tempProjectRoot;
	private static final String TEST_PROJECT_NAME = "FrankFlowTestProject";

	@BeforeEach
	public void setUp() throws IOException {
		tempProjectRoot = Files.createTempDirectory("flow_unit_test");
		fileService = new FileService(projectService, fileSystemStorage);
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

	@Test
	@DisplayName("Should throw IllegalArgumentException for a null file name")
	void createFile_NullName_ThrowsIllegalArgument() {
		assertThrows(
				IllegalArgumentException.class,
				() -> fileService.createOrUpdateFile(TEST_PROJECT_NAME, null, "")
		);
	}

	@Test
	@DisplayName("Should throw IllegalArgumentException for a blank file name")
	void createFile_BlankName_ThrowsIllegalArgument() {
		assertThrows(
				IllegalArgumentException.class,
				() -> fileService.createOrUpdateFile(TEST_PROJECT_NAME, "/some/path/\0", "")
		);
	}

	@Test
	@DisplayName("Should throw IllegalArgumentException when file name is double dots")
	void createFile_NameWithDoubleDots_ThrowsIllegalArgument() {
		assertThrows(
				IllegalArgumentException.class,
				() -> fileService.createOrUpdateFile(TEST_PROJECT_NAME, "/some/path/..", "")
		);
	}

	@Test
	@DisplayName("Should create a file and return a FileTreeNode with FILE type")
	void createFile_Success() throws IOException, ApiException {
		stubToAbsolutePath();
		stubCreateFile();

		Path parentPath = tempProjectRoot.toAbsolutePath();
		Project project = new Project(TEST_PROJECT_NAME, parentPath.toString());
		when(projectService.getProject(TEST_PROJECT_NAME)).thenReturn(project);

		FileTreeNode node = fileService.createOrUpdateFile(TEST_PROJECT_NAME, parentPath.resolve("newFile.json").toString(), "");

		assertNotNull(node);
		assertEquals("newFile.json", node.getName());
		assertEquals(NodeType.FILE, node.getType());
		assertTrue(node.getPath().endsWith("newFile.json"));
		assertTrue(Files.exists(tempProjectRoot.resolve("newFile.json")), "File must exist on disk after creation");
	}

	@Test
	@DisplayName("Should throw SecurityException when the file path is outside the project directory")
	void createFile_OutsideProject_ThrowsSecurityException() throws ProjectNotFoundException {
		stubToAbsolutePath();

		Project project =
				new Project(TEST_PROJECT_NAME, tempProjectRoot.toAbsolutePath().toString());
		when(projectService.getProject(TEST_PROJECT_NAME)).thenReturn(project);

		String outsidePath = tempProjectRoot.getParent().toAbsolutePath().toString();
		assertThrows(
				ApiException.class,
				() -> fileService.createOrUpdateFile(TEST_PROJECT_NAME, outsidePath, "escape.json")
		);
	}

	@Test
	@DisplayName("Should throw IllegalArgumentException when project is not found during createFile")
	void createFile_ProjectNotFound_ThrowsIllegalArgument() throws ProjectNotFoundException {
		when(projectService.getProject("Unknown")).thenThrow(new ProjectNotFoundException("err"));

		assertThrows(
				IllegalArgumentException.class, () -> fileService.createOrUpdateFile("Unknown", "/some/path", "file.json"));
	}


	@Test
	@DisplayName("Should rename a file and return a node with FILE type in local environment")
	void renameFile_LocalEnvironment_File() throws IOException, ApiException {
		stubToAbsolutePath();
		stubRename();

		Project project =
				new Project(TEST_PROJECT_NAME, tempProjectRoot.toAbsolutePath().toString());
		when(projectService.getProject(TEST_PROJECT_NAME)).thenReturn(project);

		Path oldFile = Files.writeString(tempProjectRoot.resolve("old.xml"), "content");
		String oldPath = oldFile.toAbsolutePath().toString();
		String newPath = tempProjectRoot.resolve("new.xml").toAbsolutePath().toString();

		FileTreeNode node = fileService.renameFile(TEST_PROJECT_NAME, oldPath, newPath);

		assertEquals("new.xml", node.getName());
		assertEquals(NodeType.FILE, node.getType());
		assertTrue(Files.exists(tempProjectRoot.resolve("new.xml")));
		assertFalse(Files.exists(oldFile));
	}

	@Test
	@DisplayName("Should rename a directory and return a node with DIRECTORY type")
	void renameFile_LocalEnvironment_Directory() throws IOException, ApiException {
		stubToAbsolutePath();
		stubRename();

		Project project =
				new Project(TEST_PROJECT_NAME, tempProjectRoot.toAbsolutePath().toString());
		when(projectService.getProject(TEST_PROJECT_NAME)).thenReturn(project);

		Path oldDir = Files.createDirectory(tempProjectRoot.resolve("oldDir"));
		String oldPath = oldDir.toAbsolutePath().toString();
		String newPath = tempProjectRoot.resolve("newDir").toAbsolutePath().toString();

		FileTreeNode node = fileService.renameFile(TEST_PROJECT_NAME, oldPath, newPath);

		assertEquals("newDir", node.getName());
		assertEquals(NodeType.DIRECTORY, node.getType());
		assertTrue(Files.exists(tempProjectRoot.resolve("newDir")));
	}

	@Test
	@DisplayName("Should throw FileAlreadyExistsException when the target name already exists")
	void renameFile_TargetAlreadyExists_ThrowsFileAlreadyExistsException()
			throws IOException, ProjectNotFoundException {
		stubToAbsolutePath();

		Project project =
				new Project(TEST_PROJECT_NAME, tempProjectRoot.toAbsolutePath().toString());
		when(projectService.getProject(TEST_PROJECT_NAME)).thenReturn(project);

		Files.writeString(tempProjectRoot.resolve("old.xml"), "content");
		Files.writeString(tempProjectRoot.resolve("existing.xml"), "already here");

		String oldPath = tempProjectRoot.resolve("old.xml").toAbsolutePath().toString();
		String newPath = tempProjectRoot.resolve("existing.xml").toAbsolutePath().toString();
		assertThrows(
				ApiException.class,
				() -> fileService.renameFile(TEST_PROJECT_NAME, oldPath, newPath)
		);
	}

	@Test
	@DisplayName("Should throw IllegalArgumentException for an invalid new name during rename")
	void renameFile_InvalidNewName_ThrowsIllegalArgument() {
		assertThrows(
				IllegalArgumentException.class,
				() -> fileService.renameFile(TEST_PROJECT_NAME, "/some/old.xml", "/some/../bad\\name.xml")
		);
	}

	@Test
	@DisplayName("Should use just the new name as path when old path has no slash in non-local environment")
	void renameFile_NonLocalEnvironment_PathWithoutSlash() throws IOException, ApiException {
		stubToAbsolutePath();
		when(fileSystemStorage.rename(anyString(), anyString())).thenReturn(null);

		Project project =
				new Project(TEST_PROJECT_NAME, tempProjectRoot.toAbsolutePath().toString());
		when(projectService.getProject(TEST_PROJECT_NAME)).thenReturn(project);

		Path oldPath = tempProjectRoot.resolve("old.xml");
		Path newPath = tempProjectRoot.resolve("new.xml");
		Files.writeString(oldPath, "content");

		FileTreeNode node = fileService.renameFile(TEST_PROJECT_NAME, oldPath.toString(), newPath.toString());

		assertEquals("new.xml", node.getName());
		assertEquals(newPath.toString(), node.getPath());
	}

	@Test
	@DisplayName("Should delete a file without throwing and invalidate the tree cache")
	void deleteFile_Success() throws IOException, ProjectNotFoundException {
		stubToAbsolutePath();
		stubDelete();

		Project project =
				new Project(TEST_PROJECT_NAME, tempProjectRoot.toAbsolutePath().toString());
		when(projectService.getProject(TEST_PROJECT_NAME)).thenReturn(project);

		Path fileToDelete = Files.writeString(tempProjectRoot.resolve("toDelete.xml"), "content");
		String path = fileToDelete.toAbsolutePath().toString();

		assertDoesNotThrow(() -> fileService.deleteFile(TEST_PROJECT_NAME, path));
		assertFalse(Files.exists(fileToDelete));
	}

	@Test
	@DisplayName("Should throw IllegalArgumentException when project is not found during deleteFile")
	void deleteFile_ProjectNotFound_ThrowsIllegalArgument() throws ProjectNotFoundException {
		when(projectService.getProject("Unknown")).thenThrow(new ProjectNotFoundException("err"));

		assertThrows(
				IllegalArgumentException.class, () -> fileService.deleteFile("Unknown", "/some/path/file.xml"));
	}

	private void stubCreateFile() throws IOException {
		when(fileSystemStorage.createFile(anyString())).thenAnswer(invocation -> {
			String path = invocation.getArgument(0);
			return FileOperations.createFile(Paths.get(path));
		});
	}

	private void stubDelete() throws IOException {
		doAnswer(invocation -> {
			String path = invocation.getArgument(0);
			FileOperations.deleteRecursively(Paths.get(path));
			return null;
		})
				.when(fileSystemStorage)
				.delete(anyString());
	}

	private void stubRename() throws IOException {
		when(fileSystemStorage.rename(anyString(), anyString())).thenAnswer(invocation -> {
			String src = invocation.getArgument(0);
			String dst = invocation.getArgument(1);
			return FileOperations.rename(Paths.get(src), Paths.get(dst));
		});
	}

	private void stubToAbsolutePath() {
		when(fileSystemStorage.toAbsolutePath(anyString())).thenAnswer(invocation -> {
			String path = invocation.getArgument(0);
			Path p = Paths.get(path);
			return p.isAbsolute() ? p : tempProjectRoot.resolve(p).normalize();
		});
	}
}
