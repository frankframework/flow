package org.frankframework.flow.configuration;

import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import org.frankframework.flow.filesystem.FileSystemStorage;
import org.frankframework.flow.project.Project;
import org.frankframework.flow.project.ProjectDTO;
import org.frankframework.flow.project.ProjectService;
import org.frankframework.flow.projectsettings.FilterType;
import org.frankframework.flow.projectsettings.ProjectSettings;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(ConfigurationController.class)
@AutoConfigureMockMvc(addFilters = false)
class ConfigurationControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private ConfigurationService configurationService;

    @MockitoBean
    private ProjectService projectService;

    @MockitoBean
    private FileSystemStorage fileSystemStorage;

    @MockitoBean
    private org.frankframework.flow.security.UserContextFilter userContextFilter;

    @MockitoBean
    private org.frankframework.flow.security.UserWorkspaceContext userWorkspaceContext;

    private static final String TEST_PROJECT_NAME = "FrankFlowTestProject";

    @BeforeEach
    void setUp() {
        Mockito.reset(configurationService);
        when(fileSystemStorage.toRelativePath(anyString())).thenAnswer(inv -> inv.getArgument(0));
    }

    @Test
    void getConfigurationByPathReturnsExpectedJson() throws Exception {
        String filepath = "config1.xml";
        String xmlContent = "<xml>content</xml>";

        when(configurationService.getConfigurationContent(filepath)).thenReturn(xmlContent);

        mockMvc.perform(post("/api/projects/MyProject/configuration")
                        .contentType(MediaType.APPLICATION_JSON)
                        .accept(MediaType.APPLICATION_JSON)
                        .content("""
								{
								"filepath": "config1.xml"
								}
								"""))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.filepath").value(filepath))
                .andExpect(jsonPath("$.content").value(xmlContent));

        verify(configurationService).getConfigurationContent(filepath);
    }

    @Test
    void getConfigurationNotFoundReturns404() throws Exception {
        String filepath = "unknown.xml";

        when(configurationService.getConfigurationContent(filepath))
                .thenThrow(new ConfigurationNotFoundException("Configuration file not found: " + filepath));

        mockMvc.perform(post("/api/projects/MyProject/configuration")
                        .contentType(MediaType.APPLICATION_JSON)
                        .accept(MediaType.APPLICATION_JSON)
                        .content("""
								{
								"filepath": "unknown.xml"
								}
								"""))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.httpStatus").value(404))
                .andExpect(jsonPath("$.messages[0]").value("Configuration file not found: " + filepath));

        verify(configurationService).getConfigurationContent(filepath);
    }

    @Test
    void updateConfigurationSuccessReturns200() throws Exception {
        String filepath = "config1.xml";
        String xmlContent = "<xml>updated</xml>";

        when(configurationService.updateConfiguration(TEST_PROJECT_NAME, filepath, xmlContent))
                .thenReturn(xmlContent);

        mockMvc.perform(
                        put("/api/projects/" + TEST_PROJECT_NAME + "/configuration")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(
                                        """
								{
								"filepath": "config1.xml",
								"content": "<xml>updated</xml>"
								}
								"""))
                .andExpect(status().isOk());

        verify(configurationService).updateConfiguration(TEST_PROJECT_NAME, filepath, xmlContent);
    }

    @Test
    void updateConfigurationNotFoundReturns404() throws Exception {
        String filepath = "unknown.xml";
        String xmlContent = "<xml>updated</xml>";

        doThrow(new ConfigurationNotFoundException("Invalid file path: " + filepath))
                .when(configurationService)
                .updateConfiguration(TEST_PROJECT_NAME, filepath, xmlContent);

        mockMvc.perform(
                        put("/api/projects/" + TEST_PROJECT_NAME + "/configuration")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(
                                        """
								{
								"filepath": "unknown.xml",
								"content": "<xml>updated</xml>"
								}
								"""))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.httpStatus").value(404))
                .andExpect(jsonPath("$.messages[0]").value("Invalid file path: " + filepath));

        verify(configurationService).updateConfiguration(TEST_PROJECT_NAME, filepath, xmlContent);
    }

    @Test
    void addConfigurationReturnsProjectDto() throws Exception {
        Project project = mock(Project.class);
        when(project.getName()).thenReturn("MyProject");
        when(project.getRootPath()).thenReturn("/path/to/MyProject");

        Configuration config = mock(Configuration.class);
        when(config.getFilepath()).thenReturn("config1.xml");
        when(project.getConfigurations()).thenReturn(new ArrayList<>(List.of(config)));

        ProjectSettings settings = mock(ProjectSettings.class);
        when(settings.getFilters()).thenReturn(Map.of(FilterType.ADAPTER, true));
        when(project.getProjectSettings()).thenReturn(settings);

        when(configurationService.addConfiguration("MyProject", "NewConfig.xml"))
                .thenReturn(project);
        when(projectService.toDto(project))
                .thenReturn(new ProjectDTO(
                        "MyProject",
                        "/path/to/MyProject",
                        List.of("config1.xml"),
                        Map.of(FilterType.ADAPTER, true),
                        false,
                        false));

        mockMvc.perform(post("/api/projects/MyProject/configurations/NewConfig.xml")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("MyProject"));

        verify(configurationService).addConfiguration("MyProject", "NewConfig.xml");
    }
}
