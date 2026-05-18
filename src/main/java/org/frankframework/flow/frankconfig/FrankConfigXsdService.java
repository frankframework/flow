package org.frankframework.flow.frankconfig;

import lombok.extern.slf4j.Slf4j;
import org.frankframework.flow.exception.ApiException;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

@Service
@Slf4j
public class FrankConfigXsdService {
	private static final String FRANKCONFIG_XSD_URL = "https://schemas.frankframework.org/FrankConfig.xsd";

	private final RestTemplate restTemplate;

	public FrankConfigXsdService(RestTemplate restTemplate) {
		this.restTemplate = restTemplate;
	}

	public String getFrankConfigXsd() {
		try {
			log.info("Fetching FrankConfig XSD from {}", FRANKCONFIG_XSD_URL);
			return restTemplate.getForObject(FRANKCONFIG_XSD_URL, String.class);
		} catch (RestClientException exception) {
			log.error("Failed to fetch FrankConfig XSD from {}", FRANKCONFIG_XSD_URL, exception);
			throw new ApiException("Failed to fetch FrankConfig XSD", exception);
		}
	}
}
