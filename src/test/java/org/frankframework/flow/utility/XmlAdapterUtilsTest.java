package org.frankframework.flow.utility;

import static org.junit.Assert.assertNull;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;

import javax.xml.parsers.DocumentBuilderFactory;
import org.junit.jupiter.api.Test;
import org.w3c.dom.Document;
import org.w3c.dom.Element;
import org.w3c.dom.Node;

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
    void shouldFindAdapterByNameUppercaseTag() throws Exception {
        String xml =
                """
                <Adapters>
                    <Adapter name="TestAdapter"/>
                </Adapters>
                """;

        Document doc = parseXml(xml);
        Node node = XmlAdapterUtils.findAdapterInDocument(doc, "TestAdapter");

        assertNotNull(node);
        assertEquals("Adapter", node.getNodeName());
        assertEquals("TestAdapter", node.getAttributes().getNamedItem("name").getNodeValue());
    }

    @Test
    void shouldFindAdapterByNameLowercaseTag() throws Exception {
        String xml =
                """
                <adapters>
                    <adapter name="lowerAdapter"/>
                </adapters>
                """;

        Document doc = parseXml(xml);
        Node node = XmlAdapterUtils.findAdapterInDocument(doc, "lowerAdapter");

        assertNotNull(node);
        assertEquals("adapter", node.getNodeName()); // original tag name is lowercase
        assertEquals("lowerAdapter", node.getAttributes().getNamedItem("name").getNodeValue());
    }

    @Test
    void shouldReturnNullIfAdapterNotFound() throws Exception {
        String xml = "<Adapters><Adapter name=\"OtherAdapter\"/></Adapters>";

        Document doc = parseXml(xml);
        Node node = XmlAdapterUtils.findAdapterInDocument(doc, "MissingAdapter");

        assertNull(node);
    }

    @Test
    void shouldReturnFirstMatchingAdapterIfMultiple() throws Exception {
        String xml =
                """
                <Adapters>
                    <Adapter name="A"/>
                    <Adapter name="B"/>
                    <Adapter name="A"/>
                </Adapters>
                """;

        Document doc = parseXml(xml);
        Node node = XmlAdapterUtils.findAdapterInDocument(doc, "A");

        assertNotNull(node);
        assertEquals("A", node.getAttributes().getNamedItem("name").getNodeValue());
        // ensures first matching node is returned
        assertEquals("Adapter", node.getNodeName());
    }

    @Test
    void shouldHandleEmptyDocument() throws Exception {
        String xml = "<root></root>";

        Document doc = parseXml(xml);
        Node node = XmlAdapterUtils.findAdapterInDocument(doc, "AnyAdapter");

        assertNull(node);
    }
}
