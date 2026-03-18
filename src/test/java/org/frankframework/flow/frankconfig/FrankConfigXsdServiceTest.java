package org.frankframework.flow.frankconfig;

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
class FrankConfigXsdServiceTest {

	@Mock
	private RestTemplate restTemplate;

	private FrankConfigXsdService frankConfigXsdService;

	private static final String FRANKCONFIG_XSD_URL = "https://schemas.frankframework.org/FrankConfig.xsd";

	@BeforeEach
	void setUp() {
		frankConfigXsdService = new FrankConfigXsdService(restTemplate);
	}

	@Test
	void getFrankConfigXsdReturnsXsdContent() throws FrankConfigXsdNotFoundException {
		String expectedXsd = "<xs:schema xmlns:xs=\"http://www.w3.org/2001/XMLSchema\"></xs:schema>";
		when(restTemplate.getForObject(FRANKCONFIG_XSD_URL, String.class)).thenReturn(expectedXsd);

		String result = frankConfigXsdService.getFrankConfigXsd();

		assertEquals(expectedXsd, result);
		verify(restTemplate).getForObject(FRANKCONFIG_XSD_URL, String.class);
	}

	@Test
	void getFrankConfigXsdThrowsWhenRestTemplateFails() {
		when(restTemplate.getForObject(FRANKCONFIG_XSD_URL, String.class))
				.thenThrow(new RestClientException("Connection refused"));

		assertThrows(FrankConfigXsdNotFoundException.class, () -> frankConfigXsdService.getFrankConfigXsd());

		verify(restTemplate).getForObject(FRANKCONFIG_XSD_URL, String.class);
	}
}
