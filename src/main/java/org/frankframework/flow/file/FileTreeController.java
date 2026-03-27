package org.frankframework.flow.file;

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
@RequestMapping("/projects/{projectName}")
public class FileTreeController {

	private final FileTreeService fileTreeService;

	public FileTreeController(FileTreeService fileTreeService) {
		this.fileTreeService = fileTreeService;
	}

	@GetMapping("/tree")
	public FileTreeNode getProjectTree(@PathVariable String projectName) throws IOException {
		return fileTreeService.getProjectTree(projectName);
	}

	@GetMapping("/tree/configuration")
	public FileTreeNode getConfigurationTree(
			@PathVariable String projectName,
			@RequestParam(required = false, defaultValue = "false") boolean shallow
	) throws IOException {
		if (shallow) {
			return fileTreeService.getShallowConfigurationsDirectoryTree(projectName);
		} else {
			return fileTreeService.getConfigurationsDirectoryTree(projectName);
		}
	}

	@GetMapping(value = "/tree/directory", params = "path")
	public FileTreeNode getDirectoryContent(
			@PathVariable String projectName,
			@RequestParam String path
	) throws IOException {
		return fileTreeService.getShallowDirectoryTree(projectName, path);
	}

	@PostMapping("/folder")
	public ResponseEntity<FileTreeNode> createFolder(@PathVariable String projectName, @RequestBody FolderCreateDTO folderCreate) throws IOException {
		FileTreeNode node = fileTreeService.createFolder(projectName, folderCreate.path());
		return ResponseEntity.status(HttpStatus.CREATED.value()).body(node);
	}
}
