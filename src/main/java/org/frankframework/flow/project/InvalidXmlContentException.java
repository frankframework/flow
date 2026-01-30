package org.frankframework.flow.project;

import org.frankframework.flow.exception.ApiException;
import org.springframework.http.HttpStatus;

public class InvalidXmlContentException extends ApiException {
    public InvalidXmlContentException(String message, Throwable cause) {
        super(message, HttpStatus.BAD_REQUEST, cause);
    }
}
