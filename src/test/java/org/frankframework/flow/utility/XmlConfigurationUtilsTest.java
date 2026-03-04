package org.frankframework.flow.utility;

import static org.junit.Assert.assertNull;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;

import javax.xml.parsers.DocumentBuilderFactory;
import org.junit.jupiter.api.Test;
import org.w3c.dom.Document;
import org.w3c.dom.Element;
import org.w3c.dom.Node;

class XmlConfigurationUtilsTest {

    private Document parseXml(String xml) throws Exception {
        return DocumentBuilderFactory.newInstance()
                .newDocumentBuilder()
                .parse(new java.io.ByteArrayInputStream(xml.getBytes()));
    }

    @Test
    void normalizeFrankElementsShouldCapitalizeLowercaseTag() throws Exception {
        String xml = "<adapter></adapter>";
        String result = XmlConfigurationUtils.normalizeFrankElements(xml);

        Document doc = parseXml(result);
        Element root = doc.getDocumentElement();
        assertEquals("Adapter", root.getTagName());
    }

    @Test
    void normalizeFrankElementsShouldRenameTagUsingClassName() throws Exception {
        String xml = "<adapter className=\"org.example.MyAdapter\"></adapter>";
        String result = XmlConfigurationUtils.normalizeFrankElements(xml);

        Document doc = parseXml(result);
        Element root = doc.getDocumentElement();
        assertEquals("MyAdapter", root.getTagName());
    }

    @Test
    void normalizeFrankElementsShouldPreserveAttributes() throws Exception {
        String xml = "<adapter id=\"1\" className=\"org.example.MyAdapter\" enabled=\"true\"></adapter>";
        String result = XmlConfigurationUtils.normalizeFrankElements(xml);

        Document doc = parseXml(result);
        Element root = doc.getDocumentElement();
        assertEquals("MyAdapter", root.getTagName());
        assertEquals("1", root.getAttribute("id"));
        assertEquals("true", root.getAttribute("enabled"));
    }

    @Test
    void normalizeFrankElementsShouldPreserveChildElements() throws Exception {
        String xml = "<adapter><child/></adapter>";
        String result = XmlConfigurationUtils.normalizeFrankElements(xml);

        Document doc = parseXml(result);
        Element root = doc.getDocumentElement();
        assertEquals("Adapter", root.getTagName());
        assertEquals(1, root.getElementsByTagName("Child").getLength());
    }

    @Test
    void normalizeFrankElementsShouldHandleMultipleElements() throws Exception {
        String xml = "<root><adapter className=\"org.example.A\"></adapter><adapter></adapter></root>";
        String result = XmlConfigurationUtils.normalizeFrankElements(xml);

        Document doc = parseXml(result);
        Element root = doc.getDocumentElement();
        assertEquals("Root", root.getTagName());
        assertEquals(1, root.getElementsByTagName("A").getLength());
        assertEquals(1, root.getElementsByTagName("Adapter").getLength());
    }

    @Test
    void normalizeFrankElementsShouldTransformMessageLog() throws Exception {
        String xml = "<messageLog className=\"org.frankframework.jdbc.JdbcTransactionalStorage\" slotId=\"ApiListenerDuplicateCheck\" />";
        String result = XmlConfigurationUtils.normalizeFrankElements(xml);

        Document doc = parseXml(result);
        Element root = doc.getDocumentElement();

        assertEquals("JdbcMessageLog", root.getTagName());
        assertEquals("ApiListenerDuplicateCheck", root.getAttribute("slotId"));
    }

    @Test
    void normalizeFrankElementsShouldTransformInputValidator() throws Exception {
        String xml = "<inputValidator className=\"org.frankframework.extensions.api.ApiWsdlXmlValidator\" />";
        String result = XmlConfigurationUtils.normalizeFrankElements(xml);

        Document doc = parseXml(result);
        Element root = doc.getDocumentElement();

        assertEquals("ApiWsdlXmlInputValidator", root.getTagName());
    }

    @Test
    void normalizeFrankElementsShouldTransformOutputValidator() throws Exception {
        String xml = "<outputValidator className=\"org.frankframework.extensions.api.ApiWsdlXmlValidator\" />";
        String result = XmlConfigurationUtils.normalizeFrankElements(xml);

        Document doc = parseXml(result);
        Element root = doc.getDocumentElement();

        assertEquals("ApiWsdlXmlOutputValidator", root.getTagName());
    }

