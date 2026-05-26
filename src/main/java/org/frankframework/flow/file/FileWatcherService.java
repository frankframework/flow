package org.frankframework.flow.file;

import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import java.io.IOException;
import java.nio.file.ClosedWatchServiceException;
import java.nio.file.FileSystems;
import java.nio.file.FileVisitResult;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.SimpleFileVisitor;
import java.nio.file.StandardWatchEventKinds;
import java.nio.file.WatchEvent;
import java.nio.file.WatchKey;
import java.nio.file.WatchService;
import java.nio.file.attribute.BasicFileAttributes;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.ScheduledFuture;
import java.util.concurrent.TimeUnit;
import lombok.extern.log4j.Log4j2;
import org.frankframework.flow.filesystem.FileSystemStorage;
import org.frankframework.flow.project.ConfigurationProject;
import org.frankframework.flow.project.ConfigurationProjectService;
import org.frankframework.flow.sse.SseChannelService;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

@Log4j2
@Service
public class FileWatcherService {

	private static final long DEBOUNCE_DELAY_MS = 150;
	private static final Set<String> IGNORED_DIRECTORIES = Set.of(".git", "target", "node_modules");

	private final FileSystemStorage fileSystemStorage;
	private final FileTreeService fileTreeService;
	private final ConfigurationProjectService configurationProjectService;
	private final SseChannelService sseChannelService;

	private WatchService watchService;

	private final Map<WatchKey, String> watchKeyChannels = new ConcurrentHashMap<>();
	private final Map<String, Runnable> channelCallbacks = new ConcurrentHashMap<>();
	private final Map<String, ScheduledFuture<?>> pendingBroadcasts = new ConcurrentHashMap<>();

	private final ScheduledExecutorService debounceExecutor = Executors.newSingleThreadScheduledExecutor(
			Thread.ofVirtual().name("file-watcher-debounce", 0).factory()
	);

	public FileWatcherService(
			FileSystemStorage fileSystemStorage,
			FileTreeService fileTreeService,
			ConfigurationProjectService configurationProjectService,
			SseChannelService sseChannelService
	) {
		this.fileSystemStorage = fileSystemStorage;
		this.fileTreeService = fileTreeService;
		this.configurationProjectService = configurationProjectService;
		this.sseChannelService = sseChannelService;
	}

	@PostConstruct
	public void start() {
		if (!fileSystemStorage.isLocalEnvironment()) {
			return;
		}

		try {
			watchService = FileSystems.getDefault().newWatchService();
			Thread.ofVirtual().name("file-watcher").start(this::watchLoop);
			log.info("File watcher service started");
		} catch (IOException exception) {
			log.error("Failed to start file watcher", exception);
		}
	}

	@PreDestroy
	public void stop() {
		debounceExecutor.shutdownNow();
		if (watchService != null) {
			try {
				watchService.close();
			} catch (IOException exception) {
				log.warn("Failed to close watch service", exception);
			}
		}
	}

	public SseEmitter subscribeToProject(String projectName) {
		if (watchService == null) {
			return sseChannelService.subscribe(projectName);
		}
		try {
			ConfigurationProject project = configurationProjectService.getProject(projectName);
			Path projectPath = fileSystemStorage.toAbsolutePath(project.getRootPath());
			String channelId = projectPath.toString();
			channelCallbacks.put(channelId, () -> fileTreeService.invalidateTreeCache(projectName));
			registerRecursively(projectPath, channelId);

			return sseChannelService.subscribe(channelId);
		} catch (Exception exception) {
			log.warn("Failed to register project for watching: {}", projectName, exception);
			return sseChannelService.subscribe(projectName);
		}
	}

	public SseEmitter subscribeToPath(Path absolutePath) throws IOException {
		String channelId = absolutePath.toString();
		if (watchService != null && Files.isDirectory(absolutePath)) {
			WatchKey key = absolutePath.register(
					watchService,
					StandardWatchEventKinds.ENTRY_CREATE,
					StandardWatchEventKinds.ENTRY_DELETE,
					StandardWatchEventKinds.ENTRY_MODIFY
			);
			watchKeyChannels.put(key, channelId);
		}
		return sseChannelService.subscribe(channelId);
	}

	private void registerRecursively(Path dir, String channelId) throws IOException {
		Files.walkFileTree(dir, new SimpleFileVisitor<>() {

			@Override
			public FileVisitResult preVisitDirectory(Path directory, BasicFileAttributes attrs) throws IOException {
				String name = directory.getFileName() != null ? directory.getFileName().toString() : "";
				if (IGNORED_DIRECTORIES.contains(name)) {
					return FileVisitResult.SKIP_SUBTREE;
				}
				WatchKey key = directory.register(
						watchService,
						StandardWatchEventKinds.ENTRY_CREATE,
						StandardWatchEventKinds.ENTRY_DELETE,
						StandardWatchEventKinds.ENTRY_MODIFY
				);
				watchKeyChannels.put(key, channelId);
				return FileVisitResult.CONTINUE;
			}
		});
	}

	private void watchLoop() {
		while (!Thread.currentThread().isInterrupted()) {
			WatchKey key;
			try {
				key = watchService.take();
			} catch (InterruptedException exception) {
				Thread.currentThread().interrupt();
				break;

			} catch (ClosedWatchServiceException exception) {
				break;
			}

			String channelId = watchKeyChannels.get(key);
			if (channelId == null) {
				key.reset();
				continue;
			}

			registerNewSubdirectories(key, channelId);
			scheduleBroadcast(channelId);

			if (!key.reset()) {
				watchKeyChannels.remove(key);
			}
		}
	}

	private void registerNewSubdirectories(WatchKey key, String channelId) {
		Path watchedDir = (Path) key.watchable();
		for (WatchEvent<?> event : key.pollEvents()) {
			if (event.kind() != StandardWatchEventKinds.ENTRY_CREATE) {
				continue;
			}

			Path created = watchedDir.resolve(((WatchEvent<Path>) event).context());
			if (Files.isDirectory(created)) {
				try {
					registerRecursively(created, channelId);
				} catch (IOException exception) {
					log.warn("Failed to register new directory: {}", created);
				}
			}
		}
	}

	private void scheduleBroadcast(String channelId) {
		ScheduledFuture<?> existing = pendingBroadcasts.remove(channelId);
		if (existing != null) {
			existing.cancel(false);
		}
		pendingBroadcasts.put(channelId, debounceExecutor.schedule(() -> {
			Runnable callback = channelCallbacks.get(channelId);
			if (callback != null) {
				callback.run();
			}

			sseChannelService.broadcast(channelId, SseEmitter.event().name("file-change").data("changed"));
			pendingBroadcasts.remove(channelId);
		}, DEBOUNCE_DELAY_MS, TimeUnit.MILLISECONDS));
	}
}
