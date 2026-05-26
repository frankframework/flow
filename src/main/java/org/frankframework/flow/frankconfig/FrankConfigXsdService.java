package org.frankframework.flow.frankconfig;

import lombok.extern.log4j.Log4j2;
import org.frankframework.flow.exception.ApiException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

@Log4j2
@Service
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
			throw new ApiException("Failed to fetch FrankConfig XSD", HttpStatus.NOT_FOUND);
		}
	}
}
