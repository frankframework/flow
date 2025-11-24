package org.frankframework.flow.project;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertNotNull;
import static org.junit.Assert.assertNull;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;

import java.io.IOException;

import org.frankframework.flow.configuration.Configuration;
import org.frankframework.flow.configuration.ConfigurationNotFoundException;
import org.frankframework.flow.projectsettings.FilterType;
import org.frankframework.flow.projectsettings.InvalidFilterTypeException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.core.io.Resource;
import org.springframework.core.io.support.ResourcePatternResolver;

@ExtendWith(MockitoExtension.class)
class ProjectServiceTest {

    @Mock
    private ResourcePatternResolver resolver;

    private ProjectService projectService;

    @BeforeEach
    void init() throws IOException {
        when(resolver.getResources(anyString())).thenReturn(new Resource[0]);
        projectService = new ProjectService(resolver);
    }

    @Test
    void testAddingProjectToProjectService() {

        String projectName = "new_project";
        assertEquals(0, projectService.getProjects().size());
        assertThrows(ProjectNotFoundException.class, () -> {
            projectService.getProject(projectName);
        });

        projectService.createProject(projectName);
        assertEquals(1, projectService.getProjects().size());
        assertNotNull(projectService.getProject(projectName));
    }

    @Test
    void testGetProjectThrowsProjectNotFound() {
        assertThrows(ProjectNotFoundException.class, () -> {
            projectService.getProject("missingProject");
        });
    }

    @Test
    void testUpdateConfigurationXmlSuccess() throws Exception {
        String projectName = "project1";
        String filename = "config.xml";
        String xml = "<root/>";

        projectService.createProject(projectName);
        Project project = projectService.getProject(projectName);

        Configuration config = new Configuration(filename);
        project.getConfigurations().add(config);

        boolean updated = projectService.updateConfigurationXml(projectName, filename, xml);

        assertTrue(updated);
        assertEquals(xml, config.getXmlContent());
    }

    @Test
    void testUpdateConfigurationXmlThrowsProjectNotFound() {
        assertThrows(ProjectNotFoundException.class, () -> {
            projectService.updateConfigurationXml("unknownProject", "config.xml", "<root/>");
        });
    }

    @Test
    void testUpdateConfigurationXmlConfigNotFound() throws Exception {
        String projectName = "project1";

        projectService.createProject(projectName);

        assertThrows(ConfigurationNotFoundException.class, () -> {
            projectService.updateConfigurationXml(projectName, "missingConfig.xml", "<root/>");
        });
    }

    @Test
    void testEnableFilterValid() throws Exception {
        String projectName = "proj1";
        projectService.createProject(projectName);

        Project project = projectService.enableFilter(projectName, "ADAPTER");

        assertTrue(project.getProjectSettings().getFilters().get(FilterType.ADAPTER));
    }

    @Test
    void testDisableFilterValid() throws Exception {
        String projectName = "proj1";
        projectService.createProject(projectName);

        // Enable first
        projectService.enableFilter(projectName, "ADAPTER");
        assertTrue(projectService.getProject(projectName)
                .getProjectSettings().getFilters().get(FilterType.ADAPTER));

        // Then disable
        Project project = projectService.disableFilter(projectName, "ADAPTER");
        assertFalse(project.getProjectSettings().getFilters().get(FilterType.ADAPTER));
    }

    @Test
    void testEnableFilterInvalidFilterType() {
        String projectName = "proj1";
        projectService.createProject(projectName);

        InvalidFilterTypeException ex = assertThrows(InvalidFilterTypeException.class, () -> {
            projectService.enableFilter(projectName, "INVALID_TYPE");
        });

        assertEquals("Invalid filter type: INVALID_TYPE", ex.getMessage());
    }

    @Test
    void testDisableFilterInvalidFilterType() {
        String projectName = "proj1";
        projectService.createProject(projectName);

        InvalidFilterTypeException ex = assertThrows(InvalidFilterTypeException.class, () -> {
            projectService.disableFilter(projectName, "INVALID_TYPE");
        });

        assertEquals("Invalid filter type: INVALID_TYPE", ex.getMessage());
    }

    @Test
    void testEnableFilterProjectNotFound() {
        ProjectNotFoundException ex = assertThrows(ProjectNotFoundException.class, () -> {
            projectService.enableFilter("unknownProject", "ADAPTER");
        });

        assertTrue(ex.getMessage().contains("Project with name: unknownProject"));
    }

    @Test
    void testDisableFilterProjectNotFound() {
        ProjectNotFoundException ex = assertThrows(ProjectNotFoundException.class, () -> {
            projectService.disableFilter("unknownProject", "ADAPTER");
        });

        assertTrue(ex.getMessage().contains("Project with name: unknownProject"));
    }

}
