package org.frankframework.flow.filesystem;

import static org.junit.jupiter.api.Assertions.*;

import java.io.IOException;
import java.nio.file.FileAlreadyExistsException;
import java.nio.file.Files;
import java.nio.file.NoSuchFileException;
import java.nio.file.Path;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

public class FileOperationsTest {

	@TempDir
	Path tempDir;

	@Test
	@DisplayName("Should create file at the given path and return it")
	public void createFile_CreatesFileAndReturnsPath() throws IOException {
		Path file = tempDir.resolve("newFile.txt");

		Path result = FileOperations.createFile(file);

		assertTrue(Files.exists(result));
		assertTrue(Files.isRegularFile(result));
		assertEquals(file, result);
	}

	@Test
	@DisplayName("Should create all missing parent directories before creating the file")
	public void createFile_CreatesParentDirectoriesIfMissing() throws IOException {
		Path file = tempDir.resolve("parent/child/deep/file.xml");

		FileOperations.createFile(file);

		assertTrue(Files.exists(file));
		assertTrue(Files.isRegularFile(file));
	}

	@Test
	@DisplayName("Should throw FileAlreadyExistsException when the file already exists")
	public void createFile_ThrowsWhenFileAlreadyExists() throws IOException {
		Path file = Files.createFile(tempDir.resolve("exists.txt"));

		assertThrows(FileAlreadyExistsException.class, () -> FileOperations.createFile(file));
	}

	@Test
	@DisplayName("Should create file even when only one level of parent is missing")
	public void createFile_CreatesOneParentDirectory() throws IOException {
		Path file = tempDir.resolve("onelevel/file.xml");

		FileOperations.createFile(file);

		assertTrue(Files.isRegularFile(file));
	}

	@Test
	@DisplayName("Should delete a single regular file")
	public void deleteRecursively_DeletesSingleFile() throws IOException {
		Path file = Files.writeString(tempDir.resolve("file.txt"), "content");

		FileOperations.deleteRecursively(file);

		assertFalse(Files.exists(file));
	}

	@Test
	@DisplayName("Should delete an empty directory")
	public void deleteRecursively_DeletesEmptyDirectory() throws IOException {
		Path dir = Files.createDirectory(tempDir.resolve("emptyDir"));

		FileOperations.deleteRecursively(dir);

		assertFalse(Files.exists(dir));
	}

	@Test
	@DisplayName("Should recursively delete a directory with nested files and subdirectories")
	public void deleteRecursively_DeletesDirectoryWithNestedContent() throws IOException {
		Path dir = Files.createDirectory(tempDir.resolve("dir"));
		Path subDir = Files.createDirectory(dir.resolve("subdir"));
		Files.writeString(subDir.resolve("deep.txt"), "content");
		Files.writeString(dir.resolve("root.txt"), "more content");

		FileOperations.deleteRecursively(dir);

		assertFalse(Files.exists(dir));
	}

	@Test
	@DisplayName("Should delete a deeply nested directory structure")
	public void deleteRecursively_DeletesDeeplyNestedStructure() throws IOException {
		Path root = Files.createDirectory(tempDir.resolve("root"));
		Path a = Files.createDirectory(root.resolve("a"));
		Path b = Files.createDirectory(a.resolve("b"));
		Path c = Files.createDirectory(b.resolve("c"));
		Files.writeString(c.resolve("leaf.xml"), "<xml/>");

		FileOperations.deleteRecursively(root);

		assertFalse(Files.exists(root));
	}

	@Test
	@DisplayName("Should throw NoSuchFileException when path does not exist")
	public void deleteRecursively_ThrowsForNonExistentPath() {
		Path nonExistent = tempDir.resolve("ghost.txt");

		assertThrows(NoSuchFileException.class, () -> FileOperations.deleteRecursively(nonExistent));
	}

	@Test
	@DisplayName("Should delete a directory containing multiple sibling files")
	public void deleteRecursively_DeletesDirectoryWithMultipleFiles() throws IOException {
		Path dir = Files.createDirectory(tempDir.resolve("multi"));
		Files.writeString(dir.resolve("a.txt"), "a");
		Files.writeString(dir.resolve("b.txt"), "b");
		Files.writeString(dir.resolve("c.xml"), "<c/>");

		FileOperations.deleteRecursively(dir);

		assertFalse(Files.exists(dir));
	}

	@Test
	@DisplayName("Should move a file to a new location and return the new path")
	public void rename_MovesFileToNewLocation() throws IOException {
		Path source = Files.writeString(tempDir.resolve("source.txt"), "hello");
		Path target = tempDir.resolve("target.txt");

		Path result = FileOperations.rename(source, target);

		assertFalse(Files.exists(source));
		assertTrue(Files.exists(target));
		assertEquals("hello", Files.readString(target));
		assertEquals(target, result);
	}

	@Test
	@DisplayName("Should move a directory and all its contents to a new location")
	public void rename_MovesDirectoryToNewLocation() throws IOException {
		Path srcDir = Files.createDirectory(tempDir.resolve("srcDir"));
		Files.writeString(srcDir.resolve("inner.txt"), "content");
		Path tgtDir = tempDir.resolve("tgtDir");

		FileOperations.rename(srcDir, tgtDir);

		assertFalse(Files.exists(srcDir));
		assertTrue(Files.exists(tgtDir));
		assertTrue(Files.exists(tgtDir.resolve("inner.txt")));
	}

	@Test
	@DisplayName("Should throw IOException when source path does not exist")
	public void rename_ThrowsWhenSourceDoesNotExist() {
		Path source = tempDir.resolve("nonexistent.txt");
		Path target = tempDir.resolve("target.txt");

		assertThrows(IOException.class, () -> FileOperations.rename(source, target));
	}

	@Test
	@DisplayName("Should preserve file content after rename")
	public void rename_PreservesFileContent() throws IOException {
		String content = "<configuration><adapter name=\"Test\"/></configuration>";
		Path source = Files.writeString(tempDir.resolve("config.xml"), content);
		Path target = tempDir.resolve("renamed-config.xml");

		FileOperations.rename(source, target);

		assertEquals(content, Files.readString(target));
	}
}
