package org.frankframework.flow.project;

import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import org.frankframework.flow.configuration.Configuration;
import org.frankframework.flow.configuration.ConfigurationNotFoundException;
import org.frankframework.flow.projectsettings.FilterType;
import org.frankframework.flow.projectsettings.InvalidFilterTypeException;
import org.frankframework.flow.projectsettings.ProjectSettings;
import org.frankframework.flow.utility.XmlValidator;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.MockedStatic;
import org.mockito.Mockito;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(ProjectController.class)
class ProjectControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    ProjectService projectService;

    @TestConfiguration
    static class MockConfig {
        @Bean
        ProjectService projectService() {
            return mock(ProjectService.class);
        }
    }

    private Project mockProject() {
        Project project = mock(Project.class);
        when(project.getName()).thenReturn("MyProject");

        Configuration config = mock(Configuration.class);
        when(config.getFilepath()).thenReturn("config1.xml");

        when(project.getConfigurations()).thenReturn(new ArrayList<>(List.of(config)));

        ProjectSettings settings = mock(ProjectSettings.class);
        when(settings.getFilters())
                .thenReturn(Map.of(
                        FilterType.ADAPTER, true,
                        FilterType.AMQP, false));

        when(project.getProjectSettings()).thenReturn(settings);

        return project;
    }

    @BeforeEach
    void resetMocks() {
        Mockito.reset(projectService);
    }

    @Test
    void getAllProjectsReturnsExpectedJson() throws Exception {
        Project project = mockProject();
        when(projectService.getProjects()).thenReturn(new ArrayList<>(List.of(project)));

        mockMvc.perform(get("/api/projects").accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].name").value("MyProject"))
                .andExpect(jsonPath("$[0].filepaths[0]").value("config1.xml"))
                .andExpect(jsonPath("$[0].filters.ADAPTER").value(true))
                .andExpect(jsonPath("$[0].filters.AMQP").value(false));

        verify(projectService).getProjects();
    }

    @Test
    void getProjectReturnsExpectedJson() throws Exception {
        Project project = mockProject();
        when(projectService.getProject("MyProject")).thenReturn(project);

        mockMvc.perform(get("/api/projects/MyProject").accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("MyProject"))
                .andExpect(jsonPath("$.filepaths[0]").value("config1.xml"))
                .andExpect(jsonPath("$.filters.ADAPTER").value(true))
                .andExpect(jsonPath("$.filters.AMQP").value(false));

        verify(projectService).getProject("MyProject");
    }

    @Test
    void getProjectThrowsNotFoundReturns404() throws Exception {
        when(projectService.getProject("Unknown")).thenThrow(new ProjectNotFoundException("Not found"));

        mockMvc.perform(get("/api/projects/Unknown")).andExpect(status().isNotFound());
    }

    @Test
    void getConfigurationByPathReturnsExpectedJson() throws Exception {
        Project project = mockProject();
        Configuration config = project.getConfigurations().get(0);

        when(config.getFilepath()).thenReturn("config1.xml");
        when(config.getXmlContent()).thenReturn("<xml>content</xml>");

        when(projectService.getProject("MyProject")).thenReturn(project);

                String requestBody = """
                                {
                                  "filepath": "config1.xml"
                                }
                                """;

                mockMvc.perform(post("/api/projects/MyProject/configuration")
                                .contentType(MediaType.APPLICATION_JSON)
                                .accept(MediaType.APPLICATION_JSON)
                                .content(requestBody))
                                .andExpect(status().isOk())
                                .andExpect(jsonPath("$.filepath").value("config1.xml"))
                                .andExpect(jsonPath("$.xmlContent").value("<xml>content</xml>"));

        verify(projectService).getProject("MyProject");
    }

    @Test
    void getConfigurationConfigurationNotFoundReturns404() throws Exception {
        Project project = mockProject(); // project has only "config1.xml"
        when(projectService.getProject("MyProject")).thenReturn(project);

                String requestBody = """
                                {
                                  "filepath": "unknown.xml"
                                }
                                """;

                mockMvc.perform(post("/api/projects/MyProject/configuration")
                                .contentType(MediaType.APPLICATION_JSON)
                                .accept(MediaType.APPLICATION_JSON)
                                .content(requestBody))
                                .andExpect(status().isNotFound())
                                .andExpect(jsonPath("$.error").value("ConfigurationNotFound"))
                                .andExpect(jsonPath("$.message")
                                                .value("Configuration with filepath: unknown.xml cannot be found"));

        verify(projectService).getProject("MyProject");
    }

    @Test
    void updateConfigurationSuccessReturns200() throws Exception {
        String xmlContent = "<xml>updated</xml>";

        when(projectService.updateConfigurationXml("MyProject", "config1.xml", xmlContent))
                .thenReturn(true);

        mockMvc.perform(
                        put("/api/projects/MyProject/config1.xml")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(
                                        """
                                                {"xmlContent": "<xml>updated</xml>"}
                                                """))
                .andExpect(status().isOk());

        verify(projectService).updateConfigurationXml("MyProject", "config1.xml", xmlContent);
    }

    @Test
    void updateConfigurationProjectNotFoundReturns404() throws Exception {
        doThrow(new ProjectNotFoundException("Project not found"))
                .when(projectService)
                .updateConfigurationXml("UnknownProject", "config1.xml", "<xml>updated</xml>");

        mockMvc.perform(
                        put("/api/projects/UnknownProject/config1.xml")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(
                                        """
                                                {"xmlContent": "<xml>updated</xml>"}
                                                """))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.error").value("ProjectNotFound"))
                .andExpect(jsonPath("$.message").value("Project not found"));

        verify(projectService).updateConfigurationXml("UnknownProject", "config1.xml", "<xml>updated</xml>");
    }

    @Test
    void updateConfigurationConfigurationNotFoundReturns404() throws Exception {
        doThrow(new ConfigurationNotFoundException("Configuration not found"))
                .when(projectService)
                .updateConfigurationXml("MyProject", "unknown.xml", "<xml>updated</xml>");

        mockMvc.perform(
                        put("/api/projects/MyProject/unknown.xml")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(
                                        """
                                                {"xmlContent": "<xml>updated</xml>"}
                                                """))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.error").value("ConfigurationNotFound"))
                .andExpect(jsonPath("$.message").value("Configuration not found"));

        verify(projectService).updateConfigurationXml("MyProject", "unknown.xml", "<xml>updated</xml>");
    }

    @Test
    void updateConfigurationValidationErrorReturns400() throws Exception {
        String invalidXml = "<xml><unclosed></xml>";

        try (MockedStatic<XmlValidator> validatorMock = Mockito.mockStatic(XmlValidator.class)) {

            // Mock validator to throw the exception instead of returning a string
            validatorMock
                    .when(() -> XmlValidator.validateXml(invalidXml))
                    .thenThrow(new InvalidXmlContentException("Malformed XML"));

            mockMvc.perform(
                            put("/api/projects/MyProject/config1.xml")
                                    .contentType(MediaType.APPLICATION_JSON)
                                    .content(
                                            """
                                                        {"xmlContent": "<xml><unclosed></xml>"}
                                                        """))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.error").value("InvalidXmlContent"))
                    .andExpect(jsonPath("$.message").value("Malformed XML"));

            // Service should never be called if validation failed
            verify(projectService, never()).updateConfigurationXml(anyString(), anyString(), anyString());
        }
    }

    @Test
    void updateAdapterSuccessReturns200() throws Exception {
        String xml = "<adapter>updated</adapter>";

        when(projectService.updateAdapter("MyProject", "config1.xml", "MyAdapter", xml))
                .thenReturn(true);

        mockMvc.perform(
                        put("/api/projects/MyProject/config1.xml/adapters/MyAdapter")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(
                                        """
                                                {"adapterXml": "<adapter>updated</adapter>"}
                                                """))
                .andExpect(status().isOk());

        verify(projectService).updateAdapter("MyProject", "config1.xml", "MyAdapter", xml);
    }

    @Test
    void updateAdapterNotFoundReturns404() throws Exception {
        String xml = "<adapter>something</adapter>";

        // updateAdapter returns false → controller returns 404
        when(projectService.updateAdapter("MyProject", "config1.xml", "UnknownAdapter", xml))
                .thenReturn(false);

        mockMvc.perform(
                        put("/api/projects/MyProject/config1.xml/adapters/UnknownAdapter")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(
                                        """
                                                {"adapterXml": "<adapter>something</adapter>"}
                                                """))
                .andExpect(status().isNotFound());

        verify(projectService).updateAdapter("MyProject", "config1.xml", "UnknownAdapter", xml);
    }

    @Test
    void updateAdapterThrowsExceptionReturns500HandledByGlobalExceptionHandler() throws Exception {
        String xml = "<adapter>broken</adapter>";

        // Force generic runtime exception → GlobalExceptionHandler should catch it
        doThrow(new RuntimeException("Something went wrong"))
                .when(projectService)
                .updateAdapter("MyProject", "config1.xml", "MyAdapter", xml);

        mockMvc.perform(
                        put("/api/projects/MyProject/config1.xml/adapters/MyAdapter")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(
                                        """
                                                {"adapterXml": "<adapter>broken</adapter>"}
                                                """))
                .andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.error").value("InternalServerError"))
                .andExpect(jsonPath("$.message").value("An unexpected error occurred."));

        verify(projectService).updateAdapter("MyProject", "config1.xml", "MyAdapter", xml);
    }

    @Test
    void createProjectReturnsProjectDto() throws Exception {
        // Arrange
        String projectName = "NewProject";
        Project createdProject = new Project(projectName);

        when(projectService.createProject(projectName)).thenReturn(createdProject);

        mockMvc.perform(post("/api/projects/" + projectName).accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value(projectName))
                .andExpect(jsonPath("$.filepaths").isEmpty())
                .andExpect(jsonPath("$.filters").isNotEmpty());

        verify(projectService).createProject(projectName);
    }

    @Test
    void enableFilterTogglesFilterToTrue() throws Exception {
        Project project = mockProject(); // original project: ADAPTER=true, AMQP=false

        Map<FilterType, Boolean> updatedFilters = Map.of(
                FilterType.ADAPTER, true,
                FilterType.AMQP, true);

        Project updatedProject = mock(Project.class);
        when(updatedProject.getName()).thenReturn("MyProject");
        ArrayList<Configuration> configs = new ArrayList<>(project.getConfigurations());
        when(updatedProject.getConfigurations()).thenReturn(configs);

        ProjectSettings settings = mock(ProjectSettings.class);
        when(settings.getFilters()).thenReturn(updatedFilters);
        when(updatedProject.getProjectSettings()).thenReturn(settings);

        when(projectService.enableFilter("MyProject", "AMQP")).thenReturn(updatedProject);

        mockMvc.perform(patch("/api/projects/MyProject/filters/AMQP/enable").accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("MyProject"))
                .andExpect(jsonPath("$.filters.ADAPTER").value(true)) // unchanged
                .andExpect(jsonPath("$.filters.AMQP").value(true)); // toggled to true

        verify(projectService).enableFilter("MyProject", "AMQP");
    }

    @Test
    void enableFilterProjectNotFoundReturns404() throws Exception {
        doThrow(new ProjectNotFoundException("Project not found"))
                .when(projectService)
                .enableFilter("UnknownProject", "ADAPTER");

        mockMvc.perform(patch("/api/projects/UnknownProject/filters/ADAPTER/enable")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.error").value("ProjectNotFound"))
                .andExpect(jsonPath("$.message").value("Project not found"));

        verify(projectService).enableFilter("UnknownProject", "ADAPTER");
    }

    @Test
    void enableFilterInvalidFilterTypeReturns400() throws Exception {
        String filterType = "INVALID";
        doThrow(new InvalidFilterTypeException(filterType)).when(projectService).enableFilter("MyProject", filterType);

        mockMvc.perform(patch("/api/projects/MyProject/filters/INVALID/enable").accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("InvalidFilterType"))
                .andExpect(jsonPath("$.message").value(String.format("Invalid filter type: %s", filterType)));

        verify(projectService).enableFilter("MyProject", filterType);
    }

    @Test
    void disableFilterTogglesFilterToFalse() throws Exception {
        Project project = mockProject(); // original project: ADAPTER=true, AMQP=false

        Map<FilterType, Boolean> updatedFilters = Map.of(
                FilterType.ADAPTER, false,
                FilterType.AMQP, false);

        Project updatedProject = mock(Project.class);
        when(updatedProject.getName()).thenReturn("MyProject");
        ArrayList<Configuration> configs = new ArrayList<>(project.getConfigurations());
        when(updatedProject.getConfigurations()).thenReturn(configs);

        ProjectSettings settings = mock(ProjectSettings.class);
        when(settings.getFilters()).thenReturn(updatedFilters);
        when(updatedProject.getProjectSettings()).thenReturn(settings);

        when(projectService.disableFilter("MyProject", "ADAPTER")).thenReturn(updatedProject);

        mockMvc.perform(patch("/api/projects/MyProject/filters/ADAPTER/disable").accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("MyProject"))
                .andExpect(jsonPath("$.filters.ADAPTER").value(false)) // toggled to false
                .andExpect(jsonPath("$.filters.AMQP").value(false)); // unchanged

        verify(projectService).disableFilter("MyProject", "ADAPTER");
    }

    @Test
    void diableFilterProjectNotFoundReturns404() throws Exception {
        doThrow(new ProjectNotFoundException("Project not found"))
                .when(projectService)
                .disableFilter("UnknownProject", "ADAPTER");

        mockMvc.perform(patch("/api/projects/UnknownProject/filters/ADAPTER/disable")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.error").value("ProjectNotFound"))
                .andExpect(jsonPath("$.message").value("Project not found"));

        verify(projectService).disableFilter("UnknownProject", "ADAPTER");
    }

    @Test
    void disableFilterInvalidFilterTypeReturns400() throws Exception {
        String filterType = "INVALID";
        doThrow(new InvalidFilterTypeException(filterType)).when(projectService).disableFilter("MyProject", filterType);

        mockMvc.perform(patch("/api/projects/MyProject/filters/INVALID/disable").accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("InvalidFilterType"))
                .andExpect(jsonPath("$.message").value(String.format("Invalid filter type: %s", filterType)));

        verify(projectService).disableFilter("MyProject", filterType);
    }
}
