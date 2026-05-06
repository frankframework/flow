package org.frankframework.flow.utility;

import java.io.IOException;
import java.io.StringReader;
import java.util.ArrayList;
import java.util.List;
import javax.xml.XMLConstants;
import javax.xml.parsers.ParserConfigurationException;
import javax.xml.parsers.SAXParserFactory;
import org.xml.sax.Attributes;
import org.xml.sax.InputSource;
import org.xml.sax.SAXException;
import org.xml.sax.XMLReader;
import org.xml.sax.ext.DefaultHandler2;

public class XmlFormatterUtils extends DefaultHandler2 {
	private static final int INDENT_SIZE = 2;

	private final StringBuilder sb = new StringBuilder();
	private int depth = 0;
	private boolean startTagOpen = false;
	private final XsdAttributeOrdererUtils orderer;

	private XmlFormatterUtils(XsdAttributeOrdererUtils orderer) {
		this.orderer = orderer;
	}

	/**
	 * Formats {@code xml} with {@value INDENT_SIZE} spaces per indent level,
	 * preserving attribute declaration order from the input.
	 */
	public static String format(String xml)
			throws ParserConfigurationException, SAXException, IOException {
		return format(xml, null);
	}

	public static String format(String xml, XsdAttributeOrdererUtils orderer)
			throws ParserConfigurationException, SAXException, IOException {
		XmlFormatterUtils handler = new XmlFormatterUtils(orderer);
		XMLReader reader = createSecureXmlReader(handler);
		reader.parse(new InputSource(new StringReader(xml)));
		return handler.toString();
	}

	@Override
	public void startElement(String uri, String localName, String qName, Attributes attrs) {
		closeStartTagIfOpen();
		appendNewlineIfNeeded();

		int elementIndent = depth * INDENT_SIZE;
		sb.append(" ".repeat(elementIndent)).append('<').append(qName);

		if (attrs.getLength() > 0) {
			List<String[]> ordered = orderer != null ? orderer.reorder(qName, attrs) : toList(attrs);
			String attrPad = " ".repeat(elementIndent + INDENT_SIZE);
			for (String[] attr : ordered) {
				sb.append('\n').append(attrPad);
				appendAttribute(attr);
			}
		}

		startTagOpen = true;
		depth++;
	}

	@Override
	public void endElement(String uri, String localName, String qName) {
		depth--;

		if (startTagOpen) {
			sb.append("/>");
			startTagOpen = false;
		} else {
			sb.append('\n');
			sb.append(" ".repeat(depth * INDENT_SIZE));
			sb.append("</").append(qName).append('>');
		}
	}

	@Override
	public void characters(char[] ch, int start, int length) {
		String text = new String(ch, start, length).trim();
		if (!text.isEmpty()) {
			closeStartTagIfOpen();
			sb.append(escapeText(text));
		}
	}

	@Override
	public void comment(char[] ch, int start, int length) {
		closeStartTagIfOpen();
		appendNewlineIfNeeded();

		sb.append(" ".repeat(depth * INDENT_SIZE));
		sb.append("<!--").append(new String(ch, start, length)).append("-->");
	}

	@Override
	public String toString() {
		return sb.toString();
	}

	private void appendAttribute(String[] nameValue) {
		sb.append(nameValue[0]).append("=\"").append(escapeAttr(nameValue[1])).append('"');
	}

	private static List<String[]> toList(Attributes attrs) {
		List<String[]> list = new ArrayList<>(attrs.getLength());
		for (int i = 0; i < attrs.getLength(); i++) {
			list.add(new String[]{attrs.getQName(i), attrs.getValue(i)});
		}
		return list;
	}

	private void appendNewlineIfNeeded() {
		if (!sb.isEmpty() && sb.charAt(sb.length() - 1) != '\n') {
			sb.append('\n');
		}
	}

	private void closeStartTagIfOpen() {
		if (startTagOpen) {
			sb.append('>');
			startTagOpen = false;
		}
	}

	private static String escapeAttr(String val) {
		return val.replace("&", "&amp;").replace("<", "&lt;").replace("\"", "&quot;");
	}

	private static String escapeText(String val) {
		return val.replace("&", "&amp;").replace("<", "&lt;");
	}

	private static XMLReader createSecureXmlReader(XmlFormatterUtils handler)
			throws ParserConfigurationException, SAXException {
		SAXParserFactory spf = SAXParserFactory.newInstance();
		spf.setNamespaceAware(false);
		spf.setFeature(XMLConstants.FEATURE_SECURE_PROCESSING, true);
		spf.setFeature("http://xml.org/sax/features/external-general-entities", false);
		spf.setFeature("http://xml.org/sax/features/external-parameter-entities", false);
		spf.setFeature("http://apache.org/xml/features/nonvalidating/load-external-dtd", false);

		XMLReader reader = spf.newSAXParser().getXMLReader();
		reader.setFeature("http://xml.org/sax/features/external-general-entities", false);
		reader.setFeature("http://xml.org/sax/features/external-parameter-entities", false);
		reader.setContentHandler(handler);
		reader.setProperty("http://xml.org/sax/properties/lexical-handler", handler);
		return reader;
	}
}
