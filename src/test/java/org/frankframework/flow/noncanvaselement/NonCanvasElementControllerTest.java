package org.frankframework.flow.noncanvaselement;

import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyMap;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.List;
import java.util.Map;
import org.frankframework.flow.exception.ApiException;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(NonCanvasElementController.class)
@AutoConfigureMockMvc(addFilters = false)
class NonCanvasElementControllerTest {

	@Autowired
	private MockMvc mockMvc;

	@MockitoBean
	private NonCanvasElementService nonCanvasElementService;

	private static final String PROJECT = "FrankFlowTestProject";
	private static final String BASE_URL = "/api/projects/" + PROJECT + "/non-canvas-elements";

	@Test
	void getNonCanvasElements_returnsList() throws Exception {
		NonCanvasElementDTO element = new NonCanvasElementDTO("Monitoring", "monitor", 0, Map.of("enabled", "true"));
		when(nonCanvasElementService.getNonCanvasElements("config.xml")).thenReturn(List.of(element));

		mockMvc.perform(get(BASE_URL).param("configurationPath", "config.xml").accept(MediaType.APPLICATION_JSON))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$[0].tagName").value("Monitoring"))
				.andExpect(jsonPath("$[0].name").value("monitor"))
				.andExpect(jsonPath("$[0].index").value(0))
				.andExpect(jsonPath("$[0].attributes.enabled").value("true"));

		verify(nonCanvasElementService).getNonCanvasElements("config.xml");
	}

	@Test
	void getNonCanvasElements_missingConfigurationPath_returns400() throws Exception {
		mockMvc.perform(get(BASE_URL).accept(MediaType.APPLICATION_JSON))
				.andExpect(status().isBadRequest());
	}

	@Test
	void getNonCanvasElements_serviceThrowsNotFound_returns404() throws Exception {
		when(nonCanvasElementService.getNonCanvasElements("missing.xml"))
				.thenThrow(new ApiException("Configuration file not found: missing.xml", HttpStatus.NOT_FOUND));

		mockMvc.perform(get(BASE_URL).param("configurationPath", "missing.xml").accept(MediaType.APPLICATION_JSON))
				.andExpect(status().isNotFound())
				.andExpect(jsonPath("$.status").value("Not Found"))
				.andExpect(jsonPath("$.error").value("Configuration file not found: missing.xml"));
	}

	@Test
	void addNonCanvasElement_deserializesBodyAndReturnsUpdatedList() throws Exception {
		NonCanvasElementDTO element = new NonCanvasElementDTO("Scheduler", "daily", 0, Map.of("name", "daily"));
		when(nonCanvasElementService.addNonCanvasElement("config.xml", "Scheduler", Map.of("name", "daily")))
				.thenReturn(List.of(element));

		String body = "{\"configurationPath\":\"config.xml\",\"tagName\":\"Scheduler\",\"attributes\":{\"name\":\"daily\"}}";

		mockMvc.perform(post(BASE_URL).contentType(MediaType.APPLICATION_JSON).content(body))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$[0].tagName").value("Scheduler"))
				.andExpect(jsonPath("$[0].name").value("daily"));

		verify(nonCanvasElementService).addNonCanvasElement("config.xml", "Scheduler", Map.of("name", "daily"));
	}

	@Test
	void updateNonCanvasElement_deserializesBodyAndReturnsUpdatedList() throws Exception {
		NonCanvasElementDTO element = new NonCanvasElementDTO("Monitoring", "monitor", 0, Map.of("enabled", "false"));
		when(nonCanvasElementService.updateNonCanvasElement("config.xml", "Monitoring", 0, Map.of("enabled", "false")))
				.thenReturn(List.of(element));

		String body =
				"{\"configurationPath\":\"config.xml\",\"tagName\":\"Monitoring\",\"index\":0,\"attributes\":{\"enabled\":\"false\"}}";

		mockMvc.perform(put(BASE_URL).contentType(MediaType.APPLICATION_JSON).content(body))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$[0].attributes.enabled").value("false"));

		verify(nonCanvasElementService).updateNonCanvasElement("config.xml", "Monitoring", 0, Map.of("enabled", "false"));
	}

	@Test
	void updateNonCanvasElement_serviceThrowsNotFound_returns404() throws Exception {
		when(nonCanvasElementService.updateNonCanvasElement(anyString(), anyString(), anyInt(), anyMap()))
				.thenThrow(new ApiException("Non-canvas element not found: Monitoring", HttpStatus.NOT_FOUND));

		String body =
				"{\"configurationPath\":\"config.xml\",\"tagName\":\"Monitoring\",\"index\":3,\"attributes\":{}}";

		mockMvc.perform(put(BASE_URL).contentType(MediaType.APPLICATION_JSON).content(body))
				.andExpect(status().isNotFound())
				.andExpect(jsonPath("$.error").value("Non-canvas element not found: Monitoring"));
	}

	@Test
	void deleteNonCanvasElement_returnsRemainingList() throws Exception {
		when(nonCanvasElementService.deleteNonCanvasElement("config.xml", "Scheduler", 0)).thenReturn(List.of());

		mockMvc.perform(delete(BASE_URL)
						.param("configurationPath", "config.xml")
						.param("tagName", "Scheduler")
						.param("index", "0"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$").isArray())
				.andExpect(jsonPath("$.length()").value(0));

		verify(nonCanvasElementService).deleteNonCanvasElement("config.xml", "Scheduler", 0);
	}

	@Test
	void deleteNonCanvasElement_serviceThrowsNotFound_returns404() throws Exception {
		when(nonCanvasElementService.deleteNonCanvasElement("config.xml", "Scheduler", 9))
				.thenThrow(new ApiException("Non-canvas element not found: Scheduler", HttpStatus.NOT_FOUND));

		mockMvc.perform(delete(BASE_URL)
						.param("configurationPath", "config.xml")
						.param("tagName", "Scheduler")
						.param("index", "9"))
				.andExpect(status().isNotFound())
				.andExpect(jsonPath("$.error").value("Non-canvas element not found: Scheduler"));
	}
}
