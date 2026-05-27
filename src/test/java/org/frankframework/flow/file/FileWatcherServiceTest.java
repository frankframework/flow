package org.frankframework.flow.file;

import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.Mockito.after;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Comparator;
import org.frankframework.flow.filesystem.FileSystemStorage;
import org.frankframework.flow.project.ConfigurationProject;
import org.frankframework.flow.project.ConfigurationProjectService;
import org.frankframework.flow.sse.SseChannelService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

@ExtendWith(MockitoExtension.class)
class FileWatcherServiceTest {

	@Mock
	private FileSystemStorage fileSystemStorage;

	@Mock
	private FileTreeService fileTreeService;

	@Mock
	private ConfigurationProjectService configurationProjectService;

	private FileWatcherService service;
	private Path tempDir;

	@BeforeEach
	void setUp() throws IOException {
		tempDir = Files.createTempDirectory("file-watcher-test");
		when(fileSystemStorage.isLocalEnvironment()).thenReturn(true);
		service = new FileWatcherService(fileSystemStorage, fileTreeService, configurationProjectService, new SseChannelService());
		service.start();
	}

	@AfterEach
	void tearDown() throws IOException {
		service.stop();
		try (var stream = Files.walk(tempDir)) {
			stream.sorted(Comparator.reverseOrder()).forEach(path -> {
				try {
					Files.delete(path);
				} catch (IOException exception) {
					throw new UncheckedIOException("Failed to delete " + path, exception);
				}
			});
		}
	}

	@Test
	void cloudEnvironment_doesNotStartWatchService() {
		when(fileSystemStorage.isLocalEnvironment()).thenReturn(false);
		FileWatcherService cloudService = new FileWatcherService(fileSystemStorage, fileTreeService, configurationProjectService, new SseChannelService());
		cloudService.start();

		SseEmitter emitter = cloudService.subscribeToProject("project");
		cloudService.stop();

		assertNotNull(emitter);
	}

	@Test
	void subscribeToProject_returnsEmitter() {
		ConfigurationProject project = new ConfigurationProject("test", tempDir.toString());
		when(configurationProjectService.getProject("test")).thenReturn(project);
		when(fileSystemStorage.toAbsolutePath(tempDir.toString())).thenReturn(tempDir);

		SseEmitter emitter = service.subscribeToProject("test");

		assertNotNull(emitter);
	}

	@Test
	void subscribeToPath_returnsEmitter() throws IOException {
		SseEmitter emitter = service.subscribeToPath(tempDir);

		assertNotNull(emitter);
	}

	@Test
	void subscribeToProject_onFileChange_invalidatesTreeCache() throws Exception {
		ConfigurationProject project = new ConfigurationProject("test", tempDir.toString());
		when(configurationProjectService.getProject("test")).thenReturn(project);
		when(fileSystemStorage.toAbsolutePath(tempDir.toString())).thenReturn(tempDir);

		service.subscribeToProject("test");

		Files.writeString(tempDir.resolve("new-file.xml"), "<Configuration/>");

		verify(fileTreeService, after(2000).atLeastOnce()).invalidateTreeCache("test");
	}

	@Test
	void subscribeToProject_onFileChangeInNewSubdirectory_invalidatesTreeCache() throws Exception {
		ConfigurationProject project = new ConfigurationProject("test", tempDir.toString());
		when(configurationProjectService.getProject("test")).thenReturn(project);
		when(fileSystemStorage.toAbsolutePath(tempDir.toString())).thenReturn(tempDir);

		service.subscribeToProject("test");

		Path subDir = Files.createDirectory(tempDir.resolve("subdir"));
		Files.writeString(subDir.resolve("config.xml"), "<Configuration/>");

		verify(fileTreeService, after(2000).atLeastOnce()).invalidateTreeCache("test");
	}

	@Test
	void subscribeToProject_skipsGitAndTargetDirectories() throws Exception {
		Path gitDir = Files.createDirectory(tempDir.resolve(".git"));
		Path targetDir = Files.createDirectory(tempDir.resolve("target"));

		ConfigurationProject project = new ConfigurationProject("test", tempDir.toString());
		when(configurationProjectService.getProject("test")).thenReturn(project);
		when(fileSystemStorage.toAbsolutePath(tempDir.toString())).thenReturn(tempDir);

		service.subscribeToProject("test");

		Files.writeString(gitDir.resolve("HEAD"), "ref: refs/heads/main");
		Files.writeString(targetDir.resolve("output.class"), "bytecode");

		verify(fileTreeService, after(500).never()).invalidateTreeCache("test");
	}

	@Test
	void subscribeToProject_unknownProject_returnsEmitterWithoutThrowing() {
		when(configurationProjectService.getProject("unknown"))
				.thenThrow(new RuntimeException("project not found"));

		SseEmitter emitter = service.subscribeToProject("unknown");

		assertNotNull(emitter);
	}

	@Test
	void multipleSubscribers_allReceiveBroadcast() throws Exception {
		ConfigurationProject project = new ConfigurationProject("test", tempDir.toString());
		when(configurationProjectService.getProject("test")).thenReturn(project);
		when(fileSystemStorage.toAbsolutePath(tempDir.toString())).thenReturn(tempDir);

		service.subscribeToProject("test");
		service.subscribeToProject("test");

		Files.writeString(tempDir.resolve("file.xml"), "<Configuration/>");

		verify(fileTreeService, after(2000).atLeastOnce()).invalidateTreeCache("test");
	}

	@Test
	void subscribeToPath_onFileChange_doesNotInvalidateProjectCache() throws Exception {
		service.subscribeToPath(tempDir);

		Files.writeString(tempDir.resolve("new-file.xml"), "<Configuration/>");

		verify(fileTreeService, after(500).never()).invalidateTreeCache(org.mockito.ArgumentMatchers.any());
	}
}
