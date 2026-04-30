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
	void testReorder_RequiredBeforeOptional_RegardlessOfInputOrder() {
		// XSD defines optional first, then required - required must still come first in output
		Element ct = addComplexTypeElement("my");
		addAttrElement(ct, "optionalAttr", false);
		addAttrElement(ct, "requiredAttr", true);
		orderer = new XsdAttributeOrdererUtils(doc);

		AttributesImpl attrs = new AttributesImpl();
		attrs.addAttribute("", "", "optionalAttr", "", "valOpt");
		attrs.addAttribute("", "", "requiredAttr", "", "valReq");

		List<String[]> result = orderer.reorder("my", attrs);

		assertEquals(2, result.size());
		assertEquals("requiredAttr", result.get(0)[0], "Required attr must come before optional");
		assertEquals("optionalAttr", result.get(1)[0], "Optional attr comes after required");
	}

	@Test
	void testReorder_RequiredAttrsInXsdOrder_NotAlphabetical() {
		// XSD order: z_required, a_required - both required, must keep XSD order (z before a)
		Element ct = addComplexTypeElement("my");
		addAttrElement(ct, "z_required", true);
		addAttrElement(ct, "a_required", true);
		orderer = new XsdAttributeOrdererUtils(doc);

		AttributesImpl attrs = new AttributesImpl();
		attrs.addAttribute("", "", "a_required", "", "val");
		attrs.addAttribute("", "", "z_required", "", "val");

		List<String[]> result = orderer.reorder("my", attrs);

		assertEquals(2, result.size());
		assertEquals("z_required", result.get(0)[0], "First required in XSD order (z comes before a in XSD)");
		assertEquals("a_required", result.get(1)[0], "Second required in XSD order");
	}

	@Test
	void testReorder_OptionalAttrsInXsdOrder_NotAlphabetical() {
		// XSD order: z_opt, a_opt - both optional, must keep XSD order (z before a)
		Element ct = addComplexTypeElement("my");
		addAttrElement(ct, "z_opt", false);
		addAttrElement(ct, "a_opt", false);
		orderer = new XsdAttributeOrdererUtils(doc);

		AttributesImpl attrs = new AttributesImpl();
		attrs.addAttribute("", "", "a_opt", "", "val");
		attrs.addAttribute("", "", "z_opt", "", "val");

		List<String[]> result = orderer.reorder("my", attrs);

		assertEquals(2, result.size());
		assertEquals("z_opt", result.get(0)[0], "First optional in XSD order (z comes before a in XSD)");
		assertEquals("a_opt", result.get(1)[0], "Second optional in XSD order");
	}

	@Test
	void testReorder_MixedRequiredOptional_XsdOrderWithinGroups() {
		// XSD order: opt1, req1, opt2, req2 - required group: req1, req2; optional group: opt1, opt2
		Element ct = addComplexTypeElement("my");
		addAttrElement(ct, "opt1", false);
		addAttrElement(ct, "req1", true);
		addAttrElement(ct, "opt2", false);
		addAttrElement(ct, "req2", true);
		orderer = new XsdAttributeOrdererUtils(doc);

		AttributesImpl attrs = new AttributesImpl();
		attrs.addAttribute("", "", "opt2", "", "v");
		attrs.addAttribute("", "", "req2", "", "v");
		attrs.addAttribute("", "", "opt1", "", "v");
		attrs.addAttribute("", "", "req1", "", "v");

		List<String[]> result = orderer.reorder("my", attrs);

		assertEquals(4, result.size());
		assertEquals("req1", result.get(0)[0], "First required in XSD order");
		assertEquals("req2", result.get(1)[0], "Second required in XSD order");
		assertEquals("opt1", result.get(2)[0], "First optional in XSD order");
		assertEquals("opt2", result.get(3)[0], "Second optional in XSD order");
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
		Element ct = addComplexTypeElement("my");
		for (String attr : attributes) {
			addAttrElement(ct, attr, false);
		}
	}

	private Element addComplexTypeElement(String elementName) {
		Element ct = doc.createElementNS("http://www.w3.org/2001/XMLSchema", "complexType");
		ct.setAttribute("name", elementName + "Type");
		doc.getDocumentElement().appendChild(ct);
		return ct;
	}

	private void addAttrElement(Element parent, String name, boolean required) {
		Element a = doc.createElementNS("http://www.w3.org/2001/XMLSchema", "attribute");
		a.setAttribute("name", name);
		if (required) a.setAttribute("use", "required");
		parent.appendChild(a);
	}
}
