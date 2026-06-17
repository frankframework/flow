package org.frankframework.flow.project;

import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import java.io.IOException;
import java.io.OutputStream;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import org.frankframework.flow.common.FrankFrameworkService;
import org.frankframework.flow.common.config.ClientSession;
import org.frankframework.flow.configuration.ConfigurationFile;
import org.frankframework.flow.exception.ApiException;
import org.frankframework.flow.filesystem.FileSystemStorage;
import org.frankframework.flow.projectsettings.FilterType;
import org.frankframework.flow.projectsettings.ProjectSettings;
import org.frankframework.flow.recentproject.RecentProjectsService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(ConfigurationProjectController.class)
@AutoConfigureMockMvc(addFilters = false)
class ConfigurationProjectControllerTest {

	@Autowired
	private MockMvc mockMvc;

	@MockitoBean
	private ConfigurationProjectService configurationProjectService;

	@MockitoBean
	private RecentProjectsService recentProjectsService;

	@MockitoBean
	private FileSystemStorage fileSystemStorage;

	@MockitoBean
	private FrankFrameworkService frankFrameworkService;

	@MockitoBean
	private ClientSession session;

	@BeforeEach
	void setUp() {
		Mockito.reset(configurationProjectService);
		when(fileSystemStorage.toRelativePath(anyString())).thenAnswer(inv -> inv.getArgument(0));
		when(fileSystemStorage.toAbsolutePath(anyString())).thenAnswer(inv -> Paths.get(inv.<String>getArgument(0)));
		when(configurationProjectService.toDto(any(ConfigurationProject.class))).thenAnswer(inv -> {
			ConfigurationProject project = inv.getArgument(0);
			List<String> fps = project.getConfigurationFiles().stream()
					.map(ConfigurationFile::getFilepath)
					.toList();
			return new ConfigurationProjectDTO(
					project.getName(), project.getRootPath(), fps, project.getConfigurationSettings().getFilters(), false, false);
		});
	}

	private ConfigurationProject mockProject() {
		ConfigurationProject configurationProject = mock(ConfigurationProject.class);
		when(configurationProject.getName()).thenReturn("MyProject");
		when(configurationProject.getRootPath()).thenReturn("/path/to/MyProject");

		ConfigurationFile config = mock(ConfigurationFile.class);
		when(config.getFilepath()).thenReturn("config1.xml");

		when(configurationProject.getConfigurationFiles()).thenReturn(new ArrayList<>(List.of(config)));

		ProjectSettings settings = mock(ProjectSettings.class);
		when(settings.getFilters())
				.thenReturn(Map.of(
						FilterType.ADAPTER, true,
						FilterType.AMQP, false
				));

		when(configurationProject.getConfigurationSettings()).thenReturn(settings);

		return configurationProject;
	}

	@Test
	void getAllProjectsReturnsExpectedJson() throws Exception {
		ConfigurationProject configurationProject = mockProject();
		when(configurationProjectService.getProjects()).thenReturn(new ArrayList<>(List.of(configurationProject)));

		mockMvc.perform(get("/api/projects").accept(MediaType.APPLICATION_JSON))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$[0].name").value("MyProject"))
				.andExpect(jsonPath("$[0].rootPath").value("/path/to/MyProject"))
				.andExpect(jsonPath("$[0].filepaths[0]").value("config1.xml"))
				.andExpect(jsonPath("$[0].filters.ADAPTER").value(true))
				.andExpect(jsonPath("$[0].filters.AMQP").value(false));

		verify(configurationProjectService).getProjects();
	}

