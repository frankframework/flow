package org.frankframework.flow.noncanvascomponent;

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

@WebMvcTest(NonCanvasComponentController.class)
@AutoConfigureMockMvc(addFilters = false)
class NonCanvasComponentControllerTest {

	@Autowired
	private MockMvc mockMvc;

	@MockitoBean
	private NonCanvasComponentService nonCanvasComponentService;

	private static final String PROJECT = "FrankFlowTestProject";
	private static final String BASE_URL = "/api/projects/" + PROJECT + "/non-canvas-components";

	@Test
	void getNonCanvasComponents_returnsList() throws Exception {
		NonCanvasComponentDTO component = new NonCanvasComponentDTO("Monitoring", "monitor", 0, Map.of("enabled", "true"));
		when(nonCanvasComponentService.getNonCanvasComponents("config.xml")).thenReturn(List.of(component));

		mockMvc.perform(get(BASE_URL).param("configurationPath", "config.xml").accept(MediaType.APPLICATION_JSON))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$[0].tagName").value("Monitoring"))
				.andExpect(jsonPath("$[0].name").value("monitor"))
				.andExpect(jsonPath("$[0].index").value(0))
				.andExpect(jsonPath("$[0].attributes.enabled").value("true"));

		verify(nonCanvasComponentService).getNonCanvasComponents("config.xml");
	}

	@Test
	void getNonCanvasComponents_missingConfigurationPath_returns400() throws Exception {
		mockMvc.perform(get(BASE_URL).accept(MediaType.APPLICATION_JSON))
				.andExpect(status().isBadRequest());
	}

	@Test
	void getNonCanvasComponents_serviceThrowsNotFound_returns404() throws Exception {
		when(nonCanvasComponentService.getNonCanvasComponents("missing.xml"))
				.thenThrow(new ApiException("Configuration file not found: missing.xml", HttpStatus.NOT_FOUND));

		mockMvc.perform(get(BASE_URL).param("configurationPath", "missing.xml").accept(MediaType.APPLICATION_JSON))
				.andExpect(status().isNotFound())
				.andExpect(jsonPath("$.status").value("Not Found"))
				.andExpect(jsonPath("$.error").value("Configuration file not found: missing.xml"));
	}

	@Test
	void addNonCanvasComponent_deserializesBodyAndReturnsUpdatedList() throws Exception {
		NonCanvasComponentDTO component = new NonCanvasComponentDTO("Scheduler", "daily", 0, Map.of("name", "daily"));
		when(nonCanvasComponentService.addNonCanvasComponent("config.xml", "Scheduler", Map.of("name", "daily")))
				.thenReturn(List.of(component));

		String body = "{\"configurationPath\":\"config.xml\",\"tagName\":\"Scheduler\",\"attributes\":{\"name\":\"daily\"}}";

		mockMvc.perform(post(BASE_URL).contentType(MediaType.APPLICATION_JSON).content(body))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$[0].tagName").value("Scheduler"))
				.andExpect(jsonPath("$[0].name").value("daily"));

		verify(nonCanvasComponentService).addNonCanvasComponent("config.xml", "Scheduler", Map.of("name", "daily"));
	}

	@Test
	void updateNonCanvasComponent_deserializesBodyAndReturnsUpdatedList() throws Exception {
		NonCanvasComponentDTO component = new NonCanvasComponentDTO("Monitoring", "monitor", 0, Map.of("enabled", "false"));
		when(nonCanvasComponentService.updateNonCanvasComponent("config.xml", "Monitoring", 0, Map.of("enabled", "false")))
				.thenReturn(List.of(component));

		String body =
				"{\"configurationPath\":\"config.xml\",\"tagName\":\"Monitoring\",\"index\":0,\"attributes\":{\"enabled\":\"false\"}}";

		mockMvc.perform(put(BASE_URL).contentType(MediaType.APPLICATION_JSON).content(body))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$[0].attributes.enabled").value("false"));

		verify(nonCanvasComponentService).updateNonCanvasComponent("config.xml", "Monitoring", 0, Map.of("enabled", "false"));
	}

	@Test
	void updateNonCanvasComponent_serviceThrowsNotFound_returns404() throws Exception {
		when(nonCanvasComponentService.updateNonCanvasComponent(anyString(), anyString(), anyInt(), anyMap()))
				.thenThrow(new ApiException("Non-canvas component not found: Monitoring", HttpStatus.NOT_FOUND));

		String body =
				"{\"configurationPath\":\"config.xml\",\"tagName\":\"Monitoring\",\"index\":3,\"attributes\":{}}";

		mockMvc.perform(put(BASE_URL).contentType(MediaType.APPLICATION_JSON).content(body))
				.andExpect(status().isNotFound())
				.andExpect(jsonPath("$.error").value("Non-canvas component not found: Monitoring"));
	}

	@Test
	void deleteNonCanvasComponent_returnsRemainingList() throws Exception {
		when(nonCanvasComponentService.deleteNonCanvasComponent("config.xml", "Scheduler", 0)).thenReturn(List.of());

		mockMvc.perform(delete(BASE_URL)
						.param("configurationPath", "config.xml")
						.param("tagName", "Scheduler")
						.param("index", "0"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$").isArray())
				.andExpect(jsonPath("$.length()").value(0));

		verify(nonCanvasComponentService).deleteNonCanvasComponent("config.xml", "Scheduler", 0);
	}

	@Test
	void deleteNonCanvasComponent_serviceThrowsNotFound_returns404() throws Exception {
		when(nonCanvasComponentService.deleteNonCanvasComponent("config.xml", "Scheduler", 9))
				.thenThrow(new ApiException("Non-canvas component not found: Scheduler", HttpStatus.NOT_FOUND));

		mockMvc.perform(delete(BASE_URL)
						.param("configurationPath", "config.xml")
						.param("tagName", "Scheduler")
						.param("index", "9"))
				.andExpect(status().isNotFound())
				.andExpect(jsonPath("$.error").value("Non-canvas component not found: Scheduler"));
	}
}
