package org.frankframework.flow.projectsettings;

import org.frankframework.flow.exception.ApiException;
import org.springframework.http.HttpStatus;

public class InvalidFilterTypeException extends ApiException {
    public InvalidFilterTypeException(String message) {
        super(message, HttpStatus.BAD_REQUEST);
    }
}
