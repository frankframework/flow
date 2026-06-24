package org.frankframework.flow.utility;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.io.ByteArrayInputStream;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.w3c.dom.Document;
import org.w3c.dom.Element;

class XmlNonCanvasElementUtilsTest {

	private static final String CONFIGURATION = """
			<Configuration name="Main">
				<Adapter name="MyAdapter">
					<Pipeline>
						<SenderPipe name="pipe"/>
					</Pipeline>
				</Adapter>
				<Scheduler>
					<Job name="daily" cronExpression="0 0 * * *"/>
				</Scheduler>
				<Monitoring name="monitor" enabled="true"/>
				<JmsRealms/>
			</Configuration>
			""";

	private Document parseXml(String xml) throws Exception {
		return XmlSecurityUtils.createSecureDocumentBuilder()
				.parse(new ByteArrayInputStream(xml.getBytes(StandardCharsets.UTF_8)));
	}

	@Test
	void getNonCanvasElements_excludesAdapters() throws Exception {
		Document document = parseXml(CONFIGURATION);

		List<Element> elements = XmlNonCanvasElementUtils.getNonCanvasElements(document);

		assertEquals(3, elements.size());
		assertEquals("Scheduler", elements.get(0).getTagName());
		assertEquals("Monitoring", elements.get(1).getTagName());
		assertEquals("JmsRealms", elements.get(2).getTagName());
	}

	@Test
	void getNonCanvasElements_excludesNamespacedFlowMetadata() throws Exception {
		String xml = """
				<Configuration xmlns:flow="urn:frank-flow">
					<flow:FlowElements><flow:StickyNote/></flow:FlowElements>
					<Scheduler/>
				</Configuration>
				""";
		Document document = parseXml(xml);

		List<Element> elements = XmlNonCanvasElementUtils.getNonCanvasElements(document);

		assertEquals(1, elements.size());
		assertEquals("Scheduler", elements.getFirst().getTagName());
	}

	@Test
	void getAttributes_returnsRegularAttributesWithoutNamespaceDeclarations() throws Exception {
		Document document = parseXml(CONFIGURATION);
		Element monitoring = XmlNonCanvasElementUtils.findNonCanvasElement(document, "Monitoring", 0);

		Map<String, String> attributes = XmlNonCanvasElementUtils.getAttributes(monitoring);

		assertEquals(Map.of("name", "monitor", "enabled", "true"), attributes);
	}

	@Test
	void findNonCanvasElement_returnsCorrectOccurrence() throws Exception {
		String xml = """
				<Configuration>
					<Monitoring name="first"/>
					<Monitoring name="second"/>
				</Configuration>
				""";
		Document document = parseXml(xml);

		Element second = XmlNonCanvasElementUtils.findNonCanvasElement(document, "Monitoring", 1);

		assertNotNull(second);
		assertEquals("second", second.getAttribute("name"));
	}

	@Test
	void findNonCanvasElement_returnsNullWhenOccurrenceMissing() throws Exception {
		Document document = parseXml(CONFIGURATION);

		assertNull(XmlNonCanvasElementUtils.findNonCanvasElement(document, "Monitoring", 5));
	}

	@Test
	void addNonCanvasElement_appendsElementWithAttributes() throws Exception {
		Document document = parseXml(CONFIGURATION);

		XmlNonCanvasElementUtils.addNonCanvasElement(document, "SapSystems", Map.of("name", "sap"));

		Element added = XmlNonCanvasElementUtils.findNonCanvasElement(document, "SapSystems", 0);
		assertNotNull(added);
		assertEquals("sap", added.getAttribute("name"));
	}

	@Test
	void addNonCanvasElement_skipsBlankAttributeValues() throws Exception {
		Document document = parseXml("<Configuration/>");

		XmlNonCanvasElementUtils.addNonCanvasElement(document, "Job", Map.of("name", "nightly", "description", "  "));

		Element added = XmlNonCanvasElementUtils.findNonCanvasElement(document, "Job", 0);
		assertEquals("nightly", added.getAttribute("name"));
		assertFalse(added.hasAttribute("description"));
	}

	@Test
	void updateNonCanvasElement_replacesAttributesAndKeepsChildren() throws Exception {
		Document document = parseXml(CONFIGURATION);

		boolean updated = XmlNonCanvasElementUtils.updateNonCanvasElement(document, "Scheduler", 0, Map.of("name", "renamed"));

		assertTrue(updated);
		Element scheduler = XmlNonCanvasElementUtils.findNonCanvasElement(document, "Scheduler", 0);
		assertEquals("renamed", scheduler.getAttribute("name"));
		assertEquals(1, scheduler.getElementsByTagName("Job").getLength());
	}

	@Test
	void updateNonCanvasElement_removesClearedAttributes() throws Exception {
		Document document = parseXml(CONFIGURATION);

		XmlNonCanvasElementUtils.updateNonCanvasElement(document, "Monitoring", 0, Map.of("name", "monitor"));

		Element monitoring = XmlNonCanvasElementUtils.findNonCanvasElement(document, "Monitoring", 0);
		assertEquals("monitor", monitoring.getAttribute("name"));
		assertFalse(monitoring.hasAttribute("enabled"));
	}

	@Test
	void updateNonCanvasElement_returnsFalseWhenMissing() throws Exception {
		Document document = parseXml(CONFIGURATION);

		assertFalse(XmlNonCanvasElementUtils.updateNonCanvasElement(document, "Monitoring", 4, Map.of("name", "x")));
	}

	@Test
	void removeNonCanvasElement_removesElement() throws Exception {
		Document document = parseXml(CONFIGURATION);

		boolean removed = XmlNonCanvasElementUtils.removeNonCanvasElement(document, "Scheduler", 0);

		assertTrue(removed);
		assertNull(XmlNonCanvasElementUtils.findNonCanvasElement(document, "Scheduler", 0));
		assertEquals(1, document.getElementsByTagName("Adapter").getLength());
	}

	@Test
	void removeNonCanvasElement_returnsFalseWhenMissing() throws Exception {
		Document document = parseXml(CONFIGURATION);

		assertFalse(XmlNonCanvasElementUtils.removeNonCanvasElement(document, "Monitoring", 9));
	}
}
