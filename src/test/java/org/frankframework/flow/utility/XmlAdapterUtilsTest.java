package org.frankframework.flow.utility;

import static org.junit.jupiter.api.Assertions.assertEquals;

import javax.xml.parsers.DocumentBuilderFactory;
import org.junit.jupiter.api.Test;
import org.w3c.dom.Document;
import org.w3c.dom.Element;

class XmlAdapterUtilsTest {

    private Document parseXml(String xml) throws Exception {
        return DocumentBuilderFactory.newInstance()
                .newDocumentBuilder()
                .parse(new java.io.ByteArrayInputStream(xml.getBytes()));
    }

    @Test
    void normalizeFrankElementsShouldCapitalizeLowercaseTag() throws Exception {
        String xml = "<adapter></adapter>";
        String result = XmlAdapterUtils.normalizeFrankElements(xml);

        Document doc = parseXml(result);
        Element root = doc.getDocumentElement();
        assertEquals("Adapter", root.getTagName());
    }

    @Test
    void normalizeFrankElementsShouldRenameTagUsingClassName() throws Exception {
        String xml = "<adapter className=\"org.example.MyAdapter\"></adapter>";
        String result = XmlAdapterUtils.normalizeFrankElements(xml);

        Document doc = parseXml(result);
        Element root = doc.getDocumentElement();
        assertEquals("MyAdapter", root.getTagName());
    }

    @Test
    void normalizeFrankElementsShouldPreserveAttributes() throws Exception {
        String xml = "<adapter id=\"1\" className=\"org.example.MyAdapter\" enabled=\"true\"></adapter>";
        String result = XmlAdapterUtils.normalizeFrankElements(xml);

        Document doc = parseXml(result);
        Element root = doc.getDocumentElement();
        assertEquals("MyAdapter", root.getTagName());
        assertEquals("1", root.getAttribute("id"));
        assertEquals("true", root.getAttribute("enabled"));
    }

    @Test
    void normalizeFrankElementsShouldPreserveChildElements() throws Exception {
        String xml = "<adapter><child/></adapter>";
        String result = XmlAdapterUtils.normalizeFrankElements(xml);

        Document doc = parseXml(result);
        Element root = doc.getDocumentElement();
        assertEquals("Adapter", root.getTagName());
        assertEquals(1, root.getElementsByTagName("Child").getLength());
    }

    @Test
    void normalizeFrankElementsShouldHandleMultipleElements() throws Exception {
        String xml = "<root><adapter className=\"org.example.A\"></adapter><adapter></adapter></root>";
        String result = XmlAdapterUtils.normalizeFrankElements(xml);

        Document doc = parseXml(result);
        Element root = doc.getDocumentElement();
        assertEquals("Root", root.getTagName());
        assertEquals(1, root.getElementsByTagName("A").getLength());
        assertEquals(1, root.getElementsByTagName("Adapter").getLength());
    }

    @Test
    void normalizeFrankElementsShouldTransformMessageLog() throws Exception {
        String xml =
                "<messageLog className=\"org.frankframework.jdbc.JdbcTransactionalStorage\" slotId=\"ApiListenerDuplicateCheck\" />";
        String result = XmlAdapterUtils.normalizeFrankElements(xml);

        Document doc = parseXml(result);
        Element root = doc.getDocumentElement();

        assertEquals("JdbcMessageLog", root.getTagName());
        assertEquals("ApiListenerDuplicateCheck", root.getAttribute("slotId"));
    }

    @Test
    void normalizeFrankElementsShouldTransformInputValidator() throws Exception {
        String xml = "<inputValidator className=\"org.frankframework.extensions.api.ApiWsdlXmlValidator\" />";
        String result = XmlAdapterUtils.normalizeFrankElements(xml);

        Document doc = parseXml(result);
        Element root = doc.getDocumentElement();

        assertEquals("ApiWsdlXmlInputValidator", root.getTagName());
    }

    @Test
    void normalizeFrankElementsShouldTransformOutputValidator() throws Exception {
        String xml = "<outputValidator className=\"org.frankframework.extensions.api.ApiWsdlXmlValidator\" />";
        String result = XmlAdapterUtils.normalizeFrankElements(xml);

        Document doc = parseXml(result);
        Element root = doc.getDocumentElement();

        assertEquals("ApiWsdlXmlOutputValidator", root.getTagName());
    }

    @Test
    void normalizeFrankElementsShouldTransformInputWrapper() throws Exception {
        String xml = "<inputWrapper className=\"org.frankframework.extensions.api.ApiSoapWrapperPipe\" />";
        String result = XmlAdapterUtils.normalizeFrankElements(xml);

        Document doc = parseXml(result);
        Element root = doc.getDocumentElement();

        assertEquals("ApiSoapInputWrapper", root.getTagName());
    }

    @Test
    void normalizeFrankElementsShouldTransformOutputWrapper() throws Exception {
        String xml = "<outputWrapper className=\"org.frankframework.extensions.api.ApiSoapWrapperPipe\" />";
        String result = XmlAdapterUtils.normalizeFrankElements(xml);

        Document doc = parseXml(result);
        Element root = doc.getDocumentElement();

        assertEquals("ApiSoapOutputWrapper", root.getTagName());
    }
}
