package org.frankframework.flow.file;

import java.io.IOException;

import org.frankframework.flow.exception.ApiException;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/projects/{projectName}/file")
public class FileController {

	private final FileService fileService;

	public FileController(FileService fileService) {
		this.fileService = fileService;
	}

	@GetMapping()
	public ResponseEntity<FileDTO> getFile(@PathVariable String projectName, @RequestParam String path) throws ApiException {
		FileDTO file = fileService.readFile(projectName, path);
		return ResponseEntity.ok(file);
	}

	@PutMapping()
	public ResponseEntity<Object> createOrUpdateFile(
			@PathVariable String projectName,
			@RequestParam String path,
			@RequestBody String fileContent
	) throws ApiException {
		FileTreeNode node = fileService.createOrUpdateFile(projectName, path, fileContent);
		return ResponseEntity.status(HttpStatus.CREATED.value()).body(node);
	}

	@PostMapping("move")
	public ResponseEntity<FileTreeNode> renameFile(@PathVariable String projectName, @RequestBody FileRenameDTO dto) throws ApiException {
		FileTreeNode node = fileService.renameFile(projectName, dto.oldPath(), dto.newPath());
		return ResponseEntity.ok(node);
	}

	@DeleteMapping()
	public ResponseEntity<Void> deleteFile(@PathVariable String projectName, @RequestParam String path) throws ApiException {
		fileService.deleteFile(projectName, path);
		return ResponseEntity.noContent().build();
	}
}
