package org.frankframework.flow.configuration;

import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import org.frankframework.flow.exception.ApiException;
import org.frankframework.flow.filesystem.FileSystemStorage;
import org.frankframework.flow.project.ConfigurationProject;
import org.frankframework.flow.project.ConfigurationProjectDTO;
import org.frankframework.flow.project.ConfigurationProjectService;
import org.frankframework.flow.projectsettings.FilterType;
import org.frankframework.flow.projectsettings.ProjectSettings;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.http.HttpStatus;
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
	private ConfigurationProjectService configurationProjectService;

	@MockitoBean
	private FileSystemStorage fileSystemStorage;

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
				.thenThrow(new ApiException("ConfigurationFile file not found: " + filepath, HttpStatus.NOT_FOUND));

		mockMvc.perform(get("/api/projects/" + TEST_PROJECT_NAME + "/configuration?path=" + filepath)
						.contentType(MediaType.APPLICATION_JSON)
						.accept(MediaType.APPLICATION_JSON))
				.andExpect(status().isNotFound())
				.andExpect(jsonPath("$.status").value("Not Found"))
				.andExpect(jsonPath("$.error").value("ConfigurationFile file not found: " + filepath));

		verify(configurationService).getConfigurationContent(TEST_PROJECT_NAME, filepath);
	}

	@Test
	void updateConfigurationSuccessReturns200() throws Exception {
		String filepath = "config1.xml";
		String xmlContent = "<xml>updated</xml>";

		when(configurationService.updateConfiguration(TEST_PROJECT_NAME, filepath, xmlContent, false))
				.thenReturn(xmlContent);

		mockMvc.perform(
						put("/api/projects/" + TEST_PROJECT_NAME + "/configuration?path=" + filepath)
								.contentType(MediaType.APPLICATION_JSON)
								.content("<xml>updated</xml>"))
				.andExpect(status().isOk());

		verify(configurationService).updateConfiguration(TEST_PROJECT_NAME, filepath, xmlContent, false);
	}

	@Test
	void updateConfigurationNotFoundReturns404() throws Exception {
		String filepath = "unknown.xml";
		String xmlContent = "<xml>updated</xml>";

		doThrow(new ApiException("Invalid file path: " + filepath, HttpStatus.NOT_FOUND))
				.when(configurationService)
				.updateConfiguration(TEST_PROJECT_NAME, filepath, xmlContent, false);

		mockMvc.perform(
						put("/api/projects/" + TEST_PROJECT_NAME + "/configuration?path=" + filepath)
								.contentType(MediaType.APPLICATION_JSON)
								.content("<xml>updated</xml>"))
				.andExpect(status().isNotFound())
				.andExpect(jsonPath("$.status").value("Not Found"))
				.andExpect(jsonPath("$.error").value("Invalid file path: " + filepath));

		verify(configurationService).updateConfiguration(TEST_PROJECT_NAME, filepath, xmlContent, false);
	}

	@Test
	void addConfigurationReturnsDefaultContent() throws Exception {
		ConfigurationProject configurationProject = mock(ConfigurationProject.class);
		when(configurationProject.getName()).thenReturn(TEST_PROJECT_NAME);
		when(configurationProject.getRootPath()).thenReturn("/path/to/" + TEST_PROJECT_NAME);

		ConfigurationFile config = mock(ConfigurationFile.class);
		when(config.getFilepath()).thenReturn("config1.xml");
		when(configurationProject.getConfigurationFiles()).thenReturn(new ArrayList<>(List.of(config)));

		ProjectSettings settings = mock(ProjectSettings.class);
		when(settings.getFilters()).thenReturn(Map.of(FilterType.ADAPTER, true));
		when(configurationProject.getConfigurationSettings()).thenReturn(settings);

		when(configurationService.addConfiguration(TEST_PROJECT_NAME, "NewConfig.xml"))
				.thenReturn("");
		when(configurationProjectService.toDto(configurationProject))
				.thenReturn(new ConfigurationProjectDTO(
						TEST_PROJECT_NAME,
						"/path/to/" + TEST_PROJECT_NAME,
						List.of("config1.xml"),
						Map.of(FilterType.ADAPTER, true),
						false,
						false
				));

		mockMvc.perform(post("/api/projects/" + TEST_PROJECT_NAME + "/configuration?name=NewConfig.xml")
						.accept(MediaType.APPLICATION_JSON))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.xmlContent").value(""));

		verify(configurationService).addConfiguration(TEST_PROJECT_NAME, "NewConfig.xml");
	}
}
