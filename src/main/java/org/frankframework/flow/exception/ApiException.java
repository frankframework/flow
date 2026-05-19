package org.frankframework.flow.exception;

import java.io.Serializable;
import lombok.Getter;
import lombok.extern.log4j.Log4j2;
import org.frankframework.core.IbisException;
import org.springframework.http.HttpStatus;

@Log4j2
public class ApiException extends RuntimeException implements Serializable {
	private final @Getter HttpStatus status;
	private final String expandedMessage;

	public ApiException(String message) {
		this(message, HttpStatus.INTERNAL_SERVER_ERROR);
	}

	public ApiException(Throwable throwable) {
		this(null, throwable, HttpStatus.INTERNAL_SERVER_ERROR);
	}

	public ApiException(String message, Throwable throwable) {
		this(message, throwable, null);
	}

	public ApiException(String message, int status) {
		this(message, HttpStatus.valueOf(status));
	}

	public ApiException(String message, HttpStatus status) {
		this(message, null, status);
	}

	private ApiException(String message, Throwable throwable, HttpStatus status) {
		super(message, throwable);
		this.status = status != null ? status : HttpStatus.INTERNAL_SERVER_ERROR;
		if (message == null && throwable == null) {
			this.expandedMessage = null;
		} else {
			this.expandedMessage = IbisException.expandMessage(super.getMessage(), this, exception -> exception instanceof IbisException || exception instanceof ApiException);
		}
	}

	@Override
	public String getMessage() {
		return expandedMessage;
	}
}
