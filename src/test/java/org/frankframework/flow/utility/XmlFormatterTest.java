package org.frankframework.flow.utility;

import static org.junit.jupiter.api.Assertions.*;

import org.junit.jupiter.api.Test;

class XmlFormatterTest {

	@Test
	void singleEmptyElement() throws Exception {
		assertEquals("<root/>", XmlFormatter.format("<root/>"));
	}

	@Test
	void singleAttribute() throws Exception {
		assertEquals("<root name=\"value\"/>", XmlFormatter.format("<root name=\"value\"/>"));
	}

	@Test
	void multipleAttributesAlignedUnderFirst() throws Exception {
		String result = XmlFormatter.format("<root a=\"1\" b=\"2\" c=\"3\"/>");
		String expected = """
				<root a="1"
					b="2"
					c="3"/>""";
		assertEquals(expected, result);
	}

	@Test
	void nestedElements() throws Exception {
		String input = "<root><child/></root>";
		String expected = """
				<root>
				<child/>
				</root>""";
		assertEquals(expected, XmlFormatter.format(input));
	}

	@Test
	void deeplyNestedElements() throws Exception {
		String input = "<a><b><c/></b></a>";
		String expected = """
				<a>
				<b>
					<c/>
				</b>
				</a>""";
		assertEquals(expected, XmlFormatter.format(input));
	}

	@Test
	void siblingsProduceNoBlankLines() throws Exception {
		String input = "<root><a/><b/><c/></root>";
		String result = XmlFormatter.format(input);
		assertFalse(result.contains("\n\n"), "Blank lines should not appear between siblings");
		assertTrue(result.contains("  <a/>"));
		assertTrue(result.contains("  <b/>"));
		assertTrue(result.contains("  <c/>"));
	}

	@Test
	void commentIsPreserved() throws Exception {
		String input = "<root><!-- my comment --><child/></root>";
		String result = XmlFormatter.format(input);
		assertTrue(result.contains("<!-- my comment -->"));
	}

	@Test
	void commentIndentMatchesDepth() throws Exception {
		String input = "<root><!-- comment --></root>";
		String result = XmlFormatter.format(input);
		assertTrue(result.contains("  <!-- comment -->"));
	}

	@Test
	void attributeWithSpecialCharsEscaped() throws Exception {
		String result = XmlFormatter.format("<root val=\"a&amp;b\"/>");
		assertTrue(result.contains("val=\"a&amp;b\""));
	}

	@Test
	void textWithAmpersandEscaped() throws Exception {
		String result = XmlFormatter.format("<root>a&amp;b</root>");
		assertTrue(result.contains("a&amp;b"));
	}

	@Test
	void whitespaceOnlyTextIsIgnored() throws Exception {
		String result = XmlFormatter.format("<root>   </root>");
		assertEquals("<root/>", result);
	}

	@Test
	void alreadyFormattedInputIsIdempotent() throws Exception {
		String input = """
				<root>
				<child name="x"/>
				</root>""";
		assertEquals(input, XmlFormatter.format(input));
	}

	@Test
	void multipleTopLevelSiblingChildrenNoBlankLines() throws Exception {
		String input = "<config><a x=\"1\"/><b y=\"2\"/></config>";
		String result = XmlFormatter.format(input);
		assertFalse(result.contains("\n\n"));
	}
}
