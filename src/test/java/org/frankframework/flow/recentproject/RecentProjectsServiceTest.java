package org.frankframework.flow.recentproject;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.IOException;
import java.nio.file.Path;
import java.util.List;
import org.frankframework.flow.filesystem.FileSystemStorage;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.api.io.TempDir;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class RecentProjectsServiceTest {

	@Mock
	private FileSystemStorage fileSystemStorage;

	private RecentProjectsService service;
	private final ObjectMapper objectMapper = new ObjectMapper();

	private String storedJson;

	@TempDir
	Path tempDir;

	@BeforeEach
	void setUp() throws IOException {
		storedJson = null;

		when(fileSystemStorage.isLocalEnvironment()).thenReturn(false);

		when(fileSystemStorage.readFile(anyString())).thenAnswer(invocation -> {
			if (storedJson == null) throw new IOException("File not found");
			return storedJson;
		});

		service = new RecentProjectsService(fileSystemStorage, objectMapper);
	}

	private void stubWriteFile() throws IOException {
		doAnswer(invocation -> {
					storedJson = invocation.getArgument(1);
					return null;
				})
				.when(fileSystemStorage)
				.writeFile(anyString(), anyString());
	}

	@Test
	void getRecentProjectsReturnsEmptyListInitially() {
		List<RecentProject> projects = service.getRecentProjects();
		assertNotNull(projects);
		assertTrue(projects.isEmpty());
	}

	@Test
	void addRecentProjectStoresProject() throws IOException {
		stubWriteFile();

		service.addRecentProject("MyProject", "/path/to/project");

		List<RecentProject> projects = service.getRecentProjects();
		assertEquals(1, projects.size());
		assertEquals("MyProject", projects.getFirst().name());
	}

	@Test
	void addRecentProjectMovesExistingToFront() throws IOException {
		stubWriteFile();

		service.addRecentProject("First", "/path/first");
		service.addRecentProject("Second", "/path/second");
		service.addRecentProject("First", "/path/first");

		List<RecentProject> projects = service.getRecentProjects();
		assertEquals(2, projects.size());
		assertEquals("First", projects.getFirst().name());
		assertEquals("Second", projects.get(1).name());
	}

	@Test
	void addRecentProjectLimitsToMaxSize() throws IOException {
		stubWriteFile();

		for (int i = 0; i < 15; i++) {
			service.addRecentProject("Project" + i, "/path/project" + i);
		}

		List<RecentProject> projects = service.getRecentProjects();
		assertEquals(10, projects.size());
		assertEquals("Project14", projects.getFirst().name());
	}

	@Test
	void removeRecentProjectDeletesEntry() throws IOException {
		stubWriteFile();

		service.addRecentProject("ToRemove", "/path/to-remove");
		service.addRecentProject("ToKeep", "/path/to-keep");

		service.removeRecentProject("/path/to-remove");

		List<RecentProject> projects = service.getRecentProjects();
		assertEquals(1, projects.size());
		assertEquals("ToKeep", projects.getFirst().name());
	}

	@Test
	void removeRecentProjectIgnoresNonExistent() throws IOException {
		stubWriteFile();

		service.addRecentProject("Existing", "/path/existing");

		service.removeRecentProject("/path/nonexistent");

		List<RecentProject> projects = service.getRecentProjects();
		assertEquals(1, projects.size());
	}

	@Test
	void addRecentProjectIgnoresNullName() {
		service.addRecentProject(null, "/path");

		List<RecentProject> projects = service.getRecentProjects();
		assertTrue(projects.isEmpty());
	}

	@Test
	void addRecentProjectIgnoresBlankName() {
		service.addRecentProject("   ", "/path");

		List<RecentProject> projects = service.getRecentProjects();
		assertTrue(projects.isEmpty());
	}

	@Test
	void addRecentProjectIgnoresNullPath() {
		service.addRecentProject("Name", null);

		List<RecentProject> projects = service.getRecentProjects();
		assertTrue(projects.isEmpty());
	}

	@Test
	void addRecentProjectIgnoresBlankPath() {
		service.addRecentProject("Name", "   ");

		List<RecentProject> projects = service.getRecentProjects();
		assertTrue(projects.isEmpty());
	}

	@Test
	void removeRecentProjectIgnoresNull() throws IOException {
		stubWriteFile();

		service.addRecentProject("Existing", "/path/existing");

		service.removeRecentProject(null);

		assertEquals(1, service.getRecentProjects().size());
	}

	@Test
	void removeRecentProjectIgnoresBlank() throws IOException {
		stubWriteFile();

		service.addRecentProject("Existing", "/path/existing");

		service.removeRecentProject("   ");

		assertEquals(1, service.getRecentProjects().size());
	}

	@Test
	void addRecentProjectSetsLastOpenedTimestamp() throws IOException {
		stubWriteFile();

		service.addRecentProject("Project", "/path/project");

		List<RecentProject> projects = service.getRecentProjects();
		assertNotNull(projects.getFirst().lastOpened());
		assertFalse(projects.getFirst().lastOpened().isEmpty());
	}

	@Test
	void getRecentProjectsHandlesCorruptJson() {
		storedJson = "not valid json";

		List<RecentProject> projects = service.getRecentProjects();
		assertNotNull(projects);
		assertTrue(projects.isEmpty());
	}

	@Test
	void addRecentProjectSavesToStorage() throws IOException {
		stubWriteFile();

		service.addRecentProject("Project", "/path/project");

		verify(fileSystemStorage).writeFile(eq("recent-projects.json"), anyString());
	}

	@Test
	void removeRecentProjectSavesToStorage() throws IOException {
		stubWriteFile();

		service.addRecentProject("Project", "/path/project");
		reset(fileSystemStorage);
		when(fileSystemStorage.isLocalEnvironment()).thenReturn(false);
		when(fileSystemStorage.readFile(anyString())).thenAnswer(inv -> storedJson);
		doAnswer(inv -> {
					storedJson = inv.getArgument(1);
					return null;
				})
				.when(fileSystemStorage)
				.writeFile(anyString(), anyString());

		service.removeRecentProject("/path/project");

		verify(fileSystemStorage).writeFile(eq("recent-projects.json"), anyString());
	}
}
