package org.frankframework.flow.frankdoc;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

@ExtendWith(MockitoExtension.class)
class FrankDocServiceTest {

    @Mock
    private RestTemplate restTemplate;

    private FrankDocService frankDocService;

    private static final String FRANKDOC_URL = "https://frankdoc.frankframework.org/js/frankdoc.json";

    @BeforeEach
    void setUp() {
        frankDocService = new FrankDocService(restTemplate);
    }

    @Test
    void getFrankDocJsonReturnsJsonContent() throws FrankDocJsonNotFoundException {
        String expectedJson = "{\"version\":\"1.0\",\"types\":{}}";
        when(restTemplate.getForObject(FRANKDOC_URL, String.class)).thenReturn(expectedJson);

        String result = frankDocService.getFrankDocJson();

        assertEquals(expectedJson, result);
        verify(restTemplate).getForObject(FRANKDOC_URL, String.class);
    }

    @Test
    void getFrankDocJsonThrowsWhenRestTemplateFails() {
        when(restTemplate.getForObject(FRANKDOC_URL, String.class))
                .thenThrow(new RestClientException("Connection refused"));

        assertThrows(FrankDocJsonNotFoundException.class, () -> frankDocService.getFrankDocJson());

        verify(restTemplate).getForObject(FRANKDOC_URL, String.class);
    }
}
