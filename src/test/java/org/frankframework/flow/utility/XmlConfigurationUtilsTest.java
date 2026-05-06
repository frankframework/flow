package org.frankframework.flow.utility;

import static org.junit.Assert.assertNull;
import static org.junit.jupiter.api.Assertions.*;

import javax.xml.parsers.DocumentBuilderFactory;
import org.junit.jupiter.api.Test;
import org.w3c.dom.Document;
import org.w3c.dom.Element;

class XmlConfigurationUtilsTest {

	private Document parseXml(String xml) throws Exception {
		return DocumentBuilderFactory.newInstance()
				.newDocumentBuilder()
				.parse(new java.io.ByteArrayInputStream(xml.getBytes()));
	}

	@Test
	void convertNodeToString_producesFormattedXml() throws Exception {
		Document doc = parseXml("<Configuration><Adapter name=\"A\"/></Configuration>");

		String result = XmlConfigurationUtils.convertNodeToString(doc);

		assertTrue(result.contains("Configuration"));
		assertTrue(result.contains("Adapter"));
		assertTrue(result.contains("name=\"A\""));
	}

	@Test
	void convertNodeToString_omitsXmlDeclaration() throws Exception {
		Document doc = parseXml("<Root/>");

		String result = XmlConfigurationUtils.convertNodeToString(doc);

		assertFalse(result.contains("<?xml"));
	}

	@Test
	void convertNodeToString_removesEmptyLines() throws Exception {
		Document doc = parseXml("<Root><Child/></Root>");

		String result = XmlConfigurationUtils.convertNodeToString(doc);

		assertFalse(result.matches("(?s).*\\n\\s*\\n.*"), "Should not contain empty lines");
	}

	// ── insertFlowNamespace ──

	@Test
	void insertFlowNamespace_addsNamespaceWhenMissing() throws Exception {
		String xml = "<Configuration name=\"TestConfig\"><Adapter name=\"A\"/></Configuration>";

		Document updated = XmlConfigurationUtils.insertFlowNamespace(xml);

		Element configuration = updated.getDocumentElement();
		assertEquals("urn:frank-flow", configuration.getAttribute("xmlns:flow"));
	}

	@Test
	void insertFlowNamespace_doesNotDuplicateWhenAlreadyPresent() throws Exception {
		String xml = "<Configuration name=\"TestConfig\" xmlns:flow=\"urn:frank-flow\"><Adapter name=\"A\"/></Configuration>";

		Document updated = XmlConfigurationUtils.insertFlowNamespace(xml);

		Element configuration = updated.getDocumentElement();
		assertEquals("urn:frank-flow", configuration.getAttribute("xmlns:flow"));

		long count = 0;
		var attributes = configuration.getAttributes();
		for (int i = 0; i < attributes.getLength(); i++) {
			if ("xmlns:flow".equals(attributes.item(i).getNodeName())) {
				count++;
			}
		}
		assertEquals(1, count);
	}

	@Test
	void insertFlowNamespace_returnsNullForNullInput() throws Exception {
		assertNull(XmlConfigurationUtils.insertFlowNamespace(null));
	}

	@Test
	void insertFlowNamespace_returnsNullForBlankInput() throws Exception {
		assertNull(XmlConfigurationUtils.insertFlowNamespace("   "));
	}
}
