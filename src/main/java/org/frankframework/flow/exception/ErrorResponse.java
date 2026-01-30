package org.frankframework.flow.exception;

import java.util.List;

public record ErrorResponse(Integer httpStatus, List<String> messages, String errorCode) {}
