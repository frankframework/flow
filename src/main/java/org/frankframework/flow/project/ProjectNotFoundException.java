package org.frankframework.flow.project;

import org.frankframework.flow.exception.ApiException;
import org.springframework.http.HttpStatus;

public class ProjectNotFoundException extends ApiException {
    public ProjectNotFoundException(String message) {
        super(message, HttpStatus.NOT_FOUND);
    }
}
