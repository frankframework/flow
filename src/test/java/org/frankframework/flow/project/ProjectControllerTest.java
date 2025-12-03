package org.frankframework.flow.project;

import org.frankframework.flow.configuration.Configuration;
import org.frankframework.flow.configuration.ConfigurationDTO;
import org.frankframework.flow.configuration.ConfigurationNotFoundException;
import org.frankframework.flow.projectsettings.FilterType;
import org.frankframework.flow.projectsettings.InvalidFilterTypeException;
import org.frankframework.flow.projectsettings.ProjectSettings;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

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
        when(config.getFilename()).thenReturn("config1.xml");

        when(project.getConfigurations()).thenReturn(new ArrayList<>(List.of(config)));

        ProjectSettings settings = mock(ProjectSettings.class);
        when(settings.getFilters()).thenReturn(
                Map.of(
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

        mockMvc.perform(get("/projects")
                .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].name").value("MyProject"))
                .andExpect(jsonPath("$[0].filenames[0]").value("config1.xml"))
                .andExpect(jsonPath("$[0].filters.ADAPTER").value(true))
                .andExpect(jsonPath("$[0].filters.AMQP").value(false));

        verify(projectService).getProjects();
    }

    @Test
    void getProjectReturnsExpectedJson() throws Exception {
        Project project = mockProject();
        when(projectService.getProject("MyProject")).thenReturn(project);

        mockMvc.perform(get("/projects/MyProject")
                .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("MyProject"))
                .andExpect(jsonPath("$.filenames[0]").value("config1.xml"))
                .andExpect(jsonPath("$.filters.ADAPTER").value(true))
                .andExpect(jsonPath("$.filters.AMQP").value(false));

        verify(projectService).getProject("MyProject");
    }

    @Test
    void getProjectThrowsNotFoundReturns404() throws Exception {
        when(projectService.getProject("Unknown"))
                .thenThrow(new ProjectNotFoundException("Not found"));

        mockMvc.perform(get("/projects/Unknown"))
                .andExpect(status().isNotFound());
    }

    @Test
    void getConfigurationReturnsExpectedJson() throws Exception {
        Project project = mockProject();
        Configuration config = project.getConfigurations().get(0);

        when(config.getFilename()).thenReturn("config1.xml");
        when(config.getXmlContent()).thenReturn("<xml>content</xml>");

        when(projectService.getProject("MyProject")).thenReturn(project);

        mockMvc.perform(get("/projects/MyProject/config1.xml")
                .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("config1.xml"))
                .andExpect(jsonPath("$.xmlContent").value("<xml>content</xml>"));

        verify(projectService).getProject("MyProject");
    }

    @Test
    void getConfigurationConfigurationNotFoundReturns404() throws Exception {
        Project project = mockProject(); // project has only "config1.xml"
        when(projectService.getProject("MyProject")).thenReturn(project);

        mockMvc.perform(get("/projects/MyProject/unknown.xml")
                .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.error").value("ConfigurationNotFound"))
                .andExpect(
                        jsonPath("$.message").value("Configuration with filename: unknown.xml cannot be found"));

        verify(projectService).getProject("MyProject");
    }

    @Test
    void updateConfigurationSuccessReturns200() throws Exception {
        String xmlContent = "<xml>updated</xml>";

        when(projectService.updateConfigurationXml("MyProject", "config1.xml", xmlContent)).thenReturn(true);

        mockMvc.perform(put("/projects/MyProject/config1.xml")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"xmlContent": "<xml>updated</xml>"}
                        """))
                .andExpect(status().isOk());

        verify(projectService).updateConfigurationXml("MyProject", "config1.xml", xmlContent);
    }

    @Test
    void updateConfigurationProjectNotFoundReturns404() throws Exception {
        doThrow(new ProjectNotFoundException("Project not found"))
                .when(projectService).updateConfigurationXml("UnknownProject", "config1.xml", "<xml>updated</xml>");

        mockMvc.perform(put("/projects/UnknownProject/config1.xml")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
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
                .when(projectService).updateConfigurationXml("MyProject", "unknown.xml", "<xml>updated</xml>");

        mockMvc.perform(put("/projects/MyProject/unknown.xml")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"xmlContent": "<xml>updated</xml>"}
                        """))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.error").value("ConfigurationNotFound"))
                .andExpect(jsonPath("$.message").value("Configuration not found"));

        verify(projectService).updateConfigurationXml("MyProject", "unknown.xml", "<xml>updated</xml>");
    }

    @Test
    void createProjectReturnsProjectDto() throws Exception {
        // Arrange
        String projectName = "NewProject";
        Project createdProject = new Project(projectName);

        when(projectService.createProject(projectName)).thenReturn(createdProject);

        mockMvc.perform(post("/projects/" + projectName)
                .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value(projectName))
                .andExpect(jsonPath("$.filenames").isEmpty())
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

        mockMvc.perform(patch("/projects/MyProject/filters/AMQP/enable")
                .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("MyProject"))
                .andExpect(jsonPath("$.filters.ADAPTER").value(true)) // unchanged
                .andExpect(jsonPath("$.filters.AMQP").value(true)); // toggled to true

        verify(projectService).enableFilter("MyProject", "AMQP");
    }

    @Test
    void enableFilterProjectNotFoundReturns404() throws Exception {
        doThrow(new ProjectNotFoundException("Project not found"))
                .when(projectService).enableFilter("UnknownProject", "ADAPTER");

        mockMvc.perform(patch("/projects/UnknownProject/filters/ADAPTER/enable")
                .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.error").value("ProjectNotFound"))
                .andExpect(jsonPath("$.message").value("Project not found"));

        verify(projectService).enableFilter("UnknownProject", "ADAPTER");
    }

    @Test
    void enableFilterInvalidFilterTypeReturns400() throws Exception {
        String filterType = "INVALID";
        doThrow(new InvalidFilterTypeException(filterType))
                .when(projectService).enableFilter("MyProject", filterType);

        mockMvc.perform(patch("/projects/MyProject/filters/INVALID/enable")
                .accept(MediaType.APPLICATION_JSON))
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

        mockMvc.perform(patch("/projects/MyProject/filters/ADAPTER/disable")
                .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("MyProject"))
                .andExpect(jsonPath("$.filters.ADAPTER").value(false)) // toggled to false
                .andExpect(jsonPath("$.filters.AMQP").value(false)); // unchanged

        verify(projectService).disableFilter("MyProject", "ADAPTER");
    }

    @Test
    void diableFilterProjectNotFoundReturns404() throws Exception {
        doThrow(new ProjectNotFoundException("Project not found"))
                .when(projectService).disableFilter("UnknownProject", "ADAPTER");

        mockMvc.perform(patch("/projects/UnknownProject/filters/ADAPTER/disable")
                .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.error").value("ProjectNotFound"))
                .andExpect(jsonPath("$.message").value("Project not found"));

        verify(projectService).disableFilter("UnknownProject", "ADAPTER");
    }

    @Test
    void disableFilterInvalidFilterTypeReturns400() throws Exception {
        String filterType = "INVALID";
        doThrow(new InvalidFilterTypeException(filterType))
                .when(projectService).disableFilter("MyProject", filterType);

        mockMvc.perform(patch("/projects/MyProject/filters/INVALID/disable")
                .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("InvalidFilterType"))
                .andExpect(jsonPath("$.message").value(String.format("Invalid filter type: %s", filterType)));

        verify(projectService).disableFilter("MyProject", filterType);
    }
}
