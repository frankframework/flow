package org.frankframework.flow.adapter;

import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import java.nio.file.Paths;
import org.frankframework.flow.configuration.ConfigurationNotFoundException;
import org.frankframework.flow.xml.XmlDTO;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(AdapterController.class)
@AutoConfigureMockMvc(addFilters = false)
class AdapterControllerTest {

	@Autowired
	private MockMvc mockMvc;

	@MockitoBean
	private AdapterService adapterService;

	@MockitoBean
	private org.frankframework.flow.security.UserContextFilter userContextFilter;

	@MockitoBean
	private org.frankframework.flow.security.UserWorkspaceContext userWorkspaceContext;

	@Test
	void getAdapterReturns200() throws Exception {
		String projectName = "MyProject";
		String configPath = "config1.xml";
		String adapterName = "MyAdapter";
		String adapterXml = "<Adapter name=\"MyAdapter\"/>";

		when(adapterService.getAdapter(eq(projectName), eq(configPath), eq(adapterName)))
				.thenReturn(new XmlDTO(adapterXml));

		mockMvc.perform(get("/api/projects/" + projectName + "/adapters/" + adapterName)
						.param("configurationPath", configPath)
						.contentType(MediaType.APPLICATION_JSON))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.xmlContent").value(adapterXml));

		verify(adapterService).getAdapter(projectName, configPath, adapterName);
	}

	@Test
	void getAdapterNotFoundReturns404() throws Exception {
		String projectName = "MyProject";
		String configPath = "config1.xml";
		String adapterName = "MissingAdapter";

		when(adapterService.getAdapter(eq(projectName), eq(configPath), eq(adapterName)))
				.thenThrow(new AdapterNotFoundException("Adapter not found"));

		mockMvc.perform(get("/api/projects/" + projectName + "/adapters/" + adapterName)
						.param("configurationPath", configPath)
						.contentType(MediaType.APPLICATION_JSON))
				.andExpect(status().isNotFound())
				.andExpect(jsonPath("$.messages[0]").value("Adapter not found"));

		verify(adapterService).getAdapter(projectName, configPath, adapterName);
	}

	@Test
	void getAdapterMissingConfigurationParamReturns400() throws Exception {
		mockMvc.perform(get("/api/projects/MyProject/adapters/MyAdapter").contentType(MediaType.APPLICATION_JSON))
				.andExpect(status().isBadRequest());

		verify(adapterService, never()).getAdapter(anyString(), anyString(), anyString());
	}

	@Test
	void updateAdapterSuccessReturns200() throws Exception {
		String configPath = "config1.xml";
		String adapterName = "MyAdapter";
		String adapterXml = "<adapter>updated</adapter>";

		when(adapterService.updateAdapter(eq(Paths.get(configPath)), eq(adapterName), eq(adapterXml)))
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

		verify(adapterService).updateAdapter(Paths.get(configPath), adapterName, adapterXml);
	}

	@Test
	void updateAdapterNotFoundReturns404() throws Exception {
		String configPath = "config1.xml";
		String adapterName = "UnknownAdapter";
		String adapterXml = "<adapter>something</adapter>";

		when(adapterService.updateAdapter(eq(Paths.get(configPath)), eq(adapterName), eq(adapterXml)))
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

		verify(adapterService).updateAdapter(Paths.get(configPath), adapterName, adapterXml);
	}

	@Test
	void updateAdapterConfigurationNotFoundReturns404() throws Exception {
		String configPath = "missing.xml";
		String adapterName = "MyAdapter";
		String adapterXml = "<adapter>something</adapter>";

		when(adapterService.updateAdapter(eq(Paths.get(configPath)), eq(adapterName), eq(adapterXml)))
				.thenThrow(new ConfigurationNotFoundException("Configuration file not found: " + configPath));

		mockMvc.perform(
						put("/api/projects/MyProject/adapters")
								.contentType(MediaType.APPLICATION_JSON)
								.content(
										"""
								{
								"configurationPath": "missing.xml",
								"adapterName": "MyAdapter",
								"adapterXml": "<adapter>something</adapter>"
								}
								"""))
				.andExpect(status().isNotFound());

		verify(adapterService).updateAdapter(Paths.get(configPath), adapterName, adapterXml);
	}
}
