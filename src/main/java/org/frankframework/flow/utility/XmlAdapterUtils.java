package org.frankframework.flow.utility;

import lombok.experimental.UtilityClass;
import org.w3c.dom.*;

import javax.xml.transform.*;
import javax.xml.transform.dom.DOMSource;
import javax.xml.transform.stream.StreamResult;
import java.io.StringWriter;

@UtilityClass
public class XmlAdapterUtils {

    /**
     * Replaces an Adapter element (matched by name attribute) inside the given configuration document.
     */
    public static boolean replaceAdapterInDocument(
            Document configDoc,
            String adapterName,
            Node newAdapterNode
    ) {
        NodeList adapters = configDoc.getElementsByTagName("Adapter");

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
}
