package org.frankframework.flow.common.mapper;

import org.frankframework.flow.exception.ApiException;
import org.springframework.http.HttpStatus;

public class MappingException extends ApiException {
    public MappingException(String message, Throwable cause) {
        super(message, HttpStatus.BAD_REQUEST, cause);
    }
}
