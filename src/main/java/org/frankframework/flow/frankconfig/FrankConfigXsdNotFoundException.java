package org.frankframework.flow.frankconfig;

import org.frankframework.flow.exception.ApiException;
import org.springframework.http.HttpStatus;

public class FrankConfigXsdNotFoundException extends ApiException {
	public FrankConfigXsdNotFoundException(String message, Throwable cause) {
		super(message, HttpStatus.NOT_FOUND, cause);
	}
}
