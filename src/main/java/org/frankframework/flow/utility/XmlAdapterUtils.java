package org.frankframework.flow.utility;

import java.io.ByteArrayInputStream;
import java.nio.charset.StandardCharsets;
import lombok.experimental.UtilityClass;
import org.w3c.dom.*;

@UtilityClass
public class XmlAdapterUtils {

	/**
	 * Finds and returns an Adapter element (matched by name attribute)
	 * inside the given configuration document.
	 *
	 * @return the Adapter node if found, otherwise null
	 */
	public static Node findAdapterInDocument(Document configDoc, String adapterName) {
		NodeList adapters = configDoc.getElementsByTagName("Adapter");

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
	 * Replaces an Adapter element (matched by name attribute) inside the given
	 * configuration document.
	 */
	public static boolean replaceAdapterInDocument(Document configDoc, String adapterName, Node newAdapterNode) {
		NodeList adapters = configDoc.getElementsByTagName("Adapter");

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
}
