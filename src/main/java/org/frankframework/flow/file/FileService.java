package org.frankframework.flow.file;

import org.frankframework.flow.exception.ApiException;

import org.frankframework.flow.filesystem.FileSystemStorage;
import org.frankframework.flow.project.Project;
import org.frankframework.flow.project.ProjectNotFoundException;
import org.frankframework.flow.project.ProjectService;

import org.springframework.stereotype.Service;

import java.io.IOException;
import java.nio.file.FileAlreadyExistsException;
import java.nio.file.Files;
import java.nio.file.Path;

@Service
public class FileService {

	private final ProjectService projectService;
	private final FileSystemStorage fileSystemStorage;

	public FileService(ProjectService projectService, FileSystemStorage fileSystemStorage) {
		this.projectService = projectService;
		this.fileSystemStorage = fileSystemStorage;
	}

	public FileDTO readFile(String projectName, String path) throws IOException {
		validatePath(path);
		validateWithinProject(projectName, path);

		String content = fileSystemStorage.readFile(path);
		String type = fileSystemStorage.readFileType(path);
		if (type == null) {
			type = "text/plain";
		}
		return new FileDTO(content, type);
	}

	public FileTreeNode createOrUpdateFile(String projectName, String path, String fileContent) throws IOException {
		validatePath(path);
		String fileName = path.substring(path.lastIndexOf("/") + 1);
		validateFileName(fileName);
		validateWithinProject(projectName, path);

		fileSystemStorage.createFile(path);
		fileSystemStorage.writeFile(path, fileContent);

//		invalidateTreeCache(projectName);

		FileTreeNode node = new FileTreeNode();
		node.setName(fileName);
		node.setPath(path);
		node.setType(NodeType.FILE);
		return node;
	}

	public FileTreeNode renameFile(String projectName, String oldPath, String newPath) throws IOException {
		validatePath(newPath);
		String newFileName = newPath.substring(newPath.lastIndexOf("/") + 1);
		validateFileName(newFileName);
		validateWithinProject(projectName, oldPath);

		Path absoluteNewPath = fileSystemStorage.toAbsolutePath(newPath);
		String absoluteNewPathString = absoluteNewPath.toString();
		validateWithinProject(projectName, absoluteNewPathString);

		if (Files.exists(absoluteNewPath)) {
			throw new FileAlreadyExistsException("A file or folder with that path already exists: " + absoluteNewPathString);
		}

		fileSystemStorage.rename(oldPath, absoluteNewPathString);
//		invalidateTreeCache(projectName);

		boolean isDir = Files.isDirectory(absoluteNewPath);
		FileTreeNode node = new FileTreeNode();
		node.setName(newFileName);
		node.setPath(newPath);
		node.setType(isDir ? NodeType.DIRECTORY : NodeType.FILE);
		return node;
	}

	public void deleteFile(String projectName, String path) throws IOException {
		validateWithinProject(projectName, path);
		fileSystemStorage.delete(path);
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

	protected void validateFileName(String name) {
		if (name == null || name.isBlank()) {
			throw new IllegalArgumentException("File name must not be empty");
		}
		if (name.contains("/") || name.contains("\\") || name.contains("..")) {
			throw new IllegalArgumentException("File name contains invalid characters: " + name);
		}
	}

	protected void validatePath(String path) {
		if (path == null || path.isBlank()) {
			throw new IllegalArgumentException("File path must not be empty");
		}
		if (path.contains("\\") || path.contains("..")) {
			throw new IllegalArgumentException("File path contains invalid characters: " + path);
		}
	}

}
