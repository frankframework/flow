package org.frankframework.flow.project;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import org.frankframework.flow.configuration.Configuration;
import org.frankframework.flow.projectsettings.FilterType;

public record ProjectDTO(String name, List<String> filepaths, Map<FilterType, Boolean> filters) {

    // Factory method to create a ProjectDTO from a Project
    public static ProjectDTO from(Project project) {
        List<String> filepaths = new ArrayList<>();
        for (Configuration configuration : project.getConfigurations()) {
            filepaths.add(configuration.getFilepath());
        }
        return new ProjectDTO(
                project.getName(), filepaths, project.getProjectSettings().getFilters());
    }
}
