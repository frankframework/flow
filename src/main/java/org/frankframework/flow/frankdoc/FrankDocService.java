package org.frankframework.flow.frankdoc;

import lombok.extern.log4j.Log4j2;
import org.frankframework.flow.exception.ApiException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

@Log4j2
@Service
public class FrankDocService {
	private static final String FRANKDOC_JSON_URL = "https://reference.frankframework.org/js/frankdoc.json";

	private final RestTemplate restTemplate;

	public FrankDocService(RestTemplate restTemplate) {
		this.restTemplate = restTemplate;
	}

	/**
	 * Fetches the FrankDoc JSON from the external URL.
	 *
	 * @return The FrankDoc JSON as a String.
	 */
	public String getFrankDocJson() {
		try {
			log.info("Fetching FrankDoc JSON from {}", FRANKDOC_JSON_URL);
			return restTemplate.getForObject(FRANKDOC_JSON_URL, String.class);
		} catch (RestClientException _) {
			throw new ApiException("Failed to fetch FrankDoc JSON", HttpStatus.NOT_FOUND);
		}
	}
}
