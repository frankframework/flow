package org.frankframework.flow.utility;

import static org.junit.Assert.assertNull;
import static org.junit.jupiter.api.Assertions.*;

import javax.xml.parsers.DocumentBuilderFactory;
import org.junit.jupiter.api.Test;
import org.w3c.dom.Document;
import org.w3c.dom.Element;
import org.w3c.dom.Node;
import org.w3c.dom.NodeList;

class XmlAdapterUtilsTest {

	private Document parseXml(String xml) throws Exception {
		return DocumentBuilderFactory.newInstance()
				.newDocumentBuilder()
				.parse(new java.io.ByteArrayInputStream(xml.getBytes()));
	}

	@Test
	void findAdapter_returnsNodeForUppercaseTag() throws Exception {
		String xml = "<Configuration><Adapter name=\"TestAdapter\"/></Configuration>";
		Document doc = parseXml(xml);

		Node node = XmlAdapterUtils.findAdapterInDocument(doc, "TestAdapter");

		assertNotNull(node);
		assertEquals("Adapter", node.getNodeName());
		assertEquals("TestAdapter", node.getAttributes().getNamedItem("name").getNodeValue());
	}

	@Test
	void findAdapter_returnsNodeForLowercaseTag() throws Exception {
		String xml = "<configuration><adapter name=\"lowerAdapter\"/></configuration>";
		Document doc = parseXml(xml);

		Node node = XmlAdapterUtils.findAdapterInDocument(doc, "lowerAdapter");

		assertNotNull(node);
		assertEquals("adapter", node.getNodeName());
	}

	@Test
	void findAdapter_returnsNullWhenNotFound() throws Exception {
		String xml = "<Configuration><Adapter name=\"Other\"/></Configuration>";
		Document doc = parseXml(xml);

		assertNull(XmlAdapterUtils.findAdapterInDocument(doc, "Missing"));
	}

	@Test
	void findAdapter_returnsNullForEmptyDocument() throws Exception {
		Document doc = parseXml("<root></root>");

		assertNull(XmlAdapterUtils.findAdapterInDocument(doc, "Any"));
	}

	@Test
	void findAdapter_returnsFirstMatchWhenDuplicateNames() throws Exception {
		String xml = "<Configuration><Adapter name=\"A\"/><Adapter name=\"A\"/></Configuration>";
		Document doc = parseXml(xml);

		Node node = XmlAdapterUtils.findAdapterInDocument(doc, "A");

		assertNotNull(node);
		assertEquals("A", node.getAttributes().getNamedItem("name").getNodeValue());
	}

	@Test
	void replaceAdapter_replacesMatchingAdapter() throws Exception {
		String xml = "<Configuration><Adapter name=\"A\"><Old/></Adapter></Configuration>";
		Document doc = parseXml(xml);
		Document replacement = parseXml("<Adapter name=\"A\"><New/></Adapter>");

		boolean result = XmlAdapterUtils.replaceAdapterInDocument(doc, "A", replacement.getDocumentElement());

		assertTrue(result);
		String output = XmlConfigurationUtils.convertNodeToString(doc);
		assertTrue(output.contains("New"));
		assertFalse(output.contains("Old"));
	}

	@Test
	void replaceAdapter_returnsFalseWhenNotFound() throws Exception {
		String xml = "<Configuration><Adapter name=\"A\"/></Configuration>";
		Document doc = parseXml(xml);
		Document replacement = parseXml("<Adapter name=\"B\"/>");

		assertFalse(XmlAdapterUtils.replaceAdapterInDocument(doc, "B", replacement.getDocumentElement()));
	}

	@Test
	void replaceAdapter_preservesOtherAdapters() throws Exception {
		String xml = "<Configuration><Adapter name=\"A\"><Old/></Adapter><Adapter name=\"B\"><Keep/></Adapter></Configuration>";
		Document doc = parseXml(xml);
		Document replacement = parseXml("<Adapter name=\"A\"><New/></Adapter>");

		XmlAdapterUtils.replaceAdapterInDocument(doc, "A", replacement.getDocumentElement());

		String output = XmlConfigurationUtils.convertNodeToString(doc);
		assertTrue(output.contains("New"));
		assertTrue(output.contains("Keep"));
		assertTrue(output.contains("name=\"B\""));
	}

	@Test
	void replaceAdapter_worksWithLowercaseTag() throws Exception {
		String xml = "<configuration><adapter name=\"a\"><Old/></adapter></configuration>";
		Document doc = parseXml(xml);
		Document replacement = parseXml("<adapter name=\"a\"><New/></adapter>");

		assertTrue(XmlAdapterUtils.replaceAdapterInDocument(doc, "a", replacement.getDocumentElement()));

		String output = XmlConfigurationUtils.convertNodeToString(doc);
		assertTrue(output.contains("New"));
	}

