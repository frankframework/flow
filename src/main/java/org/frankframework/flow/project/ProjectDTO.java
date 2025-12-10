package org.frankframework.flow.project;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import org.frankframework.flow.projectsettings.FilterType;

public record ProjectDTO(String name, List<String> filenames, Map<FilterType, Boolean> filters) {

    // Factory method to create a ProjectDTO from a Project
    public static ProjectDTO from(Project project) {
        List<String> filenames = new ArrayList<>();
        for (var c : project.getConfigurations()) {
            filenames.add(c.getFilename());
        }
        return new ProjectDTO(
            project.getName(),
            filenames,
            project.getProjectSettings().getFilters()
        );
    }
}