	@Test
	void getProjectReturnsExpectedJson() throws Exception {
		ConfigurationProject configurationProject = mockProject();
		when(configurationProjectService.getProject("MyProject")).thenReturn(configurationProject);

		mockMvc.perform(get("/api/projects/MyProject").accept(MediaType.APPLICATION_JSON))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.name").value("MyProject"))
				.andExpect(jsonPath("$.rootPath").value("/path/to/MyProject"))
				.andExpect(jsonPath("$.filepaths[0]").value("config1.xml"))
				.andExpect(jsonPath("$.filters.ADAPTER").value(true))
				.andExpect(jsonPath("$.filters.AMQP").value(false));

		verify(configurationProjectService).getProject("MyProject");
	}

	@Test
	void getProjectThrowsNotFoundReturns404() throws Exception {
		when(configurationProjectService.getProject("Unknown")).thenThrow(new ApiException("Not found", HttpStatus.NOT_FOUND));

		mockMvc.perform(get("/api/projects/Unknown")).andExpect(status().isNotFound());
	}

	@Test
	void createProjectReturnsProjectDto() throws Exception {
		String rootPath = "/path/to/new/project";
		ConfigurationProjectCreateDTO createDTO = new ConfigurationProjectCreateDTO("MyProject", rootPath);
		ConfigurationProject configurationProject = mockProject();
		when(configurationProject.getRootPath()).thenReturn(rootPath);
		when(configurationProject.getConfigurationFiles()).thenReturn(new ArrayList<>());

		when(configurationProjectService.createProjectOnDisk(createDTO)).thenReturn(configurationProject);

		mockMvc.perform(post("/api/projects")
						.contentType(MediaType.APPLICATION_JSON)
						.accept(MediaType.APPLICATION_JSON)
						.content("""
								{
								"name": "MyProject",
								"rootPath": "/path/to/new/project"
								}
								"""))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.name").value("MyProject"))
				.andExpect(jsonPath("$.rootPath").value(rootPath));

		verify(configurationProjectService).createProjectOnDisk(createDTO);
		verify(recentProjectsService).addRecentProject("MyProject", rootPath);
	}

	@Test
	void enableFilterTogglesFilterToTrue() throws Exception {
		ConfigurationProject configurationProject = mockProject();

		Map<FilterType, Boolean> updatedFilters = Map.of(
				FilterType.ADAPTER, true,
				FilterType.AMQP, true
		);

		ConfigurationProject updatedConfigurationProject = mock(ConfigurationProject.class);
		when(updatedConfigurationProject.getName()).thenReturn("MyProject");
		when(updatedConfigurationProject.getRootPath()).thenReturn("/path/to/MyProject");
		ArrayList<ConfigurationFile> configs = new ArrayList<>(configurationProject.getConfigurationFiles());
		when(updatedConfigurationProject.getConfigurationFiles()).thenReturn(configs);

		ProjectSettings settings = mock(ProjectSettings.class);
		when(settings.getFilters()).thenReturn(updatedFilters);
		when(updatedConfigurationProject.getConfigurationSettings()).thenReturn(settings);

		when(configurationProjectService.enableFilter("MyProject", "AMQP")).thenReturn(updatedConfigurationProject);

		mockMvc.perform(patch("/api/projects/MyProject/filters/AMQP/enable").accept(MediaType.APPLICATION_JSON))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.name").value("MyProject"))
				.andExpect(jsonPath("$.filters.ADAPTER").value(true))
				.andExpect(jsonPath("$.filters.AMQP").value(true));

		verify(configurationProjectService).enableFilter("MyProject", "AMQP");
	}

	@Test
	void enableFilterProjectNotFoundReturns404() throws Exception {
		doThrow(new ApiException("Project not found", HttpStatus.NOT_FOUND))
				.when(configurationProjectService)
				.enableFilter("UnknownProject", "ADAPTER");

		mockMvc.perform(patch("/api/projects/UnknownProject/filters/ADAPTER/enable")
						.accept(MediaType.APPLICATION_JSON))
				.andExpect(status().isNotFound())
				.andExpect(jsonPath("$.status").value("Not Found"))
				.andExpect(jsonPath("$.error").value("Project not found"));

		verify(configurationProjectService).enableFilter("UnknownProject", "ADAPTER");
	}

