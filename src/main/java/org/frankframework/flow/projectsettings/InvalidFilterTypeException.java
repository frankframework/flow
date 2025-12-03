package org.frankframework.flow.projectsettings;

public class InvalidFilterTypeException extends RuntimeException {
    public InvalidFilterTypeException(String type) {
        super("Invalid filter type: " + type);
    }
}
