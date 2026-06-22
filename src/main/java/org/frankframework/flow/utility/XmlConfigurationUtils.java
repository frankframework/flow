package org.frankframework.flow.utility;

import java.io.IOException;
import java.io.StringReader;
import java.io.StringWriter;
import java.util.List;
import java.util.regex.Pattern;
import javax.xml.XMLConstants;
import javax.xml.parsers.DocumentBuilder;
import javax.xml.parsers.ParserConfigurationException;
import javax.xml.transform.*;
import javax.xml.transform.dom.DOMSource;
import javax.xml.transform.stream.StreamResult;
import lombok.experimental.UtilityClass;
import org.w3c.dom.*;
import org.xml.sax.InputSource;
import org.xml.sax.SAXException;

@UtilityClass
public class XmlConfigurationUtils {

	private static final List<String> ROOT_ELEMENTS = List.of("Configuration", "Module");
	private static final String FLOW_NAMESPACE_QNAME = "xmlns:flow";
	private static final String FLOW_NAMESPACE_URI = "urn:frank-flow";
	private static final Pattern ROOT_ELEMENT_PATTERN =
			Pattern.compile("(<(?:" + String.join("|", ROOT_ELEMENTS) + "))\\b");
	private static final String FLOW_NAMESPACE_REPLACEMENT =
			"$1 " + FLOW_NAMESPACE_QNAME + "=\"" + FLOW_NAMESPACE_URI + "\"";

	/**
	 * Checks if a configuration document has the flow namespace included.
	 * If not: it includes it
	 */
	public static Document insertFlowNamespace(String configurationXml)
			throws ParserConfigurationException, SAXException, IOException {

		if (configurationXml == null || configurationXml.isBlank()) {
			return null;
		}

		DocumentBuilder builder = XmlSecurityUtils.createSecureDocumentBuilder();

		Document configDoc = builder.parse(new InputSource(new StringReader(configurationXml)));

		for (String rootElement : ROOT_ELEMENTS) {
			NodeList rootNodes = configDoc.getElementsByTagName(rootElement);

			for (int i = 0; i < rootNodes.getLength(); i++) {
				Element root = (Element) rootNodes.item(i);

				if (!root.hasAttribute(FLOW_NAMESPACE_QNAME)) {
					root.setAttributeNS(XMLConstants.XMLNS_ATTRIBUTE_NS_URI, FLOW_NAMESPACE_QNAME, FLOW_NAMESPACE_URI);
				}
			}
		}

		return configDoc;
	}

	public static String repairFlowNamespace(String configurationXml) {
		if (configurationXml == null
				|| configurationXml.contains(FLOW_NAMESPACE_QNAME)
				|| !configurationXml.contains("flow:")) {
			return configurationXml;
		}

		return addFlowNamespaceDeclaration(configurationXml);
	}

	/**
	 * Adds the {@code xmlns:flow} declaration to the first supported root element (see {@link #ROOT_ELEMENTS}).
	 * Callers are responsible for first checking that the declaration is actually missing.
	 */
	public static String addFlowNamespaceDeclaration(String configurationXml) {
		return ROOT_ELEMENT_PATTERN.matcher(configurationXml).replaceFirst(FLOW_NAMESPACE_REPLACEMENT);
	}

	/**
	 * Converts a DOM Node to a formatted XML string.
	 * @throws TransformerException if an error occurs during transformation
	 */
	public static String convertNodeToString(Node node) throws TransformerException {
		Transformer transformer =
				XmlSecurityUtils.createSecureTransformerFactory().newTransformer();

		transformer.setOutputProperty(OutputKeys.INDENT, "yes");
		transformer.setOutputProperty("{http://xml.apache.org/xslt}indent-amount", "2");
		transformer.setOutputProperty(OutputKeys.METHOD, "xml");
		transformer.setOutputProperty(OutputKeys.OMIT_XML_DECLARATION, "yes");
		transformer.setOutputProperty("{http://xml.apache.org/xalan}line-separator", "\n");

		StringWriter writer = new StringWriter();
		transformer.transform(new DOMSource(node), new StreamResult(writer));

		// Remove empty lines
		return writer.toString().replaceAll("(?m)^[ \t]*\r?\n", "");
	}
}
