package org.frankframework.flow.exception;

import static org.frankframework.flow.exception.ExceptionHandlerUtilities.formatMessage;

import jakarta.servlet.http.HttpServletRequest;
import java.io.IOException;
import java.nio.file.FileAlreadyExistsException;
import javax.xml.parsers.ParserConfigurationException;
import lombok.extern.log4j.Log4j2;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.xml.sax.SAXException;

@Log4j2
@RestControllerAdvice
public class GlobalExceptionHandler {

	@ExceptionHandler(IllegalArgumentException.class)
	public ResponseEntity<ErrorResponse> handleIllegalArgumentException(IllegalArgumentException exception, HttpServletRequest request) {
		log.warn("Invalid argument: {} - Method: {} URL: {}", exception.getMessage(), request.getMethod(), request.getRequestURI());
		ErrorResponse response = new ErrorResponse(HttpStatus.BAD_REQUEST.getReasonPhrase(), formatMessage(exception.getMessage()));
		return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
	}

	@ExceptionHandler(FileAlreadyExistsException.class)
	public ResponseEntity<ErrorResponse> handleFileAlreadyExistsException(FileAlreadyExistsException exception, HttpServletRequest request) {
		log.warn("File already exists: {} - Method: {} URL: {}", exception.getMessage(), request.getMethod(), request.getRequestURI());
		ErrorResponse response = new ErrorResponse(HttpStatus.CONFLICT.getReasonPhrase(), "A file or folder with that name already exists");
		return ResponseEntity.status(HttpStatus.CONFLICT).body(response);
	}

	@ExceptionHandler(IOException.class)
	public ResponseEntity<ErrorResponse> handleIOException(IOException exception, HttpServletRequest request) {
		log.warn("I/O error: {} - Method: {} URL: {}", exception.getMessage(), request.getMethod(), request.getRequestURI(), exception);
		ErrorResponse response = new ErrorResponse(
				HttpStatus.INTERNAL_SERVER_ERROR.getReasonPhrase(),
				"A filesystem error occurred: " + formatMessage(exception.getMessage())
		);
		return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
	}

	@ExceptionHandler(ParserConfigurationException.class)
	public ResponseEntity<ErrorResponse> handleParserConfigurationException(ParserConfigurationException exception, HttpServletRequest request) {
		log.warn("XML parser configuration error: {} - Method: {} URL: {}", exception.getMessage(), request.getMethod(), request.getRequestURI(), exception);
		ErrorResponse response = new ErrorResponse(
				HttpStatus.INTERNAL_SERVER_ERROR.getReasonPhrase(),
				"XML parser configuration error: " + formatMessage(exception.getMessage())
		);
		return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
	}

	@ExceptionHandler(SAXException.class)
	public ResponseEntity<ErrorResponse> handleSaxException(SAXException exception, HttpServletRequest request) {
		log.warn("XML parsing error: {} - Method: {} URL: {}", exception.getMessage(), request.getMethod(), request.getRequestURI(), exception);
		ErrorResponse response = new ErrorResponse(
				HttpStatus.INTERNAL_SERVER_ERROR.getReasonPhrase(),
				"Invalid XML content: " + formatMessage(exception.getMessage())
		);
		return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
	}
}
