package org.frankframework.flow.utility;

import java.io.ByteArrayInputStream;
import java.io.StringWriter;
import java.nio.charset.StandardCharsets;
import javax.xml.transform.*;
import javax.xml.transform.dom.DOMSource;
import javax.xml.transform.stream.StreamResult;
import lombok.experimental.UtilityClass;
import org.w3c.dom.*;

@UtilityClass
public class XmlAdapterUtils {

    /**
     * Replaces an Adapter element (matched by name attribute) inside the given
     * configuration document.
     */
    public static boolean replaceAdapterInDocument(Document configDoc, String adapterName, Node newAdapterNode) {
        NodeList adapters = configDoc.getElementsByTagName("Adapter");

        // If no uppercase matches found, try lowercase
        if (adapters.getLength() == 0) {
            adapters = configDoc.getElementsByTagName("adapter");
        }

        for (int i = 0; i < adapters.getLength(); i++) {
            Element adapter = (Element) adapters.item(i);

            if (adapterName.equals(adapter.getAttribute("name"))) {
                Node importedNode = configDoc.importNode(newAdapterNode, true);
                adapter.getParentNode().replaceChild(importedNode, adapter);
                return true;
            }
        }

        return false;
    }

    /**
     * Converts a DOM Document to a formatted XML string.
     */
    public static String convertDocumentToString(Document doc) throws Exception {
        Transformer transformer =
                XmlSecurityUtils.createSecureTransformerFactory().newTransformer();

        transformer.setOutputProperty(OutputKeys.INDENT, "yes");
        transformer.setOutputProperty("{http://xml.apache.org/xslt}indent-amount", "2");
        transformer.setOutputProperty(OutputKeys.METHOD, "xml");
        transformer.setOutputProperty(OutputKeys.OMIT_XML_DECLARATION, "yes");
        transformer.setOutputProperty("{http://xml.apache.org/xalan}line-separator", "\n");

        StringWriter writer = new StringWriter();
        transformer.transform(new DOMSource(doc), new StreamResult(writer));

        // Remove empty lines
        return writer.toString().replaceAll("(?m)^[ \t]*\r?\n", "");
    }

    /**
     * Normalizes Frank elements:
     * - If element name is lowercase and has className attribute:
     * rename to last segment of className and remove className attribute
     * - If element name is lowercase without className:
     * capitalize first letter
     */
    public static String normalizeFrankElements(String xmlContent) throws Exception {

        Document configDoc = XmlSecurityUtils.createSecureDocumentBuilder()
                .parse(new ByteArrayInputStream(xmlContent.getBytes(StandardCharsets.UTF_8)));
        NodeList nodeList = configDoc.getElementsByTagName("*");

        // Because NodeList is live, first copy elements into a list
        int length = nodeList.getLength();
        Element[] elements = new Element[length];

        for (int i = 0; i < length; i++) {
            elements[i] = (Element) nodeList.item(i);
        }

        for (Element element : elements) {

            String originalTag = element.getTagName();
            String className = element.getAttribute("className");

            boolean isLowerCase = originalTag.equals(originalTag.toLowerCase());

            String newTagName = null;

            if (isLowerCase && className != null && !className.isEmpty()) {
                // Use last part of className
                String[] parts = className.split("\\.");
                newTagName = parts[parts.length - 1].trim();
                element.removeAttribute("className");

            } else if (isLowerCase) {
                // Just capitalize first letter
                newTagName = originalTag.substring(0, 1).toUpperCase() + originalTag.substring(1);
            }

            if (newTagName != null && !newTagName.equals(originalTag)) {
                renameElement(configDoc, element, newTagName);
            }
        }

        return convertDocumentToString(configDoc);
    }

    /* Helper method to rename an element in a DOM document */
    private static void renameElement(Document doc, Element element, String newTagName) {

        Element newElement = doc.createElement(newTagName);

        // Copy attributes
        NamedNodeMap attributes = element.getAttributes();
        for (int i = 0; i < attributes.getLength(); i++) {
            Attr attr = (Attr) attributes.item(i);
            newElement.setAttribute(attr.getName(), attr.getValue());
        }

        // Move children
        while (element.getFirstChild() != null) {
            newElement.appendChild(element.getFirstChild());
        }

        // Replace in parent
        Node parent = element.getParentNode();
        parent.replaceChild(newElement, element);
    }
}
