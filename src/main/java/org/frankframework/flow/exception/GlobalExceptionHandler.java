package org.frankframework.flow.exception;

import jakarta.servlet.http.HttpServletRequest;
import java.io.IOException;
import java.nio.file.FileAlreadyExistsException;
import java.util.List;
import javax.xml.parsers.ParserConfigurationException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.xml.sax.SAXException;

@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {

	@ExceptionHandler(ApiException.class)
	public ResponseEntity<ErrorResponse> handleApiException(ApiException exception) {
		log.error(
				"Exception occurred: {} - {}", exception.getClass().getSimpleName(), exception.getMessage(), exception);

		List<String> messages = exception.getMessage() == null ? List.of() : List.of(exception.getMessage());

		ErrorResponse response = new ErrorResponse(
				exception.getStatusCode().value(),
				messages,
				exception.getStatusCode().getReasonPhrase());

		return ResponseEntity.status(exception.getStatusCode()).body(response);
	}

	@ExceptionHandler(IllegalArgumentException.class)
	public ResponseEntity<ErrorResponse> handleIllegalArgumentException(
			IllegalArgumentException exception, HttpServletRequest request) {
		log.warn(
				"Invalid argument: {} - Method: {} URL: {}",
				exception.getMessage(),
				request.getMethod(),
				request.getRequestURI());

		ErrorResponse response = new ErrorResponse(
				HttpStatus.BAD_REQUEST.value(),
				List.of(exception.getMessage()),
				HttpStatus.BAD_REQUEST.getReasonPhrase());

		return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
	}

	@ExceptionHandler(FileAlreadyExistsException.class)
	public ResponseEntity<ErrorResponse> handleFileAlreadyExistsException(
			FileAlreadyExistsException exception, HttpServletRequest request) {
		log.warn(
				"File already exists: {} - Method: {} URL: {}",
				exception.getMessage(),
				request.getMethod(),
				request.getRequestURI());

		ErrorResponse response = new ErrorResponse(
				HttpStatus.CONFLICT.value(),
				List.of("A file or folder with that name already exists"),
				HttpStatus.CONFLICT.getReasonPhrase());

		return ResponseEntity.status(HttpStatus.CONFLICT).body(response);
	}

	@ExceptionHandler(IOException.class)
	public ResponseEntity<ErrorResponse> handleIOException(IOException exception, HttpServletRequest request) {
		log.error(
				"I/O error: {} - Method: {} URL: {}",
				exception.getMessage(),
				request.getMethod(),
				request.getRequestURI(),
				exception);

		ErrorResponse response = new ErrorResponse(
				HttpStatus.INTERNAL_SERVER_ERROR.value(),
				List.of("A filesystem error occurred: " + exception.getMessage()),
				HttpStatus.INTERNAL_SERVER_ERROR.getReasonPhrase());

		return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
	}

	@ExceptionHandler(SAXException.class)
	public ResponseEntity<ErrorResponse> handleSaxException(SAXException exception, HttpServletRequest request) {
		log.error(
				"XML parsing error: {} - Method: {} URL: {}",
				exception.getMessage(),
				request.getMethod(),
				request.getRequestURI(),
				exception);

		ErrorResponse response = new ErrorResponse(
				HttpStatus.INTERNAL_SERVER_ERROR.value(),
				List.of("Invalid XML content: " + exception.getMessage()),
				HttpStatus.INTERNAL_SERVER_ERROR.getReasonPhrase());

		return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
	}

	@ExceptionHandler(ParserConfigurationException.class)
	public ResponseEntity<ErrorResponse> handleParserConfigurationException(
			ParserConfigurationException exception, HttpServletRequest request) {

		log.error(
				"XML parser configuration error: {} - Method: {} URL: {}",
				exception.getMessage(),
				request.getMethod(),
				request.getRequestURI(),
				exception);

		ErrorResponse response = new ErrorResponse(
				HttpStatus.INTERNAL_SERVER_ERROR.value(),
				List.of("XML parser configuration error: " + exception.getMessage()),
				HttpStatus.INTERNAL_SERVER_ERROR.getReasonPhrase());

		return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
	}
}
