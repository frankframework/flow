package org.frankframework.flow.utility;

import java.io.IOException;
import java.io.StringReader;
import java.io.StringWriter;
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

		NodeList configurationNodes = configDoc.getElementsByTagName("Configuration");

		for (int i = 0; i < configurationNodes.getLength(); i++) {
			Element configuration = (Element) configurationNodes.item(i);

			if (!configuration.hasAttribute("xmlns:flow")) {
				configuration.setAttributeNS(XMLConstants.XMLNS_ATTRIBUTE_NS_URI, "xmlns:flow", "urn:frank-flow");
			}
		}

		return configDoc;
	}

	/**
	 * Converts a DOM Node to a formatted XML string.
	 * @throws TransformerException
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
