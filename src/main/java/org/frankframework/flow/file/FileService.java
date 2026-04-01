package org.frankframework.flow.file;

import java.io.IOException;
import java.nio.file.FileAlreadyExistsException;
import java.nio.file.Files;
import java.nio.file.Path;
import org.frankframework.flow.exception.ApiException;
import org.frankframework.flow.filesystem.FileSystemStorage;
import org.frankframework.flow.project.Project;
import org.frankframework.flow.project.ProjectNotFoundException;
import org.frankframework.flow.project.ProjectService;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

@Service
public class FileService {

	private final ProjectService projectService;
	private final FileSystemStorage fileSystemStorage;

	public FileService(ProjectService projectService, FileSystemStorage fileSystemStorage) {
		this.projectService = projectService;
		this.fileSystemStorage = fileSystemStorage;
	}

	public FileDTO readFile(String projectName, String path) throws ApiException {
		validatePath(path);
		String content;
		String type;

		try {
			validateWithinProject(projectName, path);
			content = fileSystemStorage.readFile(path);
			type = fileSystemStorage.readFileType(path);
		} catch (IOException exception) {
			throw new ApiException("Failed to read file: " + exception.getMessage(), HttpStatus.UNPROCESSABLE_CONTENT);
		}
		return new FileDTO(content, type);
	}

	public FileTreeNode createOrUpdateFile(String projectName, String path, String fileContent) throws ApiException {
		validatePath(path);
		String fileName = Path.of(path).getFileName().toString();

		try {
			validateWithinProject(projectName, path);
			fileSystemStorage.createFile(path);
			fileSystemStorage.writeFile(path, fileContent);
		} catch (IOException exception) {
			throw new ApiException("Failed to write file: " + exception.getMessage(), HttpStatus.INTERNAL_SERVER_ERROR);
		}

//		invalidateTreeCache(projectName);

		FileTreeNode node = new FileTreeNode();
		node.setName(fileName);
		node.setPath(path);
		node.setType(NodeType.FILE);
		return node;
	}

	public FileTreeNode renameFile(String projectName, String oldPath, String newPath) throws ApiException {
		validatePath(newPath);
		String newFileName = Path.of(newPath).getFileName().toString();
		Path absoluteNewPath = fileSystemStorage.toAbsolutePath(newPath);

		try {
			validateWithinProject(projectName, oldPath);

			String absoluteNewPathString = absoluteNewPath.toString();
			validateWithinProject(projectName, absoluteNewPathString);

			if (Files.exists(absoluteNewPath)) {
				throw new FileAlreadyExistsException("A file or folder with that path already exists: " + absoluteNewPathString);
			}

			fileSystemStorage.rename(oldPath, absoluteNewPathString);
		} catch (IOException exception) {
			throw new ApiException(exception.getMessage(), HttpStatus.NOT_ACCEPTABLE);
		}
//		invalidateTreeCache(projectName);

		boolean isDir = Files.isDirectory(absoluteNewPath);
		FileTreeNode node = new FileTreeNode();
		node.setName(newFileName);
		node.setPath(newPath);
		node.setType(isDir ? NodeType.DIRECTORY : NodeType.FILE);
		return node;
	}

	public void deleteFile(String projectName, String path) throws ApiException {
		try {
			validateWithinProject(projectName, path);
			fileSystemStorage.delete(path);
		} catch (IOException exception) {
			throw new ApiException("Failed to delete file: " + exception.getMessage(), HttpStatus.INTERNAL_SERVER_ERROR);
		}
//		invalidateTreeCache(projectName);
	}

	public void validateWithinProject(String projectName, String path) throws IOException {
		try {
			Project project = projectService.getProject(projectName);
			Path projectPath = fileSystemStorage.toAbsolutePath(project.getRootPath());
			Path targetPath = fileSystemStorage.toAbsolutePath(path).normalize();

			if (!targetPath.startsWith(projectPath)) {
				throw new SecurityException("Path is outside project directory");
			}
		} catch (ProjectNotFoundException e) {
			throw new IllegalArgumentException("Project does not exist: " + projectName);
		}
	}

	protected void validatePath(String path) throws IllegalArgumentException {
		if (path == null || path.isBlank()) {
			throw new IllegalArgumentException("File path must not be empty");
		}
		if (path.contains("..") || path.contains("\0")) {
			throw new IllegalArgumentException("File path contains invalid characters: " + path);
		}
	}

}