	@Test
	void enableFilterInvalidFilterTypeReturns400() throws Exception {
		String filterType = "INVALID";
		doThrow(new ApiException("Invalid filter type: " + filterType, HttpStatus.BAD_REQUEST))
				.when(configurationProjectService)
				.enableFilter("MyProject", filterType);

		mockMvc.perform(patch("/api/projects/MyProject/filters/INVALID/enable").accept(MediaType.APPLICATION_JSON))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.status").value("Bad Request"))
				.andExpect(jsonPath("$.error").value("Invalid filter type: " + filterType));

		verify(configurationProjectService).enableFilter("MyProject", filterType);
	}

	@Test
	void disableFilterTogglesFilterToFalse() throws Exception {
		ConfigurationProject configurationProject = mockProject();

		Map<FilterType, Boolean> updatedFilters = Map.of(
				FilterType.ADAPTER, false,
				FilterType.AMQP, false
		);

		ConfigurationProject updatedConfigurationProject = mock(ConfigurationProject.class);
		when(updatedConfigurationProject.getName()).thenReturn("MyProject");
		when(updatedConfigurationProject.getRootPath()).thenReturn("/path/to/MyProject");
		ArrayList<ConfigurationFile> configs = new ArrayList<>(configurationProject.getConfigurationFiles());
		when(updatedConfigurationProject.getConfigurationFiles()).thenReturn(configs);

		ProjectSettings settings = mock(ProjectSettings.class);
		when(settings.getFilters()).thenReturn(updatedFilters);
		when(updatedConfigurationProject.getConfigurationSettings()).thenReturn(settings);

		when(configurationProjectService.disableFilter("MyProject", "ADAPTER")).thenReturn(updatedConfigurationProject);

		mockMvc.perform(patch("/api/projects/MyProject/filters/ADAPTER/disable").accept(MediaType.APPLICATION_JSON))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.name").value("MyProject"))
				.andExpect(jsonPath("$.filters.ADAPTER").value(false))
				.andExpect(jsonPath("$.filters.AMQP").value(false));

		verify(configurationProjectService).disableFilter("MyProject", "ADAPTER");
	}

	@Test
	void disableFilterProjectNotFoundReturns404() throws Exception {
		doThrow(new ApiException("Project not found", HttpStatus.NOT_FOUND))
				.when(configurationProjectService)
				.disableFilter("UnknownProject", "ADAPTER");

		mockMvc.perform(patch("/api/projects/UnknownProject/filters/ADAPTER/disable")
						.accept(MediaType.APPLICATION_JSON))
				.andExpect(status().isNotFound())
				.andExpect(jsonPath("$.status").value("Not Found"))
				.andExpect(jsonPath("$.error").value("Project not found"));

		verify(configurationProjectService).disableFilter("UnknownProject", "ADAPTER");
	}

	@Test
	void disableFilterInvalidFilterTypeReturns400() throws Exception {
		String filterType = "INVALID";
		doThrow(new ApiException("Invalid filter type: " + filterType, HttpStatus.BAD_REQUEST))
				.when(configurationProjectService)
				.disableFilter("MyProject", filterType);

		mockMvc.perform(patch("/api/projects/MyProject/filters/INVALID/disable").accept(MediaType.APPLICATION_JSON))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.status").value("Bad Request"))
				.andExpect(jsonPath("$.error").value("Invalid filter type: " + filterType));

		verify(configurationProjectService).disableFilter("MyProject", filterType);
	}

	@Test
	void exportProjectReturnsZipFile() throws Exception {
		doAnswer(invocation -> {
			OutputStream os = invocation.getArgument(1);
			os.write("fake-zip-content".getBytes());
			return null;
		})
				.when(configurationProjectService)
				.exportProjectAsZip(eq("MyProject"), any(OutputStream.class));

		mockMvc.perform(get("/api/projects/MyProject/export"))
				.andExpect(status().isOk())
				.andExpect(header().string("Content-Disposition", "attachment; filename=\"MyProject.zip\""))
				.andExpect(content().contentType("application/zip"));

		verify(configurationProjectService).exportProjectAsZip(eq("MyProject"), any(OutputStream.class));
	}

