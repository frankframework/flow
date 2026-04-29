package org.frankframework.flow.utility;

import static org.junit.jupiter.api.Assertions.*;

import org.junit.jupiter.api.Test;

class XmlFormatterUtilsTest {

	@Test
	void singleEmptyElement() throws Exception {
		assertEquals("<root/>", XmlFormatterUtils.format("<root/>"));
	}

	@Test
	void singleElementWithText() throws Exception {
		assertEquals("<root>hello\n</root>", XmlFormatterUtils.format("<root>hello</root>"));
	}

	@Test
	void singleAttribute() throws Exception {
		assertEquals("<root name=\"value\"/>", XmlFormatterUtils.format("<root name=\"value\"/>"));
	}

	@Test
	void multipleAttributesAlignedUnderFirst() throws Exception {
		String result = XmlFormatterUtils.format("<root a=\"1\" b=\"2\" c=\"3\"/>");
		String expected = "<root a=\"1\"\n      b=\"2\"\n      c=\"3\"/>";
		assertEquals(expected, result);
	}

	@Test
	void nestedElements() throws Exception {
		String expected = "<root>\n  <child/>\n</root>";
		assertEquals(expected, XmlFormatterUtils.format("<root><child/></root>"));
	}

	@Test
	void deeplyNestedElements() throws Exception {
		String expected = "<a>\n  <b>\n    <c/>\n  </b>\n</a>";
		assertEquals(expected, XmlFormatterUtils.format("<a><b><c/></b></a>"));
	}

	@Test
	void siblingsProduceNoBlankLines() throws Exception {
		String result = XmlFormatterUtils.format("<root><a/><b/><c/></root>");
		assertFalse(result.contains("\n\n"), "Blank lines should not appear between siblings");
		assertTrue(result.contains("  <a/>"));
		assertTrue(result.contains("  <b/>"));
		assertTrue(result.contains("  <c/>"));
	}

	@Test
	void commentIsPreserved() throws Exception {
		String result = XmlFormatterUtils.format("<root><!-- my comment --><child/></root>");
		assertTrue(result.contains("<!-- my comment -->"));
	}

	@Test
	void commentIndentMatchesDepth() throws Exception {
		String result = XmlFormatterUtils.format("<root><!-- comment --></root>");
		assertTrue(result.contains("  <!-- comment -->"));
	}

	@Test
	void attributeWithSpecialCharsEscaped() throws Exception {
		String result = XmlFormatterUtils.format("<root val=\"a&amp;b\"/>");
		assertTrue(result.contains("val=\"a&amp;b\""));
	}

	@Test
	void textWithAmpersandEscaped() throws Exception {
		String result = XmlFormatterUtils.format("<root>a&amp;b</root>");
		assertTrue(result.contains("a&amp;b"));
	}

	@Test
	void whitespaceOnlyTextIsIgnored() throws Exception {
		assertEquals("<root/>", XmlFormatterUtils.format("<root>   </root>"));
	}

	@Test
	void alreadyFormattedInputIsIdempotent() throws Exception {
		String input = "<root>\n  <child name=\"x\"/>\n</root>";
		assertEquals(input, XmlFormatterUtils.format(input));
	}

	@Test
	void multipleTopLevelSiblingChildrenNoBlankLines() throws Exception {
		String result = XmlFormatterUtils.format("<config><a x=\"1\"/><b y=\"2\"/></config>");
		assertFalse(result.contains("\n\n"));
	}

	@Test
	void xxeExternalEntityIsNotExpanded() throws Exception {
		String xxe = "<?xml version=\"1.0\"?>"
				+ "<!DOCTYPE root [<!ENTITY xxe SYSTEM \"file:///etc/passwd\">]>"
				+ "<root>&xxe;</root>";
		String result = XmlFormatterUtils.format(xxe);
		assertFalse(result.contains("root:"), "External entity content should not be expanded");
	}
}
