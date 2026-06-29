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

class XmlNonCanvasComponentUtilsTest {

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
	void getNonCanvasComponents_excludesAdapters() throws Exception {
		Document document = parseXml(CONFIGURATION);

		List<Element> components = XmlNonCanvasComponentUtils.getNonCanvasComponents(document);

		assertEquals(3, components.size());
		assertEquals("Scheduler", components.get(0).getTagName());
		assertEquals("Monitoring", components.get(1).getTagName());
		assertEquals("JmsRealms", components.get(2).getTagName());
	}

	@Test
	void getNonCanvasComponents_excludesNamespacedFlowMetadata() throws Exception {
		String xml = """
				<Configuration xmlns:flow="urn:frank-flow">
					<flow:FlowElements><flow:StickyNote/></flow:FlowElements>
					<Scheduler/>
				</Configuration>
				""";
		Document document = parseXml(xml);

		List<Element> components = XmlNonCanvasComponentUtils.getNonCanvasComponents(document);

		assertEquals(1, components.size());
		assertEquals("Scheduler", components.getFirst().getTagName());
	}

	@Test
	void getAttributes_returnsRegularAttributesWithoutNamespaceDeclarations() throws Exception {
		Document document = parseXml(CONFIGURATION);
		Element monitoring = XmlNonCanvasComponentUtils.findNonCanvasComponent(document, "Monitoring", 0);

		Map<String, String> attributes = XmlNonCanvasComponentUtils.getAttributes(monitoring);

		assertEquals(Map.of("name", "monitor", "enabled", "true"), attributes);
	}

	@Test
	void findNonCanvasComponent_returnsCorrectOccurrence() throws Exception {
		String xml = """
				<Configuration>
					<Monitoring name="first"/>
					<Monitoring name="second"/>
				</Configuration>
				""";
		Document document = parseXml(xml);

		Element second = XmlNonCanvasComponentUtils.findNonCanvasComponent(document, "Monitoring", 1);

		assertNotNull(second);
		assertEquals("second", second.getAttribute("name"));
	}

	@Test
	void findNonCanvasComponent_returnsNullWhenOccurrenceMissing() throws Exception {
		Document document = parseXml(CONFIGURATION);

		assertNull(XmlNonCanvasComponentUtils.findNonCanvasComponent(document, "Monitoring", 5));
	}

	@Test
	void addNonCanvasComponent_appendsComponentWithAttributes() throws Exception {
		Document document = parseXml(CONFIGURATION);

		XmlNonCanvasComponentUtils.addNonCanvasComponent(document, "SapSystems", Map.of("name", "sap"));

		Element added = XmlNonCanvasComponentUtils.findNonCanvasComponent(document, "SapSystems", 0);
		assertNotNull(added);
		assertEquals("sap", added.getAttribute("name"));
	}

	@Test
	void addNonCanvasComponent_skipsBlankAttributeValues() throws Exception {
		Document document = parseXml("<Configuration/>");

		XmlNonCanvasComponentUtils.addNonCanvasComponent(document, "Job", Map.of("name", "nightly", "description", "  "));

		Element added = XmlNonCanvasComponentUtils.findNonCanvasComponent(document, "Job", 0);
		assertEquals("nightly", added.getAttribute("name"));
		assertFalse(added.hasAttribute("description"));
	}

	@Test
	void updateNonCanvasComponent_replacesAttributesAndKeepsChildren() throws Exception {
		Document document = parseXml(CONFIGURATION);

		boolean updated = XmlNonCanvasComponentUtils.updateNonCanvasComponent(document, "Scheduler", 0, Map.of("name", "renamed"));

		assertTrue(updated);
		Element scheduler = XmlNonCanvasComponentUtils.findNonCanvasComponent(document, "Scheduler", 0);
		assertEquals("renamed", scheduler.getAttribute("name"));
		assertEquals(1, scheduler.getElementsByTagName("Job").getLength());
	}

	@Test
	void updateNonCanvasComponent_removesClearedAttributes() throws Exception {
		Document document = parseXml(CONFIGURATION);

		XmlNonCanvasComponentUtils.updateNonCanvasComponent(document, "Monitoring", 0, Map.of("name", "monitor"));

		Element monitoring = XmlNonCanvasComponentUtils.findNonCanvasComponent(document, "Monitoring", 0);
		assertEquals("monitor", monitoring.getAttribute("name"));
		assertFalse(monitoring.hasAttribute("enabled"));
	}

	@Test
	void updateNonCanvasComponent_returnsFalseWhenMissing() throws Exception {
		Document document = parseXml(CONFIGURATION);

		assertFalse(XmlNonCanvasComponentUtils.updateNonCanvasComponent(document, "Monitoring", 4, Map.of("name", "x")));
	}

	@Test
	void removeNonCanvasComponent_removesComponent() throws Exception {
		Document document = parseXml(CONFIGURATION);

		boolean removed = XmlNonCanvasComponentUtils.removeNonCanvasComponent(document, "Scheduler", 0);

		assertTrue(removed);
		assertNull(XmlNonCanvasComponentUtils.findNonCanvasComponent(document, "Scheduler", 0));
		assertEquals(1, document.getElementsByTagName("Adapter").getLength());
	}

	@Test
	void removeNonCanvasComponent_returnsFalseWhenMissing() throws Exception {
		Document document = parseXml(CONFIGURATION);

		assertFalse(XmlNonCanvasComponentUtils.removeNonCanvasComponent(document, "Monitoring", 9));
	}
}
