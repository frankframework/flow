package org.frankframework.flow.filetree;

import java.io.IOException;
import org.frankframework.flow.exception.ApiException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/projects")
public class FileTreeController {

	private final FileTreeService fileTreeService;

	public FileTreeController(FileTreeService fileTreeService) {
		this.fileTreeService = fileTreeService;
	}

	@GetMapping("/{name}/tree")
	public FileTreeNode getProjectTree(@PathVariable String name) throws IOException {
		return fileTreeService.getProjectTree(name);
	}

	@GetMapping("/{name}/tree/configurations")
	public FileTreeNode getConfigurationTree(
			@PathVariable String name, @RequestParam(required = false, defaultValue = "false") boolean shallow)
			throws IOException {
		if (shallow) {
			return fileTreeService.getShallowConfigurationsDirectoryTree(name);
		} else {
			return fileTreeService.getConfigurationsDirectoryTree(name);
		}
	}

	@GetMapping(value = "/{projectName}", params = "path")
	public FileTreeNode getDirectoryContent(@PathVariable String projectName, @RequestParam String path)
			throws IOException {
		return fileTreeService.getShallowDirectoryTree(projectName, path);
	}

	@PostMapping("/{projectName}/files")
	public ResponseEntity<FileTreeNode> createFile(@PathVariable String projectName, @RequestBody FileCreateDTO dto)
			throws IOException, ApiException {
		FileTreeNode node = fileTreeService.createFile(projectName, dto.path(), dto.name());
		return ResponseEntity.status(HttpStatus.CREATED.value()).body(node);
	}

	@PostMapping("/{projectName}/folders")
	public ResponseEntity<FileTreeNode> createFolder(@PathVariable String projectName, @RequestBody FileCreateDTO dto)
			throws IOException {
		FileTreeNode node = fileTreeService.createFolder(projectName, dto.path(), dto.name());
		return ResponseEntity.status(HttpStatus.CREATED.value()).body(node);
	}

	@PatchMapping("/{projectName}/files/rename")
	public ResponseEntity<FileTreeNode> renameFile(@PathVariable String projectName, @RequestBody FileRenameDTO dto)
			throws IOException {
		FileTreeNode node = fileTreeService.renameFile(projectName, dto.oldPath(), dto.newName());
		return ResponseEntity.ok(node);
	}

	@DeleteMapping("/{projectName}/files")
	public ResponseEntity<Void> deleteFile(@PathVariable String projectName, @RequestParam String path)
			throws IOException {
		fileTreeService.deleteFile(projectName, path);
		return ResponseEntity.noContent().build();
	}
}
