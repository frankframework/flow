package org.frankframework.flow.project;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import java.io.IOException;
import java.io.OutputStream;
import java.nio.file.NoSuchFileException;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import org.frankframework.flow.adapter.AdapterNotFoundException;
import org.frankframework.flow.configuration.Configuration;
import org.frankframework.flow.filesystem.FileSystemStorage;
import org.frankframework.flow.filetree.FileTreeService;
import org.frankframework.flow.projectsettings.FilterType;
import org.frankframework.flow.projectsettings.InvalidFilterTypeException;
import org.frankframework.flow.projectsettings.ProjectSettings;
import org.frankframework.flow.recentproject.RecentProjectsService;
import org.frankframework.flow.utility.XmlValidator;
import org.frankframework.flow.xml.XmlDTO;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.MockedStatic;
import org.mockito.Mockito;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(ProjectController.class)
@AutoConfigureMockMvc(addFilters = false)
class ProjectControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private ProjectService projectService;

    @MockitoBean
    private FileTreeService fileTreeService;

    @MockitoBean
    private RecentProjectsService recentProjectsService;

    @MockitoBean
    private FileSystemStorage fileSystemStorage;

    @MockitoBean
    private org.frankframework.flow.security.UserContextFilter userContextFilter;

    @MockitoBean
    private org.frankframework.flow.security.UserWorkspaceContext userWorkspaceContext;

    private static final String TEST_PROJECT_NAME = "FrankFlowTestProject";

    @BeforeEach
    void setUp() throws IOException {
        Mockito.reset(projectService);
        when(fileSystemStorage.toRelativePath(anyString())).thenAnswer(inv -> inv.getArgument(0));
        when(fileSystemStorage.toAbsolutePath(anyString())).thenAnswer(inv -> Paths.get(inv.<String>getArgument(0)));
    }

    private Project mockProject() {
        Project project = mock(Project.class);
        when(project.getName()).thenReturn("MyProject");
        when(project.getRootPath()).thenReturn("/path/to/MyProject");

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

    @Test
    void getAllProjectsReturnsExpectedJson() throws Exception {
        Project project = mockProject();
        when(projectService.getProjects()).thenReturn(new ArrayList<>(List.of(project)));

        mockMvc.perform(get("/api/projects").accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].name").value("MyProject"))
                .andExpect(jsonPath("$[0].rootPath").value("/path/to/MyProject"))
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
                .andExpect(jsonPath("$.rootPath").value("/path/to/MyProject"))
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
        String filepath = "config1.xml";
        String xmlContent = "<xml>content</xml>";

        when(fileTreeService.readFileContent(filepath)).thenReturn(xmlContent);

        String requestBody =
                """
                {
                  "filepath": "config1.xml"
                }
                """;

        mockMvc.perform(post("/api/projects/MyProject/configuration")
                        .contentType(MediaType.APPLICATION_JSON)
                        .accept(MediaType.APPLICATION_JSON)
                        .content(requestBody))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.filepath").value(filepath))
                .andExpect(jsonPath("$.content").value(xmlContent));

        verify(fileTreeService).readFileContent(filepath);
    }

    @Test
    void getConfigurationConfigurationNotFoundReturns404() throws Exception {
        String filepath = "unknown.xml";

        when(fileTreeService.readFileContent(filepath)).thenThrow(new NoSuchFileException(filepath));

        String requestBody =
                """
                {
                  "filepath": "unknown.xml"
                }
                """;

        mockMvc.perform(post("/api/projects/MyProject/configuration")
                        .contentType(MediaType.APPLICATION_JSON)
                        .accept(MediaType.APPLICATION_JSON)
                        .content(requestBody))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.httpStatus").value(404))
                .andExpect(jsonPath("$.messages[0]").value("Configuration file not found: " + filepath));

        verify(fileTreeService).readFileContent(filepath);
    }

    @Test
    void updateConfigurationSuccessReturns200() throws Exception {
        String filepath = "config1.xml";
        String xmlContent = "<xml>updated</xml>";

        doNothing().when(fileTreeService).updateFileContent(TEST_PROJECT_NAME, filepath, xmlContent);

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

        verify(fileTreeService).updateFileContent(TEST_PROJECT_NAME, filepath, xmlContent);
    }

    @Test
    void updateConfigurationConfigurationNotFoundReturns404() throws Exception {
        String filepath = "unknown.xml";
        String xmlContent = "<xml>updated</xml>";

        doThrow(new IllegalArgumentException("Invalid path"))
                .when(fileTreeService)
                .updateFileContent(TEST_PROJECT_NAME, filepath, xmlContent);

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

        verify(fileTreeService).updateFileContent(TEST_PROJECT_NAME, filepath, xmlContent);
    }

    @Test
    void updateConfigurationValidationErrorReturns400() throws Exception {
        String invalidXml = "<xml><unclosed></xml>";

        try (MockedStatic<XmlValidator> validatorMock = Mockito.mockStatic(XmlValidator.class)) {

            validatorMock
                    .when(() -> XmlValidator.validateXml(invalidXml))
                    .thenThrow(new InvalidXmlContentException("Malformed XML", null));

            mockMvc.perform(
                            put("/api/projects/" + TEST_PROJECT_NAME + "/configuration")
                                    .contentType(MediaType.APPLICATION_JSON)
                                    .content(
                                            """
                                            {
                                              "filepath": "config1.xml",
                                              "content": "<xml><unclosed></xml>"
                                            }
                                            """))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.httpStatus").value(400))
                    .andExpect(jsonPath("$.messages[0]").value("Malformed XML"));

            verify(fileTreeService, never()).updateFileContent(eq(TEST_PROJECT_NAME), anyString(), anyString());
        }
    }

    @Test
    void updateAdapterFromFileSuccessReturns200() throws Exception {
        String projectName = "MyProject";
        String configPath = "config1.xml";
        String adapterName = "MyAdapter";
        String adapterXml = "<adapter>updated</adapter>";

        when(fileTreeService.updateAdapterFromFile(
                        eq(projectName), eq(Paths.get(configPath)), eq(adapterName), eq(adapterXml)))
                .thenReturn(true);

        mockMvc.perform(
                        put("/api/projects/MyProject/adapters")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(
                                        """
                                        {
                                          "configurationPath": "config1.xml",
                                          "adapterName": "MyAdapter",
                                          "adapterXml": "<adapter>updated</adapter>"
                                        }
                                        """))
                .andExpect(status().isOk());

        verify(fileTreeService).updateAdapterFromFile(projectName, Paths.get(configPath), adapterName, adapterXml);
    }

    @Test
    void updateAdapterFromFileNotFoundReturns404() throws Exception {
        String projectName = "MyProject";
        String configPath = "config1.xml";
        String adapterName = "UnknownAdapter";
        String adapterXml = "<adapter>something</adapter>";

        when(fileTreeService.updateAdapterFromFile(
                        eq(projectName), eq(Paths.get(configPath)), eq(adapterName), eq(adapterXml)))
                .thenReturn(false);

        mockMvc.perform(
                        put("/api/projects/MyProject/adapters")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(
                                        """
                                        {
                                          "configurationPath": "config1.xml",
                                          "adapterName": "UnknownAdapter",
                                          "adapterXml": "<adapter>something</adapter>"
                                        }
                                        """))
                .andExpect(status().isNotFound());

        verify(fileTreeService).updateAdapterFromFile(projectName, Paths.get(configPath), adapterName, adapterXml);
    }

    @Test
    void createProjectReturnsProjectDto() throws Exception {
        String rootPath = "/path/to/new/project";
        Project project = mockProject();
        when(project.getName()).thenReturn("NewProject");
        when(project.getRootPath()).thenReturn(rootPath);
        when(project.getConfigurations()).thenReturn(new ArrayList<>());

        when(projectService.createProjectOnDisk(rootPath)).thenReturn(project);

        mockMvc.perform(
                        post("/api/projects")
                                .contentType(MediaType.APPLICATION_JSON)
                                .accept(MediaType.APPLICATION_JSON)
                                .content(
                                        """
                                        {
                                          "rootPath": "/path/to/new/project"
                                        }
                                        """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("NewProject"))
                .andExpect(jsonPath("$.rootPath").value(rootPath));

        verify(projectService).createProjectOnDisk(rootPath);
        verify(recentProjectsService).addRecentProject("NewProject", rootPath);
    }

    @Test
    void enableFilterTogglesFilterToTrue() throws Exception {
        Project project = mockProject(); // original project: ADAPTER=true, AMQP=false

        Map<FilterType, Boolean> updatedFilters = Map.of(
                FilterType.ADAPTER, true,
                FilterType.AMQP, true);

        Project updatedProject = mock(Project.class);
        when(updatedProject.getName()).thenReturn("MyProject");
        when(updatedProject.getRootPath()).thenReturn("/path/to/MyProject");
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
                .andExpect(jsonPath("$.httpStatus").value(404))
                .andExpect(jsonPath("$.messages[0]").value("Project not found"));

        verify(projectService).enableFilter("UnknownProject", "ADAPTER");
    }

    @Test
    void enableFilterInvalidFilterTypeReturns400() throws Exception {
        String filterType = "INVALID";
        doThrow(new InvalidFilterTypeException("Invalid filter type: " + filterType))
                .when(projectService)
                .enableFilter("MyProject", filterType);

        mockMvc.perform(patch("/api/projects/MyProject/filters/INVALID/enable").accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.httpStatus").value(400))
                .andExpect(jsonPath("$.messages[0]").value("Invalid filter type: " + filterType));

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
        when(updatedProject.getRootPath()).thenReturn("/path/to/MyProject");
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
    void disableFilterProjectNotFoundReturns404() throws Exception {
        doThrow(new ProjectNotFoundException("Project not found"))
                .when(projectService)
                .disableFilter("UnknownProject", "ADAPTER");

        mockMvc.perform(patch("/api/projects/UnknownProject/filters/ADAPTER/disable")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.httpStatus").value(404))
                .andExpect(jsonPath("$.messages[0]").value("Project not found"));

        verify(projectService).disableFilter("UnknownProject", "ADAPTER");
    }

    @Test
    void disableFilterInvalidFilterTypeReturns400() throws Exception {
        String filterType = "INVALID";
        doThrow(new InvalidFilterTypeException("Invalid filter type: " + filterType))
                .when(projectService)
                .disableFilter("MyProject", filterType);

        mockMvc.perform(patch("/api/projects/MyProject/filters/INVALID/disable").accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.httpStatus").value(400))
                .andExpect(jsonPath("$.messages[0]").value("Invalid filter type: " + filterType));

        verify(projectService).disableFilter("MyProject", filterType);
    }

    @Test
    void exportProjectReturnsZipFile() throws Exception {
        doAnswer(invocation -> {
                    OutputStream os = invocation.getArgument(1);
                    os.write("fake-zip-content".getBytes());
                    return null;
                })
                .when(projectService)
                .exportProjectAsZip(eq("MyProject"), any(OutputStream.class));

        mockMvc.perform(get("/api/projects/MyProject/export"))
                .andExpect(status().isOk())
                .andExpect(header().string("Content-Disposition", "attachment; filename=\"MyProject.zip\""))
                .andExpect(content().contentType("application/zip"));

        verify(projectService).exportProjectAsZip(eq("MyProject"), any(OutputStream.class));
    }

    @Test
    void exportProjectNotFoundReturns404() throws Exception {
        doThrow(new ProjectNotFoundException("Project not found"))
                .when(projectService)
                .exportProjectAsZip(eq("Unknown"), any(OutputStream.class));

        mockMvc.perform(get("/api/projects/Unknown/export")).andExpect(status().isNotFound());

        verify(projectService).exportProjectAsZip(eq("Unknown"), any(OutputStream.class));
    }

    @Test
    void importProjectReturnsProjectDto() throws Exception {
        Project project = mockProject();
        when(project.getName()).thenReturn("ImportedProject");
        when(project.getRootPath()).thenReturn("/path/to/ImportedProject");
        when(project.getConfigurations()).thenReturn(new ArrayList<>());

        when(projectService.importProjectFromFiles(eq("ImportedProject"), anyList(), anyList()))
                .thenReturn(project);

        MockMultipartFile file1 = new MockMultipartFile(
                "files", "Configuration.xml", MediaType.APPLICATION_XML_VALUE, "<config>test</config>".getBytes());
        MockMultipartFile file2 =
                new MockMultipartFile("files", "pom.xml", MediaType.APPLICATION_XML_VALUE, "<project/>".getBytes());

        mockMvc.perform(multipart("/api/projects/import")
                        .file(file1)
                        .file(file2)
                        .param("paths", "src/main/configurations/Configuration.xml", "pom.xml")
                        .param("projectName", "ImportedProject"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("ImportedProject"))
                .andExpect(jsonPath("$.rootPath").value("/path/to/ImportedProject"));

        verify(projectService).importProjectFromFiles(eq("ImportedProject"), anyList(), anyList());
        verify(recentProjectsService).addRecentProject("ImportedProject", "/path/to/ImportedProject");
    }

    @Test
    void importProjectWithMismatchedFilesAndPathsReturnsBadRequest() throws Exception {
        MockMultipartFile file1 = new MockMultipartFile(
                "files", "Configuration.xml", MediaType.APPLICATION_XML_VALUE, "<config>test</config>".getBytes());

        mockMvc.perform(multipart("/api/projects/import")
                        .file(file1)
                        .param("paths", "path1.xml", "path2.xml")
                        .param("projectName", "TestProject"))
                .andExpect(status().isBadRequest());

        verify(projectService, never()).importProjectFromFiles(anyString(), anyList(), anyList());
    }

    @Test
    void getAdapterElementReturns200() throws Exception {
        String projectName = "MyProject";
        String configPath = "config1.xml";
        String adapterName = "MyAdapter";
        String adapterXml = "<Adapter name=\"MyAdapter\"/>";

        when(projectService.getAdapterElement(eq(projectName), eq(configPath), eq(adapterName)))
                .thenReturn(new XmlDTO(adapterXml));

        mockMvc.perform(get("/api/projects/" + projectName + "/adapters/" + adapterName)
                        .param("configurationPath", configPath)
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.xmlContent").value(adapterXml));

        verify(projectService).getAdapterElement(projectName, configPath, adapterName);
    }

    @Test
    void getAdapterElementAdapterNotFoundReturns404() throws Exception {
        String projectName = "MyProject";
        String configPath = "config1.xml";
        String adapterName = "MissingAdapter";

        when(projectService.getAdapterElement(eq(projectName), eq(configPath), eq(adapterName)))
                .thenThrow(new AdapterNotFoundException("Adapter not found"));

        mockMvc.perform(get("/api/projects/" + projectName + "/adapters/" + adapterName)
                        .param("configurationPath", configPath)
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.messages[0]").value("Adapter not found"));

        verify(projectService).getAdapterElement(projectName, configPath, adapterName);
    }

    @Test
    void getAdapterElementMissingConfigurationParamReturns400() throws Exception {
        String projectName = "MyProject";
        String adapterName = "MyAdapter";

        mockMvc.perform(get("/api/projects/" + projectName + "/adapters/" + adapterName)
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isBadRequest());

        // No service call should be made
        verify(projectService, never()).getAdapterElement(anyString(), anyString(), anyString());
    }
}
