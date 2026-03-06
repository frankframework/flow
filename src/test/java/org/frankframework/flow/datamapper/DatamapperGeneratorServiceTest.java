package org.frankframework.flow.datamapper;

import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;

import java.io.File;
import java.io.IOException;
import java.io.StringReader;
import java.io.StringWriter;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Comparator;
import javax.xml.parsers.DocumentBuilder;
import javax.xml.parsers.DocumentBuilderFactory;
import javax.xml.transform.OutputKeys;
import javax.xml.transform.Transformer;
import javax.xml.transform.TransformerFactory;
import javax.xml.transform.dom.DOMSource;
import javax.xml.transform.stream.StreamResult;
import javax.xml.transform.stream.StreamSource;
import net.sf.saxon.s9api.*;
import org.frankframework.flow.filesystem.FileSystemStorage;
import org.frankframework.flow.filetree.FileTreeService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.w3c.dom.Document;

@ExtendWith(MockitoExtension.class)
public class DatamapperGeneratorServiceTest {
    @Mock
    private FileSystemStorage fileSystemStorage;
    @Mock
    private FileTreeService fileTreeService;

    private DatamapperGeneratorService service;
    private Processor processor;
    private XsltCompiler compiler;

    private Path tempProjectRoot;

    private void stubToAbsolutePath() throws IOException {
        when(fileSystemStorage.toAbsolutePath(anyString())).thenAnswer(invocation -> {
            String path = invocation.getArgument(0);
            return Paths.get(path);
        });
    }

    @BeforeEach
    void setUp() throws IOException {
        stubToAbsolutePath();
        tempProjectRoot = Files.createTempDirectory("flow_unit_test");

        service = new DatamapperGeneratorService(fileSystemStorage,fileTreeService);
        processor = new Processor(false);
        compiler = processor.newXsltCompiler();
    }

    @AfterEach
    public void tearDown() throws IOException {
        if (tempProjectRoot != null && Files.exists(tempProjectRoot)) {
            try (var stream = Files.walk(tempProjectRoot)) {
                stream.sorted(Comparator.reverseOrder()).forEach(p -> {
                    try {
                        Files.delete(p);
                    } catch (IOException ignored) {
                    }
                });
            }
        }
    }

    @Test
    public void generateMapping() throws SaxonApiException, IOException {
        service.generate(
                "src/test/resources/datamapper/inputJsonToXml.json", tempProjectRoot.toAbsolutePath() + "/output.xslt");
    }

    @Test
    public void testXMLtoXMLGeneratedMapping() throws Exception {
        service.generate(
                "src/test/resources/datamapper/inputXmlToXml.json", tempProjectRoot.toAbsolutePath() + "/output.xslt");

        XsltExecutable executable =
                compiler.compile(new StreamSource(new File(tempProjectRoot.toAbsolutePath() + "/output.xslt")));
        XsltTransformer transformer = executable.load();

        transformer.setSource(new StreamSource(new File("src/test/resources/datamapper/inputData.xml")));

        StringWriter writer = new StringWriter();
        Serializer out = processor.newSerializer(writer);
        transformer.setDestination(out);

        transformer.transform();

        Document expectedResult = parse("src/test/resources/datamapper/outputData.xml");
        Assertions.assertEquals(
                toString(expectedResult).trim(), writer.toString().trim());
    }

    @Test
    public void testXMLtoJSONGeneratedMapping() throws Exception {
        service.generate(
                "src/test/resources/datamapper/inputXmlToJson.json", tempProjectRoot.toAbsolutePath() + "/output.xslt");

        XsltExecutable executable =
                compiler.compile(new StreamSource(new File(tempProjectRoot.toAbsolutePath() + "/output.xslt")));
        Xslt30Transformer transformer = executable.load30();

        StreamSource xmlSource = new StreamSource(new File("src/test/resources/datamapper/inputData.xml"));
        StringWriter writer = new StringWriter();
        Serializer out = processor.newSerializer(writer);

        transformer.transform(xmlSource, out);

        Path path = Paths.get("src/test/resources/datamapper/outputData.json");
        String expectedResult = Files.readString(path);

        Assertions.assertEquals(expectedResult.trim(), writer.toString().trim());
    }

    @Test
    public void testJSONtoXMLGeneratedMapping() throws Exception {
        service.generate(
                "src/test/resources/datamapper/inputJsonToXml.json", tempProjectRoot.toAbsolutePath() + "/output.xslt");

        XsltExecutable executable =
                compiler.compile(new StreamSource(new File(tempProjectRoot.toAbsolutePath() + "/output.xslt")));
        Xslt30Transformer transformer = executable.load30();

        StringWriter writer = new StringWriter();
        Serializer out = processor.newSerializer(writer);

        Path absolutePath = Paths.get("").toAbsolutePath().resolve("src/test/resources/datamapper/inputData.json");
        StreamSource paramsSource = new StreamSource(
                new StringReader("<params><jsonPath>" + absolutePath.toUri() + "</jsonPath></params>"));

        transformer.transform(paramsSource, out);

        Document expectedResult = parse("src/test/resources/datamapper/outputData.xml");
        Assertions.assertEquals(
                toString(expectedResult).trim(), writer.toString().trim());
    }

    @Test
    public void testJSONtoJSONGeneratedMapping() throws Exception {
        service.generate(
                "src/test/resources/datamapper/inputJsonToJson.json",
                tempProjectRoot.toAbsolutePath() + "/output.xslt");

        XsltExecutable executable =
                compiler.compile(new StreamSource(new File(tempProjectRoot.toAbsolutePath() + "/output.xslt")));
        Xslt30Transformer transformer = executable.load30();

        StringWriter writer = new StringWriter();
        Serializer out = processor.newSerializer(writer);

        Path absolutePath = Paths.get("").toAbsolutePath().resolve("src/test/resources/datamapper/inputData.json");
        StreamSource paramsSource = new StreamSource(
                new StringReader("<params><jsonPath>" + absolutePath.toUri() + "</jsonPath></params>"));

        transformer.transform(paramsSource, out);

        Path path = Paths.get("src/test/resources/datamapper/outputData.json");
        String expectedResult = Files.readString(path);

        Assertions.assertEquals(expectedResult.trim(), writer.toString().trim());
    }

    private Document parse(String path) throws Exception {
        DocumentBuilderFactory factory = DocumentBuilderFactory.newInstance();
        factory.setIgnoringElementContentWhitespace(true);
        factory.setNamespaceAware(true);

        DocumentBuilder builder = factory.newDocumentBuilder();
        Document document = builder.parse(new File(path));
        document.normalizeDocument();
        return document;
    }

    private String toString(Document doc) throws Exception {
        TransformerFactory tf = TransformerFactory.newInstance();
        Transformer transformer = tf.newTransformer();
        transformer.setOutputProperty(OutputKeys.OMIT_XML_DECLARATION, "false");
        transformer.setOutputProperty(OutputKeys.INDENT, "yes");

        StringWriter writer = new StringWriter();
        transformer.transform(new DOMSource(doc), new StreamResult(writer));

        return writer.toString().trim();
    }
}
