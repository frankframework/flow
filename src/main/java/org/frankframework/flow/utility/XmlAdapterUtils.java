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

    /**
     * Finds and returns an Adapter element (matched by name attribute)
     * inside the given configuration document.
     *
     * @return the Adapter node if found, otherwise null
     */
    public static Node findAdapterInDocument(Document configDoc, String adapterName) {
        NodeList adapters = configDoc.getElementsByTagName("Adapter");

        // If no uppercase matches found, try lowercase
        if (adapters.getLength() == 0) {
            adapters = configDoc.getElementsByTagName("adapter");
        }

        for (int i = 0; i < adapters.getLength(); i++) {
            Element adapter = (Element) adapters.item(i);

            if (adapterName.equals(adapter.getAttribute("name"))) {
                return adapter;
            }
        }

        return null;
    }

    /**
     * Adds a new Adapter element to the given configuration document.
     * The adapter XML is parsed and imported into the document, then appended to the root element.
     */
    public static void addAdapterToDocument(Document configDoc, String adapterXml) throws Exception {
        Document adapterDoc = XmlSecurityUtils.createSecureDocumentBuilder()
                .parse(new ByteArrayInputStream(adapterXml.getBytes(StandardCharsets.UTF_8)));
        Node importedNode = configDoc.importNode(adapterDoc.getDocumentElement(), true);
        configDoc.getDocumentElement().appendChild(importedNode);
    }

    /**
     * Renames an Adapter element (matched by old name) in the given configuration document.
     *
     * @return true if the adapter was found and renamed, false otherwise
     */
    public static boolean renameAdapterInDocument(Document configDoc, String oldName, String newName) {
        Node adapterNode = findAdapterInDocument(configDoc, oldName);
        if (adapterNode == null) return false;

        ((Element) adapterNode).setAttribute("name", newName);
        return true;
    }

    /**
     * Removes an Adapter element (matched by name) from the given configuration document.
     *
     * @return true if the adapter was found and removed, false otherwise
     */
    public static boolean removeAdapterFromDocument(Document configDoc, String adapterName) {
        Node adapterNode = findAdapterInDocument(configDoc, adapterName);
        if (adapterNode == null) return false;

        adapterNode.getParentNode().removeChild(adapterNode);
        return true;
    }

    /**
     * Normalizes Frank elements:
     * - If element name is lowercase and has className attribute:
     * follow case specific rules to determine new tag name based on className and
     * element type
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

            boolean startsWithLowercase = !originalTag.isEmpty() && Character.isLowerCase(originalTag.charAt(0));

            String newTagName = null;

            if (startsWithLowercase && className != null && !className.isEmpty()) {

                String[] parts = className.split("\\.");
                String baseName = parts[parts.length - 1].trim();

                newTagName = transformByTag(originalTag, baseName);

                element.removeAttribute("className");

            } else if (startsWithLowercase) {

                newTagName = capitalize(originalTag);
            }

            if (newTagName != null && !newTagName.equals(originalTag)) {
                renameElement(configDoc, element, newTagName);
            }
        }

        return convertNodeToString(configDoc);
    }

    /* Method to help transform element tags */
    private static String transformByTag(String tagName, String baseName) {

        switch (tagName) {
            case "pipe":
                return baseName;

            case "messageLog":
                return transformMessageLog(baseName);

            case "inputWrapper":
            case "outputWrapper":
                return transformWrapper(tagName, baseName);

            case "inputValidator":
            case "outputValidator":
                return transformValidator(tagName, baseName);

            default:
                return baseName;
        }
    }

    private static String transformMessageLog(String baseName) {

        String suffix = "TransactionalStorage";

        if (baseName.endsWith(suffix)) {
            String prefix = baseName.substring(0, baseName.length() - suffix.length());
            return prefix + "MessageLog";
        }

        return baseName + "MessageLog";
    }

    private static String transformWrapper(String tagName, String baseName) {

        String direction = tagName.startsWith("input") ? "Input" : "Output";

        String result = baseName;

        String pipeSuffix = "Pipe";
        if (result.endsWith(pipeSuffix)) {
            result = result.substring(0, result.length() - pipeSuffix.length());
        }

        String wrapperSuffix = "Wrapper";
        if (result.endsWith(wrapperSuffix)) {
            result = result.substring(0, result.length() - wrapperSuffix.length());
        }

        return result + direction + wrapperSuffix;
    }

    private static String transformValidator(String tagName, String baseName) {

        String direction = tagName.startsWith("input") ? "Input" : "Output";

        String result = baseName;
        String validatorSuffix = "Validator";

        if (result.endsWith(validatorSuffix)) {
            result = result.substring(0, result.length() - validatorSuffix.length());
        }

        return result + direction + validatorSuffix;
    }

    private static String capitalize(String value) {
        if (value == null || value.isEmpty()) return value;
        return value.substring(0, 1).toUpperCase() + value.substring(1);
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
