package org.frankframework.flow.frankdoc;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;
import java.util.stream.StreamSupport;
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
	private final ObjectMapper objectMapper;

	public FrankDocService(RestTemplate restTemplate, ObjectMapper objectMapper) {
		this.restTemplate = restTemplate;
		this.objectMapper = objectMapper;
	}

	/**
	 * Fetches the FrankDoc JSON and repairs broken parent chains before returning it.
	 *
	 * @return Repaired FrankDoc JSON.
	 */
	public String getFrankDocJson() {
		try {
			log.info("Fetching FrankDoc JSON from {}", FRANKDOC_JSON_URL);
			String raw = restTemplate.getForObject(FRANKDOC_JSON_URL, String.class);
			return repairParentChains(raw);
		} catch (RestClientException _) {
			throw new ApiException("Failed to fetch FrankDoc JSON", HttpStatus.NOT_FOUND);
		}
	}

	private String repairParentChains(String frankDocJson) {
		try {
			JsonNode root = objectMapper.readTree(frankDocJson);
			JsonNode elements = root.path("elements");

			Map<String, List<String>> childrenByParent = groupChildrenByParent(elements);
			childrenByParent.values().forEach(siblings ->
					findSuccessDeclaringAbstract(elements, siblings)
							.ifPresent(successBase -> repointSiblingsToBase(elements, siblings, successBase))
			);

			return objectMapper.writeValueAsString(root);
		} catch (Exception e) {
			log.warn("Failed to repair FrankDoc parent chains, returning raw JSON", e);
			return frankDocJson;
		}
	}

	private static Map<String, List<String>> groupChildrenByParent(JsonNode elements) {
		Iterable<Map.Entry<String, JsonNode>> fields = elements::fields;
		return StreamSupport.stream(fields.spliterator(), false)
				.filter(entry -> entry.getValue().hasNonNull("parent"))
				.collect(Collectors.groupingBy(
						entry -> entry.getValue().get("parent").asText(),
						Collectors.mapping(Map.Entry::getKey, Collectors.toList())));
	}

	private static Optional<String> findSuccessDeclaringAbstract(JsonNode elements, List<String> siblings) {
		return siblings.stream()
				.filter(fullyQualifiedName -> isAbstract(elements.path(fullyQualifiedName)) && declaresSuccessForward(elements.path(fullyQualifiedName)))
				.findFirst();
	}

	private static void repointSiblingsToBase(JsonNode elements, List<String> siblings, String successBase) {
		siblings.stream()
				.filter(fullyQualifiedName -> !fullyQualifiedName.equals(successBase))
				.forEach(fullyQualifiedName -> ((ObjectNode) elements.path(fullyQualifiedName)).put("parent", successBase));
	}

	private static boolean isAbstract(JsonNode element) {
		return element.path("abstract").asBoolean(false);
	}

	private static boolean declaresSuccessForward(JsonNode element) {
		return element.path("forwards").has("success");
	}
}