	@Test
	void addAdapter_appendsNewAdapterToRoot() throws Exception {
		String xml = "<Configuration></Configuration>";
		Document doc = parseXml(xml);

		XmlAdapterUtils.addAdapterToDocument(doc, "<Adapter name=\"New\"><Pipe/></Adapter>");

		NodeList adapters = doc.getElementsByTagName("Adapter");
		assertEquals(1, adapters.getLength());
		assertEquals("New", ((Element) adapters.item(0)).getAttribute("name"));
	}

	@Test
	void addAdapter_preservesExistingAdapters() throws Exception {
		String xml = "<Configuration><Adapter name=\"Existing\"/></Configuration>";
		Document doc = parseXml(xml);

		XmlAdapterUtils.addAdapterToDocument(doc, "<Adapter name=\"New\"/>");

		NodeList adapters = doc.getElementsByTagName("Adapter");
		assertEquals(2, adapters.getLength());
	}

	@Test
	void addAdapter_parsesComplexAdapterXml() throws Exception {
		String xml = "<Configuration></Configuration>";
		Document doc = parseXml(xml);
		String adapterXml = "<Adapter name=\"Complex\"><Receiver><ApiListener method=\"GET\"/></Receiver><Pipeline><FixedResultPipe/></Pipeline></Adapter>";

		XmlAdapterUtils.addAdapterToDocument(doc, adapterXml);

		NodeList receivers = doc.getElementsByTagName("Receiver");
		assertEquals(1, receivers.getLength());
		NodeList pipelines = doc.getElementsByTagName("Pipeline");
		assertEquals(1, pipelines.getLength());
	}

	@Test
	void addAdapter_throwsOnMalformedXml() {
		assertThrows(Exception.class, () -> {
			Document doc = parseXml("<Configuration/>");
			XmlAdapterUtils.addAdapterToDocument(doc, "<<not xml>>");
		});
	}

	@Test
	void renameAdapter_updatesNameAttribute() throws Exception {
		String xml = "<Configuration><Adapter name=\"OldName\"/></Configuration>";
		Document doc = parseXml(xml);

		boolean result = XmlAdapterUtils.renameAdapterInDocument(doc, "OldName", "NewName");

		assertTrue(result);
		assertNotNull(XmlAdapterUtils.findAdapterInDocument(doc, "NewName"));
		assertNull(XmlAdapterUtils.findAdapterInDocument(doc, "OldName"));
	}

	@Test
	void renameAdapter_returnsFalseWhenNotFound() throws Exception {
		String xml = "<Configuration><Adapter name=\"A\"/></Configuration>";
		Document doc = parseXml(xml);

		assertFalse(XmlAdapterUtils.renameAdapterInDocument(doc, "Missing", "NewName"));
	}

	@Test
	void renameAdapter_preservesOtherAdaptersAndChildren() throws Exception {
		String xml = "<Configuration><Adapter name=\"Target\"><Pipe/></Adapter><Adapter name=\"Other\"/></Configuration>";
		Document doc = parseXml(xml);

		XmlAdapterUtils.renameAdapterInDocument(doc, "Target", "Renamed");

		assertNotNull(XmlAdapterUtils.findAdapterInDocument(doc, "Renamed"));
		assertNotNull(XmlAdapterUtils.findAdapterInDocument(doc, "Other"));
		String output = XmlConfigurationUtils.convertNodeToString(doc);
		assertTrue(output.contains("Pipe"));
	}

	@Test
	void removeAdapter_removesMatchingAdapter() throws Exception {
		String xml = "<Configuration><Adapter name=\"ToRemove\"/></Configuration>";
		Document doc = parseXml(xml);

		boolean result = XmlAdapterUtils.removeAdapterFromDocument(doc, "ToRemove");

		assertTrue(result);
		assertEquals(0, doc.getElementsByTagName("Adapter").getLength());
	}

	@Test
	void removeAdapter_returnsFalseWhenNotFound() throws Exception {
		String xml = "<Configuration><Adapter name=\"A\"/></Configuration>";
		Document doc = parseXml(xml);

		assertFalse(XmlAdapterUtils.removeAdapterFromDocument(doc, "Missing"));
	}

	@Test
	void removeAdapter_preservesOtherAdapters() throws Exception {
		String xml = "<Configuration><Adapter name=\"Keep\"/><Adapter name=\"Remove\"/></Configuration>";
		Document doc = parseXml(xml);

		XmlAdapterUtils.removeAdapterFromDocument(doc, "Remove");

		assertEquals(1, doc.getElementsByTagName("Adapter").getLength());
		assertNotNull(XmlAdapterUtils.findAdapterInDocument(doc, "Keep"));
		assertNull(XmlAdapterUtils.findAdapterInDocument(doc, "Remove"));
	}
}
