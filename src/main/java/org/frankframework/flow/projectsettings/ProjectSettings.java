package org.frankframework.flow.projectsettings;

import java.util.EnumMap;
import java.util.Map;

public class ProjectSettings {
    private Map<FilterType, Boolean> filters = new EnumMap<>(FilterType.class);

    public ProjectSettings() {
        for (FilterType type : FilterType.values()) {
            filters.put(type, false);
        }
    }

    public Map<FilterType, Boolean> getFilters() {
        return filters;
    }

    public void setFilters(Map<FilterType, Boolean> filters) {
        this.filters = filters;
    }

    // Convenience method to set an individual type
    public void setEnabled(FilterType type, boolean enabled) {
        filters.put(type, enabled);
    }

    public void toggleEnabled(FilterType type) {
        boolean current = filters.getOrDefault(type, false);
        filters.put(type, !current);
    }

    public boolean isEnabled(FilterType type) {
        return filters.getOrDefault(type, false);
    }
}