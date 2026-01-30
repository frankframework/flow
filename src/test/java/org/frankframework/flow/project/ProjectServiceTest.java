package org.frankframework.flow.project;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;

import java.io.IOException;
import org.frankframework.flow.adapter.AdapterNotFoundException;
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
        projectService = new ProjectService(resolver, "/path/to/projects");
    }

    @Test
    void testAddingProjectToProjectService() throws ProjectNotFoundException, ProjectAlreadyExistsException {
        String projectName = "new_project";
        String rootPath = "/path/to/new_project";

        assertEquals(0, projectService.getProjects().size());
        assertThrows(ProjectNotFoundException.class, () -> projectService.getProject(projectName));

        projectService.createProject(projectName, rootPath);

        assertEquals(1, projectService.getProjects().size());
        assertNotNull(projectService.getProject(projectName));
    }

    @Test
    void testGetProjectThrowsProjectNotFound() {
        assertThrows(ProjectNotFoundException.class, () -> projectService.getProject("missingProject"));
    }

    @Test
    void testUpdateConfigurationXmlSuccess() throws Exception {
        projectService.createProject("proj", "/path/to/proj");
        Project project = projectService.getProject("proj");

        Configuration config = new Configuration("config.xml");
        project.getConfigurations().add(config);

        boolean updated = projectService.updateConfigurationXml("proj", "config.xml", "<root/>");

        assertTrue(updated);
        assertEquals("<root/>", config.getXmlContent());
    }

    @Test
    void testUpdateConfigurationXmlThrowsProjectNotFound() {
        assertThrows(
                ProjectNotFoundException.class,
                () -> projectService.updateConfigurationXml("unknownProject", "config.xml", "<root/>"));
    }

    @Test
    void testUpdateConfigurationXmlConfigNotFound() throws Exception {
        projectService.createProject("proj", "/path/to/proj");

        assertThrows(
                ConfigurationNotFoundException.class,
                () -> projectService.updateConfigurationXml("proj", "missingConfig.xml", "<root/>"));
    }

    @Test
    void testEnableFilterValid() throws Exception {
        projectService.createProject("proj", "/path/to/proj");

        Project project = projectService.enableFilter("proj", "ADAPTER");

        assertTrue(project.getProjectSettings().getFilters().get(FilterType.ADAPTER));
    }

    @Test
    void testDisableFilterValid() throws Exception {
        projectService.createProject("proj", "/path/to/proj");

        // enable first
        projectService.enableFilter("proj", "ADAPTER");
        assertTrue(projectService
                .getProject("proj")
                .getProjectSettings()
                .getFilters()
                .get(FilterType.ADAPTER));

        // disable
        Project updated = projectService.disableFilter("proj", "ADAPTER");
        assertFalse(updated.getProjectSettings().getFilters().get(FilterType.ADAPTER));
    }

    @Test
    void testEnableFilterInvalidFilterType() throws ProjectAlreadyExistsException {
        projectService.createProject("proj", "/path/to/proj");

        InvalidFilterTypeException ex = assertThrows(
                InvalidFilterTypeException.class, () -> projectService.enableFilter("proj", "INVALID_TYPE"));

        assertEquals("Invalid filter type: INVALID_TYPE", ex.getMessage());
    }

    @Test
    void testDisableFilterInvalidFilterType() throws ProjectAlreadyExistsException {
        projectService.createProject("proj", "/path/to/proj");

        InvalidFilterTypeException ex = assertThrows(
                InvalidFilterTypeException.class, () -> projectService.disableFilter("proj", "INVALID_TYPE"));

        assertEquals("Invalid filter type: INVALID_TYPE", ex.getMessage());
    }

    @Test
    void testEnableFilterProjectNotFound() {
        ProjectNotFoundException ex = assertThrows(
                ProjectNotFoundException.class, () -> projectService.enableFilter("unknownProject", "ADAPTER"));

        assertTrue(ex.getMessage().contains("Project with name: unknownProject"));
    }

    @Test
    void testDisableFilterProjectNotFound() {
        ProjectNotFoundException ex = assertThrows(
                ProjectNotFoundException.class, () -> projectService.disableFilter("unknownProject", "ADAPTER"));

        assertTrue(ex.getMessage().contains("Project with name: unknownProject"));
    }

    @Test
    void updateAdapterSuccess() throws Exception {
        // Arrange
        projectService.createProject("proj", "/path/to/proj");
        Project project = projectService.getProject("proj");

        String originalXml =
                """
                <Configuration>
                    <Adapter name="A1">
                        <Settings>123</Settings>
                    </Adapter>
                    <Adapter name="A2">
                        <Settings>456</Settings>
                    </Adapter>
                </Configuration>
                """;

        Configuration config = new Configuration("conf.xml");
        config.setXmlContent(originalXml);
        project.getConfigurations().add(config);

        String newAdapterXml =
                """
                <Adapter name="A1">
                    <Settings>999</Settings>
                </Adapter>
                """;

        // Act
        boolean result = projectService.updateAdapter("proj", "conf.xml", "A1", newAdapterXml);

        // Assert
        assertTrue(result);
        String updatedXml = config.getXmlContent();
        assertTrue(updatedXml.contains("<Settings>999</Settings>"));
        assertFalse(updatedXml.contains("<Settings>123</Settings>"));
        assertTrue(updatedXml.contains("A2"), "Other adapters must remain unchanged");
    }

    @Test
    void updateAdapterProjectNotFoundThrows() {
        ProjectNotFoundException ex = assertThrows(ProjectNotFoundException.class, () -> {
            projectService.updateAdapter("unknownProject", "conf.xml", "A1", "<Adapter name='A1'/>");
        });
        assertTrue(ex.getMessage().contains("Project with name: unknownProject"));
    }

    @Test
    void updateAdapterConfigurationNotFoundThrows() throws Exception {
        projectService.createProject("proj", "/path/to/proj");

        ConfigurationNotFoundException ex = assertThrows(ConfigurationNotFoundException.class, () -> {
            projectService.updateAdapter("proj", "missing.xml", "A1", "<Adapter name='A1'/>");
        });

        assertEquals("Configuration not found: missing.xml", ex.getMessage());
    }

    @Test
    void updateAdapterAdapterNotFoundThrows() throws Exception {
        projectService.createProject("proj", "/path/to/proj");
        Project project = projectService.getProject("proj");

        String xml =
                """
                <Configuration>
                    <Adapter name="Other"/>
                </Configuration>
                """;

        Configuration config = new Configuration("conf.xml");
        config.setXmlContent(xml);
        project.getConfigurations().add(config);

        AdapterNotFoundException ex = assertThrows(AdapterNotFoundException.class, () -> {
            projectService.updateAdapter("proj", "conf.xml", "A1", "<Adapter name='A1'/>");
        });

        assertEquals("Adapter not found: A1", ex.getMessage());
        assertEquals(xml, config.getXmlContent());
    }

    @Test
    void updateAdapterInvalidXmlReturnsFalse() throws Exception {
        projectService.createProject("proj", "/path/to/proj");
        Project project = projectService.getProject("proj");

        String xml =
                """
                <Configuration>
                    <Adapter name="A1"/>
                </Configuration>
                """;

        Configuration config = new Configuration("conf.xml");
        config.setXmlContent(xml);
        project.getConfigurations().add(config);

        String invalidXml = "<Adapter><broken>";

        boolean result = projectService.updateAdapter("proj", "conf.xml", "A1", invalidXml);

        assertFalse(result);
        assertEquals(xml, config.getXmlContent());
    }
}
