package org.frankframework.flow.project;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

import java.util.List;

import org.frankframework.flow.configuration.Configuration;
import org.frankframework.flow.projectsettings.FilterType;
import org.junit.jupiter.api.BeforeEach;

class ProjectTest {

    private Project project;

    @BeforeEach
    void init() {
        project = new Project("TestProject");
    }

    @Test
    void testProjectInitialization() {

        assertEquals("TestProject", project.getName());
        assertEquals(project, project);
    }

    @Test
    void testProjectEnableFilter() {
        assertFalse(project.isFilterEnabled(FilterType.ADAPTER));
        project.enableFilter(FilterType.ADAPTER);
        assertTrue(project.isFilterEnabled(FilterType.ADAPTER));
    }

    @Test
    void testProjectDisableFilter() {
        project.enableFilter(FilterType.ADAPTER);
        assertTrue(project.isFilterEnabled(FilterType.ADAPTER));

        project.disableFilter(FilterType.ADAPTER);
        assertFalse(project.isFilterEnabled(FilterType.ADAPTER));
    }

    @Test
    void testDisableFilterThatWasNeverEnabled() {
        assertFalse(project.isFilterEnabled(FilterType.ADAPTER));

        project.disableFilter(FilterType.ADAPTER);

        assertFalse(project.isFilterEnabled(FilterType.ADAPTER));
    }

    @Test
    void testAddConfigurationToProject() {
        assertTrue(project.getConfigurations().isEmpty());

        Configuration configuration = new Configuration("new_file");
        project.addConfiguration(configuration);

        List<Configuration> configurations = project.getConfigurations();
        assertEquals(1, configurations.size());
        assertTrue(configurations.contains(configuration));
    }
}
