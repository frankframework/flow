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

	@Test
	void normalizeFrankElements_capitalizesLowercaseTag() throws Exception {
		String result = XmlConfigurationUtils.normalizeFrankElements("<adapter></adapter>");

		Document doc = parseXml(result);
		assertEquals("Adapter", doc.getDocumentElement().getTagName());
	}

	@Test
	void normalizeFrankElements_renamesTagUsingClassName() throws Exception {
		String result = XmlConfigurationUtils.normalizeFrankElements(
				"<adapter className=\"org.example.MyAdapter\"></adapter>");

		Document doc = parseXml(result);
		assertEquals("MyAdapter", doc.getDocumentElement().getTagName());
	}

	@Test
	void normalizeFrankElements_removesClassNameAttribute() throws Exception {
		String result = XmlConfigurationUtils.normalizeFrankElements(
				"<adapter className=\"org.example.MyAdapter\"></adapter>");

		Document doc = parseXml(result);
		assertFalse(doc.getDocumentElement().hasAttribute("className"));
	}

	@Test
	void normalizeFrankElements_preservesOtherAttributes() throws Exception {
		String result = XmlConfigurationUtils.normalizeFrankElements(
				"<adapter id=\"1\" className=\"org.example.MyAdapter\" enabled=\"true\"></adapter>");

		Document doc = parseXml(result);
		Element root = doc.getDocumentElement();
		assertEquals("MyAdapter", root.getTagName());
		assertEquals("1", root.getAttribute("id"));
		assertEquals("true", root.getAttribute("enabled"));
	}

	@Test
	void normalizeFrankElements_preservesChildElements() throws Exception {
		String result = XmlConfigurationUtils.normalizeFrankElements("<adapter><child/></adapter>");

		Document doc = parseXml(result);
		assertEquals("Adapter", doc.getDocumentElement().getTagName());
		assertEquals(1, doc.getDocumentElement().getElementsByTagName("Child").getLength());
	}

	@Test
	void normalizeFrankElements_handlesMultipleElements() throws Exception {
		String result = XmlConfigurationUtils.normalizeFrankElements(
				"<root><adapter className=\"org.example.A\"></adapter><adapter></adapter></root>");

		Document doc = parseXml(result);
		assertEquals("Root", doc.getDocumentElement().getTagName());
		assertEquals(1, doc.getDocumentElement().getElementsByTagName("A").getLength());
		assertEquals(1, doc.getDocumentElement().getElementsByTagName("Adapter").getLength());
	}

	@Test
	void normalizeFrankElements_doesNotModifyUppercaseTags() throws Exception {
		String result = XmlConfigurationUtils.normalizeFrankElements(
				"<Configuration><Adapter name=\"A\"/></Configuration>");

		Document doc = parseXml(result);
		assertEquals("Configuration", doc.getDocumentElement().getTagName());
	}

	@Test
	void normalizeFrankElements_transformsMessageLog() throws Exception {
		String result = XmlConfigurationUtils.normalizeFrankElements(
				"<messageLog className=\"org.frankframework.jdbc.JdbcTransactionalStorage\" slotId=\"check\" />");

		Document doc = parseXml(result);
		assertEquals("JdbcMessageLog", doc.getDocumentElement().getTagName());
		assertEquals("check", doc.getDocumentElement().getAttribute("slotId"));
	}

	@Test
	void normalizeFrankElements_transformsMessageLogWithoutTransactionalSuffix() throws Exception {
		String result = XmlConfigurationUtils.normalizeFrankElements(
				"<messageLog className=\"org.frankframework.jdbc.SomeStorage\" />");

		Document doc = parseXml(result);
		assertEquals("SomeStorageMessageLog", doc.getDocumentElement().getTagName());
	}

	@Test
	void normalizeFrankElements_transformsInputValidator() throws Exception {
		String result = XmlConfigurationUtils.normalizeFrankElements(
				"<inputValidator className=\"org.frankframework.extensions.api.ApiWsdlXmlValidator\" />");

		Document doc = parseXml(result);
		assertEquals("ApiWsdlXmlInputValidator", doc.getDocumentElement().getTagName());
	}

	@Test
	void normalizeFrankElements_transformsOutputValidator() throws Exception {
		String result = XmlConfigurationUtils.normalizeFrankElements(
				"<outputValidator className=\"org.frankframework.extensions.api.ApiWsdlXmlValidator\" />");

		Document doc = parseXml(result);
		assertEquals("ApiWsdlXmlOutputValidator", doc.getDocumentElement().getTagName());
	}

	@Test
	void normalizeFrankElements_transformsInputWrapper() throws Exception {
		String result = XmlConfigurationUtils.normalizeFrankElements(
				"<inputWrapper className=\"org.frankframework.extensions.api.ApiSoapWrapperPipe\" />");

		Document doc = parseXml(result);
		assertEquals("ApiSoapInputWrapper", doc.getDocumentElement().getTagName());
	}

	@Test
	void normalizeFrankElements_transformsOutputWrapper() throws Exception {
		String result = XmlConfigurationUtils.normalizeFrankElements(
				"<outputWrapper className=\"org.frankframework.extensions.api.ApiSoapWrapperPipe\" />");

		Document doc = parseXml(result);
		assertEquals("ApiSoapOutputWrapper", doc.getDocumentElement().getTagName());
	}

	@Test
	void normalizeFrankElements_transformsPipeUsingClassName() throws Exception {
		String result = XmlConfigurationUtils.normalizeFrankElements(
				"<pipe className=\"org.frankframework.pipes.FixedResultPipe\" />");

		Document doc = parseXml(result);
		assertEquals("FixedResultPipe", doc.getDocumentElement().getTagName());
	}

	@Test
	void normalizeFrankElements_stripsValidatorSuffixBeforeAddingDirection() throws Exception {
		String result = XmlConfigurationUtils.normalizeFrankElements(
				"<inputValidator className=\"org.frankframework.pipes.JsonValidator\" />");

		Document doc = parseXml(result);
		assertEquals("JsonInputValidator", doc.getDocumentElement().getTagName());
	}

	@Test
	void normalizeFrankElements_stripsWrapperAndPipeSuffixBeforeAddingDirection() throws Exception {
		String result = XmlConfigurationUtils.normalizeFrankElements(
				"<outputWrapper className=\"org.frankframework.pipes.SoapWrapperPipe\" />");

		Document doc = parseXml(result);
		assertEquals("SoapOutputWrapper", doc.getDocumentElement().getTagName());
	}
}
