package org.frankframework.flow.utility;

import java.io.IOException;
import java.io.StringReader;

import javax.xml.parsers.DocumentBuilder;
import javax.xml.parsers.DocumentBuilderFactory;
import javax.xml.parsers.ParserConfigurationException;

import org.frankframework.flow.project.InvalidXmlContentException;
import org.xml.sax.InputSource;
import org.xml.sax.SAXException;

public class XmlValidator {

    private XmlValidator(){}

    public static String validateXml(String xmlContent) {
        if (xmlContent == null || xmlContent.isBlank()) {
            return "XML content is empty.";
        }

        try {
            DocumentBuilderFactory factory = DocumentBuilderFactory.newInstance();
            factory.setNamespaceAware(true);
            factory.setFeature("http://apache.org/xml/features/disallow-doctype-decl", true);
            factory.setFeature("http://xml.org/sax/features/external-general-entities", false);
            factory.setFeature("http://xml.org/sax/features/external-parameter-entities", false);
            factory.setFeature("http://apache.org/xml/features/nonvalidating/load-external-dtd", false);
            factory.setXIncludeAware(false);
            factory.setExpandEntityReferences(false);

            DocumentBuilder builder = factory.newDocumentBuilder();
            builder.parse(new InputSource(new StringReader(xmlContent)));
            return null; // valid
        } catch (ParserConfigurationException | SAXException | IOException e) {
            throw new InvalidXmlContentException(e.getMessage());
        }
    }
}
