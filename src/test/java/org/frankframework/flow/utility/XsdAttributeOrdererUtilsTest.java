package org.frankframework.flow.utility;

import static org.junit.jupiter.api.Assertions.*;

import java.util.List;
import javax.xml.parsers.DocumentBuilderFactory;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.w3c.dom.Document;
import org.w3c.dom.Element;
import org.xml.sax.helpers.AttributesImpl;

public class XsdAttributeOrdererUtilsTest {
	private XsdAttributeOrdererUtils orderer;
	private Document doc;

	@BeforeEach
	public void setUp() throws Exception {
		doc = DocumentBuilderFactory.newInstance().newDocumentBuilder().newDocument();
		Element root = doc.createElementNS("http://www.w3.org/2001/XMLSchema", "schema");
		doc.appendChild(root);
		orderer = new XsdAttributeOrdererUtils(doc);
	}

	@Test
	public void testReorder_EmptyAttributes_ReturnsEmpty() {
		List<String[]> result = orderer.reorder("unknown", new AttributesImpl());
		assertTrue(result.isEmpty());
	}

	@Test
	public void testReorder_UnknownElement_ReturnsAlphabetical() {
		AttributesImpl attrs = new AttributesImpl();
		attrs.addAttribute("", "", "z", "", "valZ");
		attrs.addAttribute("", "", "a", "", "valA");

		List<String[]> result = orderer.reorder("missingType", attrs);

		assertEquals("a", result.get(0)[0]);
		assertEquals("z", result.get(1)[0]);
	}

	@Test
	public void testReorder_MixedKnownAndUnknown_OrderMaintained() {
		addComplexType("known");
		AttributesImpl attrs = new AttributesImpl();
		attrs.addAttribute("", "", "unknown", "", "valU");
		attrs.addAttribute("", "", "known", "", "valK");

		List<String[]> result = orderer.reorder("my", attrs);

		assertEquals("known", result.get(0)[0]);
		assertEquals("unknown", result.get(1)[0]);
	}

	@Test
	public void testReorder_WithNamespacedAttributes() {
		AttributesImpl attrs = new AttributesImpl();
		attrs.addAttribute("", "", "flow:id", "", "1");
		attrs.addAttribute("", "", "normal", "", "value");

		List<String[]> result = orderer.reorder("any", attrs);

		assertEquals("flow:id", result.get(0)[0]);
		assertEquals("normal", result.get(1)[0]);
	}

	@Test
	public void testReorder_WithCircularDependency_DoesNotStackOverflow() {
		Element ct = doc.createElementNS("http://www.w3.org/2001/XMLSchema", "complexType");
		ct.setAttribute("name", "loopType");
		doc.getDocumentElement().appendChild(ct);

		Element ext = doc.createElementNS("http://www.w3.org/2001/XMLSchema", "extension");
		ext.setAttribute("base", "loopType");
		ct.appendChild(ext);

		AttributesImpl attrs = new AttributesImpl();
		attrs.addAttribute("", "", "test", "", "val");

		assertDoesNotThrow(() -> orderer.reorder("loop", attrs));
	}

	@Test
	public void testReorder_AttributesInXsdButMissingInXml_AreIgnored() {
		addComplexType("attrA", "attrB");

		AttributesImpl attrs = new AttributesImpl();
		attrs.addAttribute("", "", "attrB", "", "valB");

		List<String[]> result = orderer.reorder("my", attrs);

		assertEquals(1, result.size());
		assertEquals("attrB", result.getFirst()[0]);
	}

	@Test
	void testReorder_RequiredVsOptionalOrdering() {
		addComplexType("requiredAttr", "optionalAttr");

		orderer = new XsdAttributeOrdererUtils(doc);

		AttributesImpl attrs = new AttributesImpl();
		attrs.addAttribute("", "", "optionalAttr", "", "valOpt");
		attrs.addAttribute("", "", "requiredAttr", "", "valReq");

		List<String[]> result = orderer.reorder("my", attrs);

		assertEquals(2, result.size(), "Resultaat moet 2 attributen bevatten");
		assertEquals("requiredAttr", result.get(0)[0], "Eerste attribuut moet 'requiredAttr' zijn volgens XSD volgorde");
		assertEquals("optionalAttr", result.get(1)[0], "Tweede attribuut moet 'optionalAttr' zijn volgens XSD volgorde");
	}

	@Test
	public void testReorder_HandlesEmptyNamespaceAttributes() {
		AttributesImpl attrs = new AttributesImpl();
		attrs.addAttribute(null, null, "attr", "", "val");

		List<String[]> result = orderer.reorder("any", attrs);

		assertEquals(1, result.size());
		assertEquals("attr", result.getFirst()[0]);
	}

	private void addComplexType(String... attributes) {
		Element ct = doc.createElementNS("http://www.w3.org/2001/XMLSchema", "complexType");
		ct.setAttribute("name", "myType");
		doc.getDocumentElement().appendChild(ct);
		for (String attr : attributes) {
			Element a = doc.createElementNS("http://www.w3.org/2001/XMLSchema", "attribute");
			a.setAttribute("name", attr);
			ct.appendChild(a);
		}
	}

	private void addAttr(Element parent, String name) {
		Element a = doc.createElementNS("http://www.w3.org/2001/XMLSchema", "attribute");
		a.setAttribute("name", name);
		parent.appendChild(a);
	}
}
