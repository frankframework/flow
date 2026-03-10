package org.frankframework.flow.frankdoc;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

@Service
@Slf4j
public class FrankDocService {
    private static final String FRANKDOC_JSON_URL = "https://frankdoc.frankframework.org/js/frankdoc.json";

    private final RestTemplate restTemplate;

    public FrankDocService(RestTemplate restTemplate) {
        this.restTemplate = restTemplate;
    }

    /**
     * Fetches the FrankDoc JSON from the external URL.
     * @return The FrankDoc JSON as a String.
     */
    public String getFrankDocJson() throws FrankDocJsonNotFoundException {
        try {
            log.info("Fetching FrankDoc JSON from {}", FRANKDOC_JSON_URL);
            return restTemplate.getForObject(FRANKDOC_JSON_URL, String.class);
        } catch (Exception exception) {
            throw new FrankDocJsonNotFoundException("Failed to fetch FrankDoc JSON", exception);
        }
    }
}
