package org.frankframework.flow.utility;

import java.io.IOException;
import java.io.StringReader;
import javax.xml.XMLConstants;
import javax.xml.parsers.ParserConfigurationException;
import javax.xml.parsers.SAXParserFactory;
import org.xml.sax.Attributes;
import org.xml.sax.InputSource;
import org.xml.sax.SAXException;
import org.xml.sax.XMLReader;
import org.xml.sax.ext.LexicalHandler;
import org.xml.sax.helpers.DefaultHandler;

public class XmlFormatter extends DefaultHandler implements LexicalHandler {
	private static final int INDENT_SIZE = 2;

	private final StringBuilder sb = new StringBuilder();
	private int depth = 0;
	private boolean startTagOpen = false;

	/**
	 * Formats {@code xml} with {@value INDENT_SIZE} spaces per indent level.
	 * Attribute order in the input is preserved exactly.
	 */
	public static String format(String xml)
			throws ParserConfigurationException, SAXException, IOException {
		XmlFormatter handler = new XmlFormatter();

		SAXParserFactory spf = SAXParserFactory.newInstance();
		spf.setNamespaceAware(false);
		spf.setFeature(XMLConstants.FEATURE_SECURE_PROCESSING, true);

		XMLReader reader = spf.newSAXParser().getXMLReader();
		reader.setContentHandler(handler);
		reader.setProperty("http://xml.org/sax/properties/lexical-handler", handler);

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
			sb.append(' ').append(attrs.getQName(0))
					.append("=\"").append(escapeAttr(attrs.getValue(0))).append('"');

			if (attrs.getLength() > 1) {
				String continuationPad = " ".repeat(elementIndent + qName.length() + INDENT_SIZE);
				for (int i = 1; i < attrs.getLength(); i++) {
					sb.append('\n').append(continuationPad)
							.append(attrs.getQName(i))
							.append("=\"").append(escapeAttr(attrs.getValue(i))).append('"');
				}
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

	@Override public void startDTD(String name, String publicId, String systemId) {}
	@Override public void endDTD() {}
	@Override public void startEntity(String name) {}
	@Override public void endEntity(String name) {}
	@Override public void startCDATA() {}
	@Override public void endCDATA() {}

	@Override
	public String toString() {
		return sb.toString();
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
}
