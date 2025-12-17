package org.frankframework.flow.utility;

import javax.xml.XMLConstants;
import javax.xml.parsers.DocumentBuilder;
import javax.xml.parsers.DocumentBuilderFactory;
import javax.xml.parsers.ParserConfigurationException;
import javax.xml.transform.TransformerFactory;
import lombok.experimental.UtilityClass;
import org.w3c.dom.Document;
import org.w3c.dom.Element;
import org.w3c.dom.Node;
import org.w3c.dom.NodeList;

/**
 * Utility class for creating secure XML parsers and transformers that prevent XXE vulnerabilities.
 */
@UtilityClass
public class XmlSecurityUtils {

    /**
     * Creates a secure DocumentBuilderFactory configured to prevent XXE attacks.
     *
     * @return A DocumentBuilderFactory with security features enabled
     * @throws ParserConfigurationException if security features cannot be set
     */
    public static DocumentBuilderFactory createSecureDocumentBuilderFactory() throws ParserConfigurationException {
        DocumentBuilderFactory factory = DocumentBuilderFactory.newInstance();
        factory.setNamespaceAware(true);
        factory.setIgnoringComments(true);

        // Prevent XXE vulnerabilities
        factory.setFeature(XMLConstants.FEATURE_SECURE_PROCESSING, true);
        factory.setFeature("http://apache.org/xml/features/disallow-doctype-decl", true);
        factory.setFeature("http://xml.org/sax/features/external-general-entities", false);
        factory.setFeature("http://xml.org/sax/features/external-parameter-entities", false);
        factory.setFeature("http://apache.org/xml/features/nonvalidating/load-external-dtd", false);
        factory.setXIncludeAware(false);
        factory.setExpandEntityReferences(false);

        return factory;
    }

    /**
     * Creates a secure DocumentBuilder configured to prevent XXE attacks.
     *
     * @return A DocumentBuilder with security features enabled
     * @throws ParserConfigurationException if the parser cannot be created
     */
    public static DocumentBuilder createSecureDocumentBuilder() throws ParserConfigurationException {
        return createSecureDocumentBuilderFactory().newDocumentBuilder();
    }

    /**
     * Creates a secure TransformerFactory configured to prevent XXE attacks.
     *
     * @return A TransformerFactory with security features enabled
     * @throws IllegalStateException if security features cannot be set
     */
    public static TransformerFactory createSecureTransformerFactory() {
        TransformerFactory factory = TransformerFactory.newInstance();
        try {
            factory.setFeature(XMLConstants.FEATURE_SECURE_PROCESSING, true);
            factory.setAttribute(XMLConstants.ACCESS_EXTERNAL_DTD, "");
            factory.setAttribute(XMLConstants.ACCESS_EXTERNAL_STYLESHEET, "");
        } catch (Exception e) {
            throw new IllegalStateException("Could not create secure TransformerFactory: " + e.getMessage());
        }
        return factory;
    }

    /**
     * Replaces an element in a document by tag name and attribute value.
     *
     * @param document The document to search in
     * @param tagName The tag name to search for (e.g., "Adapter")
     * @param attributeName The attribute name to match (e.g., "name")
     * @param attributeValue The attribute value to match
     * @param replacementNode The node to replace with
     * @return true if the element was found and replaced, false otherwise
     */
    public static boolean replaceElementByAttribute(
            Document document, String tagName, String attributeName, String attributeValue, Node replacementNode) {
        NodeList elements = document.getElementsByTagName(tagName);
        for (int i = 0; i < elements.getLength(); i++) {
            Element element = (Element) elements.item(i);
            if (attributeValue.equals(element.getAttribute(attributeName))) {
                element.getParentNode().replaceChild(replacementNode, element);
                return true;
            }
        }
        return false;
    }
}
