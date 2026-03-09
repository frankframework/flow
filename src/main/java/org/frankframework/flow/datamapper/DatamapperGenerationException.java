package org.frankframework.flow.datamapper;

import org.frankframework.flow.exception.ApiException;
import org.springframework.http.HttpStatus;

public class DatamapperGenerationException extends ApiException {
    public DatamapperGenerationException(String message) {
        super(message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
}
