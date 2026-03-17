package org.frankframework.flow.filesystem;

import java.io.IOException;
import java.nio.file.AccessDeniedException;
import java.util.List;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/filesystem")
public class FilesystemController {

	private final FileSystemStorage fileSystemStorage;

	public FilesystemController(FileSystemStorage fileSystemStorage) {
		this.fileSystemStorage = fileSystemStorage;
	}

	@GetMapping("/browse")
	public ResponseEntity<List<FilesystemEntry>> browse(@RequestParam(required = false, defaultValue = "") String path)
			throws IOException {

		List<FilesystemEntry> entries;
		if (path.isBlank()) {
			entries = fileSystemStorage.listRoots();
		} else {
			try {
				entries = fileSystemStorage.listDirectory(path);
			} catch (AccessDeniedException e) {
				return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
			}
		}

		return ResponseEntity.ok(entries);
	}

	@GetMapping("/default-path")
	public ResponseEntity<Map<String, String>> defaultPath() {
		String home = System.getProperty("user.home");
		return ResponseEntity.ok(Map.of("path", home));
	}
}
