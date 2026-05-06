package org.frankframework.flow.filesystem;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.io.IOException;
import java.nio.file.NoSuchFileException;
import java.nio.file.Path;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class FileSystemStorageBrowseTest {
	private StubStorage storage;

	private static final FilesystemEntry ROOT_ENTRY = new FilesystemEntry("root", "C:\\", "DIRECTORY", false);
	private static final FilesystemEntry CHILD_ENTRY = new FilesystemEntry("child", "C:\\existing", "DIRECTORY", false);

	@BeforeEach
	void setUp() {
		storage = new StubStorage();
	}

	@Test
	void browseNullPathReturnsRoots() throws IOException {
		when(storage.delegate.listRoots()).thenReturn(List.of(ROOT_ENTRY));

		BrowseResult result = storage.browse(null);

		assertEquals("", result.resolvedPath());
		assertEquals("", result.parentPath());
		assertEquals(List.of(ROOT_ENTRY), result.entries());
	}

	@Test
	void browseBlankPathReturnsRoots() throws IOException {
		when(storage.delegate.listRoots()).thenReturn(List.of(ROOT_ENTRY));

		BrowseResult result = storage.browse("   ");

		assertEquals("", result.resolvedPath());
		assertEquals("", result.parentPath());
	}

	@Test
	void browseExistingPathReturnsEntriesAndParent() throws IOException {
		when(storage.delegate.listDirectory("C:\\existing")).thenReturn(List.of(CHILD_ENTRY));

		BrowseResult result = storage.browse("C:\\existing");

		assertEquals("C:\\existing", result.resolvedPath());
		assertEquals("C:\\", result.parentPath());
		assertEquals(List.of(CHILD_ENTRY), result.entries());
	}

	@Test
	void browseWindowsDriveRootHasEmptyParent() throws IOException {
		when(storage.delegate.listDirectory("C:\\")).thenReturn(List.of(CHILD_ENTRY));

		BrowseResult result = storage.browse("C:\\");

		assertEquals("C:\\", result.resolvedPath());
		assertEquals("", result.parentPath());
	}

	@Test
	void browseMissingPathWalksUpToParent() throws IOException {
		when(storage.delegate.listDirectory("C:\\missing")).thenThrow(new NoSuchFileException("C:\\missing"));
		when(storage.delegate.listDirectory("C:\\")).thenReturn(List.of(CHILD_ENTRY));

		BrowseResult result = storage.browse("C:\\missing");

		assertEquals("C:\\", result.resolvedPath());
		assertEquals("", result.parentPath());
		assertEquals(List.of(CHILD_ENTRY), result.entries());
	}

	@Test
	void browseMissingNestedPathWalksUpMultipleLevels() throws IOException {
		when(storage.delegate.listDirectory("C:\\a\\b\\c")).thenThrow(new NoSuchFileException("C:\\a\\b\\c"));
		when(storage.delegate.listDirectory("C:\\a\\b")).thenThrow(new NoSuchFileException("C:\\a\\b"));
		when(storage.delegate.listDirectory("C:\\a")).thenReturn(List.of(CHILD_ENTRY));

		BrowseResult result = storage.browse("C:\\a\\b\\c");

		assertEquals("C:\\a", result.resolvedPath());
		assertEquals("C:\\", result.parentPath());
	}

	@Test
	void browseMissingPathWithNoAccessibleAncestorFallsBackToRoots() throws IOException {
		when(storage.delegate.listDirectory("missing")).thenThrow(new NoSuchFileException("missing"));
		when(storage.delegate.listRoots()).thenReturn(List.of(ROOT_ENTRY));

		BrowseResult result = storage.browse("missing");

		assertEquals("", result.resolvedPath());
		assertEquals("", result.parentPath());
		assertEquals(List.of(ROOT_ENTRY), result.entries());
	}

	@Test
	void browseRelativePathReturnsEntriesAndParent() throws IOException {
		when(storage.delegate.listDirectory("projects/myproject")).thenReturn(List.of(CHILD_ENTRY));

		BrowseResult result = storage.browse("projects/myproject");

		assertEquals("projects/myproject", result.resolvedPath());
		assertEquals("projects", result.parentPath());
	}

	@Test
	void browseRelativeSingleSegmentHasEmptyParent() throws IOException {
		when(storage.delegate.listDirectory("projects")).thenReturn(List.of(CHILD_ENTRY));

		BrowseResult result = storage.browse("projects");

		assertEquals("projects", result.resolvedPath());
		assertEquals("", result.parentPath());
	}

	@Test
	void browseExistingPathDoesNotCallListRoots() throws IOException {
		when(storage.delegate.listDirectory("C:\\existing")).thenReturn(List.of(CHILD_ENTRY));

		storage.browse("C:\\existing");

		verify(storage.delegate, never()).listRoots();
	}

	@Test
	void browseReturnsEmptyEntriesForEmptyDirectory() throws IOException {
		when(storage.delegate.listDirectory("C:\\existing")).thenReturn(List.of());

		BrowseResult result = storage.browse("C:\\existing");

		assertTrue(result.entries().isEmpty());
	}

	/**
	 * Minimal concrete stub so default methods on FileSystemStorage execute normally.
	 * Abstract methods delegate to a Mockito mock for per-test control.
	 */
	private static class StubStorage implements FileSystemStorage {
		final FileSystemStorage delegate = mock(FileSystemStorage.class);

		@Override public boolean isLocalEnvironment() { return true; }
		@Override public List<FilesystemEntry> listRoots() { return delegate.listRoots(); }
		@Override public List<FilesystemEntry> listDirectory(String path) throws IOException { return delegate.listDirectory(path); }
		@Override public String readFile(String path) { return null; }
		@Override public String readFileType(String path) { return null; }
		@Override public void writeFile(String path, String content) {}
		@Override public Path createProjectDirectory(String path) { return null; }
		@Override public Path toAbsolutePath(String path) { return null; }
		@Override public Path createFile(String path) { return null; }
		@Override public void delete(String path) {}
		@Override public Path rename(String oldPath, String newPath) { return null; }
	}
}
