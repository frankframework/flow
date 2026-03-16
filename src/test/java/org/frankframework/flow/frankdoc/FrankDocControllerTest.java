package org.frankframework.flow.frankdoc;

import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import org.frankframework.flow.security.UserContextFilter;
import org.frankframework.flow.security.UserWorkspaceContext;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(FrankDocController.class)
@AutoConfigureMockMvc(addFilters = false)
class FrankDocControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private FrankDocService frankDocService;

    @MockitoBean
    private UserContextFilter userContextFilter;

    @MockitoBean
    private UserWorkspaceContext userWorkspaceContext;

    @Test
    void getFrankDocJsonReturnsJsonContent() throws Exception {
        String frankDocJson = "{\"version\":\"1.0\",\"types\":{}}";
        when(frankDocService.getFrankDocJson()).thenReturn(frankDocJson);

        mockMvc.perform(get("/api/json/frankdoc").accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
                .andExpect(content().string(frankDocJson));

        verify(frankDocService).getFrankDocJson();
    }

    @Test
    void getFrankDocJsonServiceFailsReturns404() throws Exception {
        when(frankDocService.getFrankDocJson())
                .thenThrow(new FrankDocJsonNotFoundException("Failed to fetch FrankDoc JSON", new RuntimeException()));

        mockMvc.perform(get("/api/json/frankdoc").accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isNotFound());

        verify(frankDocService).getFrankDocJson();
    }
}
