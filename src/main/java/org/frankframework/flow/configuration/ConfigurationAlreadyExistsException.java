package org.frankframework.flow.configuration;

import org.frankframework.flow.exception.ApiException;
import org.springframework.http.HttpStatus;

public class ConfigurationAlreadyExistsException extends ApiException {
    public ConfigurationAlreadyExistsException(String message) {
        super(message, HttpStatus.CONFLICT);
    }
}
