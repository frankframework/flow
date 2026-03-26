package org.frankframework.flow.file;

import org.frankframework.flow.exception.ApiException;

import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.io.IOException;

@RestController
@RequestMapping("/projects/{projectName}/files")
public class FileController {

	private final FileService fileService;

	public FileController(FileService fileService) {
		this.fileService = fileService;
	}

	@GetMapping("/{filePath}")
	public ResponseEntity<FileDTO> getFile(@PathVariable String projectName, @PathVariable String filePath) throws IOException {
		FileDTO file = fileService.readFile(projectName, filePath);
		MediaType fileType = MediaType.valueOf(file.type());
		return ResponseEntity.ok().contentType(fileType).body(file);
	}

	@PostMapping("/{filePath}")
	public ResponseEntity<Object> createOrUpdateFile(
			@PathVariable String projectName,
			@PathVariable String filePath,
			@RequestBody String fileContent
	) throws IOException, ApiException {
		FileTreeNode node = fileService.createOrUpdateFile(projectName, filePath, fileContent);
		return ResponseEntity.status(HttpStatus.CREATED.value()).body(node);
	}

	@PostMapping("/move")
	public ResponseEntity<FileTreeNode> renameFile(@PathVariable String projectName, @RequestBody FileRenameDTO dto) throws IOException {
		FileTreeNode node = fileService.renameFile(projectName, dto.oldPath(), dto.newPath());
		return ResponseEntity.ok(node);
	}

	@DeleteMapping("/{filePath}")
	public ResponseEntity<Void> deleteFile(@PathVariable String projectName, @PathVariable String filePath) throws IOException {
		fileService.deleteFile(projectName, filePath);
		return ResponseEntity.noContent().build();
	}
}
