package org.frankframework.flow.datamapper;



import java.io.File;
import java.io.IOException;

import net.sf.saxon.s9api.*;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.w3c.dom.Document;

import javax.xml.parsers.DocumentBuilder;
import javax.xml.parsers.DocumentBuilderFactory;
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
        service.generate();
    }
    @Test
    public void testGeneratedMapping() throws Exception {
        service.generate();

        // 1. Create processor (false = no schema validation)
        Processor processor = new Processor(false);

        // 2. Compile XSLT (1.0 works fine here)
        XsltCompiler compiler = processor.newXsltCompiler();
        XsltExecutable executable = compiler.compile(
                new StreamSource(new File("output.xslt"))
        );

        // 3. Load transformer (NOT load30)
        XsltTransformer transformer = executable.load();

        // 4. Provide XML input (REQUIRED in XSLT 1.0)
        StreamSource xmlSource = new StreamSource(new File("src/test/resources/datamapper/inputData.xml"));
        transformer.setSource(xmlSource);

        // 5. Setup output
        Serializer out = processor.newSerializer(new File("output.xml"));
        out.setOutputProperty(Serializer.Property.METHOD, "xml");
        out.setOutputProperty(Serializer.Property.INDENT, "yes");

        transformer.setDestination(out);

        // 6. Run transformation
        transformer.transform();

        System.out.println("Transformation complete!");
        Document expectedResult = parse("src/test/resources/datamapper/outputData.xml");

        Assertions.assertEquals(expectedResult, out);
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
}
