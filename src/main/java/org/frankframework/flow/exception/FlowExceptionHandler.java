package org.frankframework.flow.exception;

import static org.frankframework.flow.exception.ExceptionHandlerUtilities.formatMessage;

import jakarta.servlet.http.HttpServletRequest;
import javax.xml.parsers.ParserConfigurationException;
import lombok.extern.log4j.Log4j2;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@Log4j2
@RestControllerAdvice
public class FlowExceptionHandler {

	@ExceptionHandler(ApiException.class)
	public ResponseEntity<ErrorResponse> handleApiException(ApiException exception) {
		log.trace("Exception occurred: {} - {}", exception.getClass().getSimpleName(), exception.getMessage(), exception);
		ErrorResponse response = new ErrorResponse(exception.getStatus().getReasonPhrase(), formatMessage(exception.getMessage()));
		return ResponseEntity.status(exception.getStatus()).body(response);
	}

}