	@Test
	void exportProjectNotFoundReturns404() throws Exception {
		doThrow(new ApiException("Project not found", HttpStatus.NOT_FOUND))
				.when(configurationProjectService)
				.exportProjectAsZip(eq("Unknown"), any(OutputStream.class));

		mockMvc.perform(get("/api/projects/Unknown/export")).andExpect(status().isNotFound());

		verify(configurationProjectService).exportProjectAsZip(eq("Unknown"), any(OutputStream.class));
	}

	@Test
	void importProjectReturnsProjectDto() throws Exception {
		ConfigurationProject configurationProject = mockProject();
		when(configurationProject.getName()).thenReturn("ImportedProject");
		when(configurationProject.getRootPath()).thenReturn("/path/to/ImportedProject");
		when(configurationProject.getConfigurationFiles()).thenReturn(new ArrayList<>());

		when(configurationProjectService.importProjectFromZip(eq("ImportedProject"), any()))
				.thenReturn(configurationProject);

		MockMultipartFile zip = new MockMultipartFile(
				"file", "ImportedProject.zip", "application/zip", "fake-zip-bytes".getBytes());

		mockMvc.perform(multipart("/api/projects/import")
						.file(zip)
						.param("projectName", "ImportedProject"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.name").value("ImportedProject"))
				.andExpect(jsonPath("$.rootPath").value("/path/to/ImportedProject"));

		verify(configurationProjectService).importProjectFromZip(eq("ImportedProject"), any());
		verify(recentProjectsService).addRecentProject("ImportedProject", "/path/to/ImportedProject");
	}

	@Test
	void importProjectWithEmptyFileReturnsBadRequest() throws Exception {
		MockMultipartFile emptyZip = new MockMultipartFile("file", "empty.zip", "application/zip", new byte[0]);

		mockMvc.perform(multipart("/api/projects/import")
						.file(emptyZip)
						.param("projectName", "TestProject"))
				.andExpect(status().isBadRequest());

		verify(configurationProjectService, never()).importProjectFromZip(anyString(), any());
	}

	@Test
	void importProjectWithoutProjectNameParamReturnsBadRequest() throws Exception {
		MockMultipartFile zip = new MockMultipartFile("file", "noname.zip", "application/zip", "zip-bytes".getBytes());

		mockMvc.perform(multipart("/api/projects/import").file(zip))
				.andExpect(status().isBadRequest());

		verify(configurationProjectService, never()).importProjectFromZip(anyString(), any());
	}

	@Test
	void importProjectWithoutFilePartReturnsBadRequest() throws Exception {
		mockMvc.perform(multipart("/api/projects/import").param("projectName", "NoFileProject"))
				.andExpect(status().isBadRequest());

		verify(configurationProjectService, never()).importProjectFromZip(anyString(), any());
	}

	@Test
	void importProjectWhenServiceThrowsIOExceptionReturnsServerError() throws Exception {
		when(configurationProjectService.importProjectFromZip(eq("FailingProject"), any()))
				.thenThrow(new IOException("disk full"));

		MockMultipartFile zip = new MockMultipartFile(
				"file", "FailingProject.zip", "application/zip", "fake-zip-bytes".getBytes());

		mockMvc.perform(multipart("/api/projects/import")
						.file(zip)
						.param("projectName", "FailingProject"))
				.andExpect(status().isInternalServerError());

		verify(configurationProjectService).importProjectFromZip(eq("FailingProject"), any());
		verify(recentProjectsService, never()).addRecentProject(anyString(), anyString());
	}
}
