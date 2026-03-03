package org.frankframework.flow.frankconfig;

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

@WebMvcTest(FrankConfigXsdController.class)
@AutoConfigureMockMvc(addFilters = false)
class FrankConfigXsdControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private FrankConfigXsdService frankConfigXsdService;

    @MockitoBean
    private UserContextFilter userContextFilter;

    @MockitoBean
    private UserWorkspaceContext userWorkspaceContext;

    @Test
    void getFrankConfigXsdReturnsXmlContent() throws Exception {
        String xsdContent = "<xs:schema xmlns:xs=\"http://www.w3.org/2001/XMLSchema\"></xs:schema>";
        when(frankConfigXsdService.getFrankConfigXsd()).thenReturn(xsdContent);

        mockMvc.perform(get("/api/xsd/frankconfig").accept(MediaType.TEXT_XML))
                .andExpect(status().isOk())
                .andExpect(content().contentTypeCompatibleWith(MediaType.TEXT_XML))
                .andExpect(content().string(xsdContent));

        verify(frankConfigXsdService).getFrankConfigXsd();
    }

    @Test
    void getFrankConfigXsdServiceFailsReturns404() throws Exception {
        when(frankConfigXsdService.getFrankConfigXsd())
                .thenThrow(
                        new FrankConfigXsdNotFoundException("Failed to fetch FrankConfig XSD", new RuntimeException()));

        mockMvc.perform(get("/api/xsd/frankconfig")).andExpect(status().isNotFound());

        verify(frankConfigXsdService).getFrankConfigXsd();
    }
}
