package org.frankframework.flow.adapter;

import org.frankframework.flow.exception.ApiException;
import org.springframework.http.HttpStatus;

public class AdapterNotFoundException extends ApiException {
    public AdapterNotFoundException(String message) {
        super(message, HttpStatus.NOT_FOUND);
    }
}