    @Test
    void normalizeFrankElementsShouldTransformInputWrapper() throws Exception {
        String xml = "<inputWrapper className=\"org.frankframework.extensions.api.ApiSoapWrapperPipe\" />";
        String result = XmlConfigurationUtils.normalizeFrankElements(xml);

        Document doc = parseXml(result);
        Element root = doc.getDocumentElement();

        assertEquals("ApiSoapInputWrapper", root.getTagName());
    }

    @Test
    void normalizeFrankElementsShouldTransformOutputWrapper() throws Exception {
        String xml = "<outputWrapper className=\"org.frankframework.extensions.api.ApiSoapWrapperPipe\" />";
        String result = XmlConfigurationUtils.normalizeFrankElements(xml);

        Document doc = parseXml(result);
        Element root = doc.getDocumentElement();

        assertEquals("ApiSoapOutputWrapper", root.getTagName());
    }

    @Test
    void shouldFindAdapterByNameUppercaseTag() throws Exception {
        String xml = """
                <Adapters>
                    <Adapter name="TestAdapter"/>
                </Adapters>
                """;

        Document doc = parseXml(xml);
        Node node = XmlConfigurationUtils.findAdapterInDocument(doc, "TestAdapter");

        assertNotNull(node);
        assertEquals("Adapter", node.getNodeName());
        assertEquals("TestAdapter", node.getAttributes().getNamedItem("name").getNodeValue());
    }

    @Test
    void shouldFindAdapterByNameLowercaseTag() throws Exception {
        String xml = """
                <adapters>
                    <adapter name="lowerAdapter"/>
                </adapters>
                """;

        Document doc = parseXml(xml);
        Node node = XmlConfigurationUtils.findAdapterInDocument(doc, "lowerAdapter");

        assertNotNull(node);
        assertEquals("adapter", node.getNodeName()); // original tag name is lowercase
        assertEquals("lowerAdapter", node.getAttributes().getNamedItem("name").getNodeValue());
    }

    @Test
    void shouldReturnNullIfAdapterNotFound() throws Exception {
        String xml = "<Adapters><Adapter name=\"OtherAdapter\"/></Adapters>";

        Document doc = parseXml(xml);
        Node node = XmlConfigurationUtils.findAdapterInDocument(doc, "MissingAdapter");

        assertNull(node);
    }

    @Test
    void shouldReturnFirstMatchingAdapterIfMultiple() throws Exception {
        String xml = """
                <Adapters>
                    <Adapter name="A"/>
                    <Adapter name="B"/>
                    <Adapter name="A"/>
                </Adapters>
                """;

        Document doc = parseXml(xml);
        Node node = XmlConfigurationUtils.findAdapterInDocument(doc, "A");

        assertNotNull(node);
        assertEquals("A", node.getAttributes().getNamedItem("name").getNodeValue());
        // ensures first matching node is returned
        assertEquals("Adapter", node.getNodeName());
    }

    @Test
    void shouldHandleEmptyDocument() throws Exception {
        String xml = "<root></root>";

        Document doc = parseXml(xml);
        Node node = XmlConfigurationUtils.findAdapterInDocument(doc, "AnyAdapter");

        assertNull(node);
    }

    @Test
    void addsFlowNamespaceWhenMissing() throws Exception {
        String xml = """
                <Configuration name="TestConfig">
                    <Adapter name="A"/>
                </Configuration>
                """;

        Document updated = XmlConfigurationUtils.insertFlowNamespace(xml);

        Element configuration = updated.getDocumentElement();
        String namespace = configuration.getAttribute("xmlns:flow");

        assertEquals("urn:frank-flow", namespace);
    }

    @Test
    void doesNotDuplicateFlowNamespaceWhenAlreadyPresent() throws Exception {
        String xml = """
                <Configuration name="TestConfig" xmlns:flow="urn:frank-flow">
                    <Adapter name="A"/>
                </Configuration>
                """;

        Document updated = XmlConfigurationUtils.insertFlowNamespace(xml);

        Element configuration = updated.getDocumentElement();

        assertEquals("urn:frank-flow", configuration.getAttribute("xmlns:flow"));

        // Ensure only one xmlns:flow attribute exists
        long count = 0;
        var attributes = configuration.getAttributes();
        for (int i = 0; i < attributes.getLength(); i++) {
            if ("xmlns:flow".equals(attributes.item(i).getNodeName())) {
                count++;
            }
        }

        assertEquals(1, count);
    }
}
