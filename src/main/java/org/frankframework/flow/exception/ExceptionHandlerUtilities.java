package org.frankframework.flow.exception;

public class ExceptionHandlerUtilities {

	public static String formatMessage(String message) {
		return message != null ? message.replace(System.lineSeparator(), " ") : null;
	}
}
