package org.frankframework.flow.datamapper;


import java.io.File;
import java.io.IOException;
import java.io.StringReader;
import java.io.StringWriter;
import java.nio.file.Path;
import java.nio.file.Paths;

import net.sf.saxon.s9api.*;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.w3c.dom.Document;

import javax.xml.parsers.DocumentBuilder;
import javax.xml.parsers.DocumentBuilderFactory;
import javax.xml.transform.OutputKeys;
import javax.xml.transform.Transformer;
import javax.xml.transform.TransformerFactory;
import javax.xml.transform.dom.DOMSource;
import javax.xml.transform.stream.StreamResult;
import javax.xml.transform.stream.StreamSource;

import static org.junit.Assert.assertEquals;


public class MappingGeneratorServiceTest {
    private MappingGeneratorService service;


    @BeforeEach
    void setUp() throws IOException {
        service = new MappingGeneratorService();
    }

    @AfterEach
    void tearDown() throws IOException {
    }

    @Test
    public void generateMapping() throws SaxonApiException {
        service.generate("src/test/resources/datamapper/inputJsonToXml.json");
    }

    @Test
    public void testXMLtoXMLGeneratedMapping() throws Exception {
        service.generate("src/test/resources/datamapper/inputXmlToXml.json");

        // 1. Create processor (false = no schema validation)
        Processor processor = new Processor(false);

        // 2. Compile XSLT
        XsltCompiler compiler = processor.newXsltCompiler();
        XsltExecutable executable = compiler.compile(
                new StreamSource(new File("output.xslt"))
        );

        // 3. Load transformer
        XsltTransformer transformer = executable.load();

        // 4. Provide XML input
        StreamSource xmlSource = new StreamSource(
                new File("src/test/resources/datamapper/inputData.xml")
        );
        transformer.setSource(xmlSource);

        // 5. Setup output file
        StringWriter writer = new StringWriter();
        Serializer out = processor.newSerializer(writer);
        out.setOutputProperty(Serializer.Property.METHOD, "xml");
        out.setOutputProperty(Serializer.Property.INDENT, "yes");

        transformer.setDestination(out);

        // 6. Run transformation
        transformer.transform();

        System.out.println("Transformation complete!");

        // 7. Parse expected AND actual results
        Document expectedResult = parse("src/test/resources/datamapper/outputData.xml");


        // 8. Compare documents
        Assertions.assertEquals(toString(expectedResult).trim(), writer.toString().trim());
    }
    @Test
    public void testJSONtoXMLGeneratedMapping() throws Exception {
        service.generate("src/test/resources/datamapper/inputJsonToXml.json");

        // 1. Create processor (false = no schema validation)
        Processor processor = new Processor(false);

        // 2. Compile XSLT
        XsltCompiler compiler = processor.newXsltCompiler();
        XsltExecutable executable = compiler.compile(
                new StreamSource(new File("output.xslt"))
        );

        // 3. Load transformer
        Xslt30Transformer transformer = executable.load30();;


        // 5. Setup output file
        StringWriter writer = new StringWriter();
        Serializer out = processor.newSerializer(writer);
        out.setOutputProperty(Serializer.Property.METHOD, "xml");
        out.setOutputProperty(Serializer.Property.INDENT, "yes");


        Path projectRoot = Paths.get("").toAbsolutePath();
        Path absolutePath = projectRoot.resolve("src/test/resources/datamapper/inputData.json");

        String xmlParams = "<params><jsonPath>" + absolutePath.toUri() + "</jsonPath></params>";
        StreamSource paramsSource = new StreamSource(new StringReader(xmlParams));
        // 6. Run transformation
        transformer.transform(paramsSource, out);


        System.out.println("Transformation complete!");

        // 7. Parse expected AND actual results
        Document expectedResult = parse("src/test/resources/datamapper/outputData.xml");


        // 8. Compare documents
        Assertions.assertEquals(toString(expectedResult).trim(), writer.toString().trim());
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
