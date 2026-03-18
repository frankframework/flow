package org.frankframework.flow.git;

import org.frankframework.flow.exception.ApiException;
import org.springframework.http.HttpStatus;

public class GitOperationException extends ApiException {
	public GitOperationException(String message) {
		super(message, HttpStatus.INTERNAL_SERVER_ERROR);
	}

	public GitOperationException(String message, Throwable cause) {
		super(message, HttpStatus.INTERNAL_SERVER_ERROR, cause);
	}
}
