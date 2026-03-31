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
		ConfigurationDTO configDto = new ConfigurationDTO(filepath, xmlContent);

		when(configurationService.getConfigurationContent(TEST_PROJECT_NAME, filepath)).thenReturn(configDto);

		mockMvc.perform(get("/api/projects/" + TEST_PROJECT_NAME + "/configuration?path=" + filepath)
						.contentType(MediaType.APPLICATION_JSON)
						.accept(MediaType.APPLICATION_JSON))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.filepath").value(filepath))
				.andExpect(jsonPath("$.content").value(xmlContent));

		verify(configurationService).getConfigurationContent(TEST_PROJECT_NAME, filepath);
	}

	@Test
	void getConfigurationNotFoundReturns404() throws Exception {
		String filepath = "unknown.xml";

		when(configurationService.getConfigurationContent(TEST_PROJECT_NAME, filepath))
				.thenThrow(new ConfigurationNotFoundException("Configuration file not found: " + filepath));

		mockMvc.perform(get("/api/projects/" + TEST_PROJECT_NAME + "/configuration?path=" + filepath)
						.contentType(MediaType.APPLICATION_JSON)
						.accept(MediaType.APPLICATION_JSON))
				.andExpect(status().isNotFound())
				.andExpect(jsonPath("$.httpStatus").value(404))
				.andExpect(jsonPath("$.messages[0]").value("Configuration file not found: " + filepath));

		verify(configurationService).getConfigurationContent(TEST_PROJECT_NAME, filepath);
	}

	@Test
	void updateConfigurationSuccessReturns200() throws Exception {
		String filepath = "config1.xml";
		String xmlContent = "<xml>updated</xml>";

		when(configurationService.updateConfiguration(TEST_PROJECT_NAME, filepath, xmlContent))
				.thenReturn(xmlContent);

		mockMvc.perform(
						put("/api/projects/" + TEST_PROJECT_NAME + "/configuration?path=" + filepath)
								.contentType(MediaType.APPLICATION_JSON)
								.content("<xml>updated</xml>"))
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
						put("/api/projects/" + TEST_PROJECT_NAME + "/configuration?path=" + filepath)
								.contentType(MediaType.APPLICATION_JSON)
								.content("<xml>updated</xml>"))
				.andExpect(status().isNotFound())
				.andExpect(jsonPath("$.httpStatus").value(404))
				.andExpect(jsonPath("$.messages[0]").value("Invalid file path: " + filepath));

		verify(configurationService).updateConfiguration(TEST_PROJECT_NAME, filepath, xmlContent);
	}

	@Test
	void addConfigurationReturnsProjectDto() throws Exception {
		Project project = mock(Project.class);
		when(project.getName()).thenReturn(TEST_PROJECT_NAME);
		when(project.getRootPath()).thenReturn("/path/to/" + TEST_PROJECT_NAME);

		Configuration config = mock(Configuration.class);
		when(config.getFilepath()).thenReturn("config1.xml");
		when(project.getConfigurations()).thenReturn(new ArrayList<>(List.of(config)));

		ProjectSettings settings = mock(ProjectSettings.class);
		when(settings.getFilters()).thenReturn(Map.of(FilterType.ADAPTER, true));
		when(project.getProjectSettings()).thenReturn(settings);

		when(configurationService.addConfiguration(TEST_PROJECT_NAME, "NewConfig.xml"))
				.thenReturn("");
		when(projectService.toDto(project))
				.thenReturn(new ProjectDTO(
						TEST_PROJECT_NAME,
						"/path/to/" + TEST_PROJECT_NAME,
						List.of("config1.xml"),
						Map.of(FilterType.ADAPTER, true),
						false,
						false));

		mockMvc.perform(post("/api/projects/" + TEST_PROJECT_NAME + "/configuration?name=NewConfig.xml")
						.accept(MediaType.APPLICATION_JSON))
				.andExpect(status().isOk())
				.andExpect(jsonPath("xmlContent").value(""));

		verify(configurationService).addConfiguration(TEST_PROJECT_NAME, "NewConfig.xml");
	}
}
