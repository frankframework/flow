package org.frankframework.flow.frankdoc;

import org.frankframework.flow.exception.ApiException;
import org.springframework.http.HttpStatus;

public class FrankDocJsonNotFoundException extends ApiException {
    public FrankDocJsonNotFoundException(String message, Throwable cause) {
        super(message, HttpStatus.NOT_FOUND, cause);
    }
}
