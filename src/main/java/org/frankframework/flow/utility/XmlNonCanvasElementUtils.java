package org.frankframework.flow.utility;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import lombok.experimental.UtilityClass;
import org.w3c.dom.Document;
import org.w3c.dom.Element;
import org.w3c.dom.NamedNodeMap;
import org.w3c.dom.Node;
import org.w3c.dom.NodeList;

@UtilityClass
public class XmlNonCanvasElementUtils {

	private static final String ADAPTER_TAG_NAME = "adapter";
	private static final String NAMESPACE_SEPARATOR = ":";
	private static final String NAMESPACE_DECLARATION_PREFIX = "xmlns";

	public static List<Element> getNonCanvasElements(Document configurationDocument) {
		List<Element> nonCanvasElements = new ArrayList<>();
		Element rootElement = configurationDocument.getDocumentElement();

		if (rootElement == null) {
			return nonCanvasElements;
		}

		NodeList childNodes = rootElement.getChildNodes();
		for (int childPosition = 0; childPosition < childNodes.getLength(); childPosition++) {
			Node childNode = childNodes.item(childPosition);

			if (childNode.getNodeType() != Node.ELEMENT_NODE) {
				continue;
			}

			Element childElement = (Element) childNode;
			if (isExcludedElement(childElement)) {
				continue;
			}

			nonCanvasElements.add(childElement);
		}

		return nonCanvasElements;
	}

	public static Element findNonCanvasElement(Document configurationDocument, String tagName, int occurrenceIndex) {
		int matchedOccurrences = 0;

		for (Element element : getNonCanvasElements(configurationDocument)) {
			if (!element.getTagName().equals(tagName)) {
				continue;
			}

			if (matchedOccurrences == occurrenceIndex) {
				return element;
			}

			matchedOccurrences++;
		}

		return null;
	}

	public static void addNonCanvasElement(Document configurationDocument, String tagName, Map<String, String> attributes) {
		Element element = configurationDocument.createElement(tagName);
		applyAttributes(element, attributes);
		configurationDocument.getDocumentElement().appendChild(element);
	}

	public static boolean updateNonCanvasElement(Document configurationDocument, String tagName, int occurrenceIndex, Map<String, String> attributes) {
		Element element = findNonCanvasElement(configurationDocument, tagName, occurrenceIndex);

		if (element == null) {
			return false;
		}

		removeRegularAttributes(element);
		applyAttributes(element, attributes);
		return true;
	}

	public static boolean removeNonCanvasElement(Document configurationDocument, String tagName, int occurrenceIndex) {
		Element element = findNonCanvasElement(configurationDocument, tagName, occurrenceIndex);

		if (element == null) {
			return false;
		}

		element.getParentNode().removeChild(element);
		return true;
	}

	public static Map<String, String> getAttributes(Element element) {
		Map<String, String> attributes = new LinkedHashMap<>();
		NamedNodeMap attributeNodes = element.getAttributes();

		for (int attributePosition = 0; attributePosition < attributeNodes.getLength(); attributePosition++) {
			Node attributeNode = attributeNodes.item(attributePosition);
			String attributeName = attributeNode.getNodeName();

			if (isNamespaceDeclaration(attributeName)) {
				continue;
			}

			attributes.put(attributeName, attributeNode.getNodeValue());
		}

		return attributes;
	}

	private static boolean isExcludedElement(Element element) {
		String tagName = element.getTagName();

		if (tagName.contains(NAMESPACE_SEPARATOR)) {
			return true;
		}

		return tagName.equalsIgnoreCase(ADAPTER_TAG_NAME);
	}

	private static boolean isNamespaceDeclaration(String attributeName) {
		return attributeName.equals(NAMESPACE_DECLARATION_PREFIX) || attributeName.startsWith(NAMESPACE_DECLARATION_PREFIX + NAMESPACE_SEPARATOR);
	}

	private static void applyAttributes(Element element, Map<String, String> attributes) {
		if (attributes == null) {
			return;
		}

		for (Map.Entry<String, String> attribute : attributes.entrySet()) {
			String value = attribute.getValue();

			if (value == null || value.isBlank()) {
				continue;
			}

			element.setAttribute(attribute.getKey(), value);
		}
	}

	private static void removeRegularAttributes(Element element) {
		NamedNodeMap attributeNodes = element.getAttributes();
		List<String> removableAttributeNames = new ArrayList<>();

		for (int attributePosition = 0; attributePosition < attributeNodes.getLength(); attributePosition++) {
			String attributeName = attributeNodes.item(attributePosition).getNodeName();

			if (isNamespaceDeclaration(attributeName)) {
				continue;
			}

			removableAttributeNames.add(attributeName);
		}

		for (String attributeName : removableAttributeNames) {
			element.removeAttribute(attributeName);
		}
	}
}
