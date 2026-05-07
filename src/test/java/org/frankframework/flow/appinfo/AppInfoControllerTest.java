package org.frankframework.flow.appinfo;

import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.frankframework.flow.filesystem.FileSystemStorage;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(AppInfoController.class)
@AutoConfigureMockMvc(addFilters = false)
class AppInfoControllerTest {

	@Autowired
	private MockMvc mockMvc;

	@MockitoBean
	private FileSystemStorage fileSystemStorage;

	@Test
	void getInfoReturnsLocalEnvironmentFlag() throws Exception {
		when(fileSystemStorage.isLocalEnvironment()).thenReturn(true);

		mockMvc.perform(get("/api/app-info"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.isLocal").value(true));

		verify(fileSystemStorage).isLocalEnvironment();
	}

	@Test
	void getInfoReturnsCloudEnvironmentFlag() throws Exception {
		when(fileSystemStorage.isLocalEnvironment()).thenReturn(false);

		mockMvc.perform(get("/api/app-info"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.isLocal").value(false));

		verify(fileSystemStorage).isLocalEnvironment();
	}
}
