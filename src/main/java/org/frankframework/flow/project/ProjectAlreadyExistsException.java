package org.frankframework.flow.project;

import org.frankframework.flow.exception.ApiException;
import org.springframework.http.HttpStatus;

public class ProjectAlreadyExistsException extends ApiException {
    public ProjectAlreadyExistsException(String message) {
        super(message, HttpStatus.CONFLICT);
    }
}
