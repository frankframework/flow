package org.frankframework.flow.exception;

public class ErrorResponseDTO {
    public String error;
    public String message;

    public ErrorResponseDTO(String error, String message) {
        this.error = error;
        this.message = message;
    }
}
