package org.frankframework.flow.configuration;

import org.frankframework.flow.exception.ApiException;
import org.springframework.http.HttpStatus;

public class ConfigurationNotFoundException extends ApiException {
    public ConfigurationNotFoundException(String message) {
        super(message, HttpStatus.NOT_FOUND);
    }
}
