package org.frankframework.flow.datamapper;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import net.sf.saxon.s9api.*;

import javax.xml.transform.stream.StreamSource;
import java.io.File;
import java.io.StringReader;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.HashMap;
import java.util.Map;


@Slf4j
@Service
public class MappingGeneratorService {

    public void generate(String jsonPath) throws SaxonApiException {
        if (jsonPath == null || jsonPath.isBlank()) {
            throw new IllegalArgumentException("JSON file path must not be empty");
        }
        Path projectRoot = Paths.get("").toAbsolutePath();
        Path absolutePath = projectRoot.resolve(jsonPath);

        if (!Files.exists(absolutePath)) {
            throw new IllegalArgumentException("JSON file not found: " + absolutePath);
        }

        Processor processor = new Processor(false);
        XsltCompiler compiler = processor.newXsltCompiler();
        XsltExecutable executable =
                compiler.compile(new StreamSource(
                        new File("src/main/java/org/frankframework/flow/datamapper/mappingGenerator.xslt")));
        Xslt30Transformer transformer = executable.load30();

        // Wrap jsonPath in a minimal XML document
        String xmlParams = "<params><jsonPath>" + absolutePath.toUri() + "</jsonPath></params>";
        StreamSource paramsSource = new StreamSource(new StringReader(xmlParams));

        Serializer out = processor.newSerializer(new File("output.xslt"));
        out.setOutputProperty(Serializer.Property.METHOD, "xml");
        out.setOutputProperty(Serializer.Property.INDENT, "yes");

        // Pass the XML wrapper as the source
        transformer.transform(paramsSource, out);

        System.out.println("Transformation complete!");
    }
}
