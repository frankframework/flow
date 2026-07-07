package org.frankframework.flow.frankdoc;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.frankframework.flow.exception.ApiException;
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

	private final ObjectMapper objectMapper = new ObjectMapper();

	private FrankDocService frankDocService;

	private static final String FRANKDOC_URL = "https://reference.frankframework.org/js/frankdoc.json";

	@BeforeEach
	void setUp() {
		frankDocService = new FrankDocService(restTemplate, objectMapper);
	}

	private JsonNode fetchAndParse(String rawJson) throws Exception {
		when(restTemplate.getForObject(FRANKDOC_URL, String.class)).thenReturn(rawJson);
		String result = frankDocService.getFrankDocJson();
		return objectMapper.readTree(result);
	}

	private static String parentOf(JsonNode root, String elementFullyQualifiedName) {
		return root.path("elements").path(elementFullyQualifiedName).path("parent").asText(null);
	}

	@Test
	void getFrankDocJsonReturnsContentWhenThereIsNothingToRepair() {
		String expectedJson = "{\"version\":\"1.0\",\"types\":{}}";
		when(restTemplate.getForObject(FRANKDOC_URL, String.class)).thenReturn(expectedJson);

		String result = frankDocService.getFrankDocJson();

		assertEquals(expectedJson, result);
		verify(restTemplate).getForObject(FRANKDOC_URL, String.class);
	}

	@Test
	void getFrankDocJsonThrowsWhenRestTemplateFails() {
		when(restTemplate.getForObject(FRANKDOC_URL, String.class)).thenThrow(new RestClientException("Connection refused"));

		assertThrows(ApiException.class, () -> frankDocService.getFrankDocJson());

		verify(restTemplate).getForObject(FRANKDOC_URL, String.class);
	}

	@Test
	void repointsSiblingsToTheAbstractSuccessDeclaringSibling() throws Exception {
		String json = """
				{
				"elements": {
					"org.frankframework.core.IPipe": {},
					"org.frankframework.pipes.AbstractPipe": {
					"parent": "org.frankframework.core.IPipe",
					"abstract": true,
					"forwards": { "success": "the pipe that is executed next" }
					},
					"org.frankframework.pipes.EchoPipe": {
					"parent": "org.frankframework.core.IPipe"
					},
					"org.frankframework.pipes.XmlSwitch": {
					"parent": "org.frankframework.core.IPipe"
					}
				}
				}
				""";

		JsonNode root = fetchAndParse(json);

		assertEquals("org.frankframework.pipes.AbstractPipe", parentOf(root, "org.frankframework.pipes.EchoPipe"));
		assertEquals("org.frankframework.pipes.AbstractPipe", parentOf(root, "org.frankframework.pipes.XmlSwitch"));
		assertEquals("org.frankframework.core.IPipe", parentOf(root, "org.frankframework.pipes.AbstractPipe"));
	}

	@Test
	void leavesParentsUntouchedWhenNoSiblingIsBothAbstractAndDeclaresSuccess() throws Exception {
		String json = """
				{
				"elements": {
					"P": {},
					"AbstractWithoutSuccess": { "parent": "P", "abstract": true },
					"ConcreteWithSuccess": { "parent": "P", "forwards": { "success": "next" } }
				}
				}
				""";

		JsonNode root = fetchAndParse(json);

		assertEquals("P", parentOf(root, "AbstractWithoutSuccess"));
		assertEquals("P", parentOf(root, "ConcreteWithSuccess"));
	}

	@Test
	void repairsEachParentGroupIndependently() throws Exception {
		String json = """
				{
				"elements": {
					"IPipe": {},
					"ISender": {},
					"AbstractPipe": {
					"parent": "IPipe",
					"abstract": true,
					"forwards": { "success": "next" }
					},
					"EchoPipe": { "parent": "IPipe" },
					"AbstractSender": {
					"parent": "ISender",
					"abstract": true,
					"forwards": { "success": "next" }
					},
					"HttpSender": { "parent": "ISender" }
				}
				}
				""";

		JsonNode root = fetchAndParse(json);

		assertEquals("AbstractPipe", parentOf(root, "EchoPipe"));
		assertEquals("AbstractSender", parentOf(root, "HttpSender"));
		assertEquals("IPipe", parentOf(root, "AbstractPipe"));
		assertEquals("ISender", parentOf(root, "AbstractSender"));
	}

	@Test
	void ignoresElementsWithoutAParent() throws Exception {
		String json = """
				{
				"elements": {
					"Root": { "abstract": true, "forwards": { "success": "next" } },
					"AbstractPipe": {
					"parent": "Root",
					"abstract": true,
					"forwards": { "success": "next" }
					}
				}
				}
				""";

		JsonNode root = fetchAndParse(json);

		assertNull(parentOf(root, "Root"));
		assertEquals("Root", parentOf(root, "AbstractPipe"));
	}

	@Test
	void returnsRawJsonWhenContentCannotBeParsed() {
		String malformed = "{ this is not valid json";
		when(restTemplate.getForObject(FRANKDOC_URL, String.class)).thenReturn(malformed);

		String result = frankDocService.getFrankDocJson();

		assertEquals(malformed, result);
	}
}
