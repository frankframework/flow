package org.frankframework.flow.filesystem;

import java.io.IOException;
import java.nio.file.AccessDeniedException;
import org.frankframework.flow.file.FileWatcherService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

@RestController
@RequestMapping("/filesystem")
public class FilesystemController {

	private final FileSystemStorage fileSystemStorage;
	private final FileWatcherService fileWatcherService;

	public FilesystemController(FileSystemStorage fileSystemStorage, FileWatcherService fileWatcherService) {
		this.fileSystemStorage = fileSystemStorage;
		this.fileWatcherService = fileWatcherService;
	}

	@GetMapping("/browse")
	public ResponseEntity<BrowseResult> browse(@RequestParam(required = false, defaultValue = "") String path)
			throws IOException {
		try {
			return ResponseEntity.ok(fileSystemStorage.browse(path));
		} catch (AccessDeniedException _) {
			return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
		}
	}

	@GetMapping("/watch")
	public SseEmitter watch(@RequestParam String path) throws IOException {
		return fileWatcherService.subscribeToPath(fileSystemStorage.toAbsolutePath(path));
	}
}
