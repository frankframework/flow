package org.frankframework.flow.git;

import org.frankframework.flow.exception.ApiException;
import org.springframework.http.HttpStatus;

public class NotAGitRepositoryException extends ApiException {
	public NotAGitRepositoryException(String projectName) {
		super("Project '" + projectName + "' is not a git repository", HttpStatus.BAD_REQUEST);
	}
}
