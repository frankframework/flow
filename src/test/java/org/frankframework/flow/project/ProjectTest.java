package org.frankframework.flow.project;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

import java.util.ArrayList;

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
    void testAddFileToProject() {
        assertTrue(project.getFilenames().isEmpty());

        project.addFilename("new_file");

        assertEquals(1, project.getFilenames().size());
        assertTrue(project.getFilenames().contains("new_file"));
    }
}
