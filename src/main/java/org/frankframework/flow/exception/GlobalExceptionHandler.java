package org.frankframework.flow.exception;

import org.frankframework.flow.configuration.AdapterNotFoundException;
import org.frankframework.flow.configuration.ConfigurationNotFoundException;
import org.frankframework.flow.project.InvalidXmlContentException;
import org.frankframework.flow.project.ProjectNotFoundException;
import org.frankframework.flow.projectsettings.InvalidFilterTypeException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(ProjectNotFoundException.class)
    public ResponseEntity<ErrorResponseDTO> handleProjectNotFound(ProjectNotFoundException ex) {
        ex.printStackTrace();
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(new ErrorResponseDTO("ProjectNotFound", ex.getMessage()));
    }

    @ExceptionHandler(ConfigurationNotFoundException.class)
    public ResponseEntity<ErrorResponseDTO> handleConfigNotFound(ConfigurationNotFoundException ex) {
        ex.printStackTrace();
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(new ErrorResponseDTO("ConfigurationNotFound", ex.getMessage()));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponseDTO> handleGeneralError(Exception ex) {
        ex.printStackTrace();
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(new ErrorResponseDTO("InternalServerError",
                        "An unexpected error occurred."));
    }

    @ExceptionHandler(InvalidFilterTypeException.class)
    public ResponseEntity<ErrorResponseDTO> handleInvalidFilter(InvalidFilterTypeException ex) {
        return ResponseEntity.badRequest()
                .body(new ErrorResponseDTO("InvalidFilterType", ex.getMessage()));
    }

    @ExceptionHandler(InvalidXmlContentException.class)
    public ResponseEntity<ErrorResponseDTO> handleInvalidXml(InvalidXmlContentException ex) {
        return ResponseEntity.badRequest()
                .body(new ErrorResponseDTO("InvalidXmlContent", ex.getMessage()));
    }

    @ExceptionHandler(AdapterNotFoundException.class)
    public ResponseEntity<ErrorResponseDTO> handleAdapterNotFound(AdapterNotFoundException ex) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(new ErrorResponseDTO("AdapterNotFound", ex.getMessage()));
    }

}
