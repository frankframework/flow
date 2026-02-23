package org.frankframework.flow.xml;

import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.frankframework.flow.project.InvalidXmlContentException;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(XmlController.class)
@AutoConfigureMockMvc(addFilters = false)
class XmlControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private XmlService xmlService;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    void validateXmlShouldReturn200WhenValid() throws Exception {
        XmlDTO dto = new XmlDTO("<root/>");

        mockMvc.perform(post("/xml/validate")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(dto)))
                .andExpect(status().isOk());

        Mockito.verify(xmlService).validateXml("<root/>");
    }

    @Test
    void validateXmlShouldReturn400WhenInvalid() throws Exception {
        XmlDTO dto = new XmlDTO("<invalid>");

        doThrow(new InvalidXmlContentException("Invalid XML", null))
                .when(xmlService)
                .validateXml(anyString());

        mockMvc.perform(post("/xml/validate")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(dto)))
                .andExpect(status().isBadRequest());
    }

    @Test
    void normalizeXmlShouldReturnNormalizedXmlWhenValid() throws Exception {
        XmlDTO request = new XmlDTO("<adapter/>");
        XmlDTO response = new XmlDTO("<Adapter/>");

        when(xmlService.normalizeElementsInXml("<adapter/>")).thenReturn("<Adapter/>");

        mockMvc.perform(post("/xml/normalize")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.xmlContent").value("<Adapter/>"));
    }

    @Test
    void normalizeXmlShouldReturn400WhenInvalidXml() throws Exception {
        XmlDTO dto = new XmlDTO("<invalid>");

        when(xmlService.normalizeElementsInXml(anyString()))
                .thenThrow(new InvalidXmlContentException("Invalid XML", null));

        mockMvc.perform(post("/xml/normalize")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(dto)))
                .andExpect(status().isBadRequest());
    }
}
