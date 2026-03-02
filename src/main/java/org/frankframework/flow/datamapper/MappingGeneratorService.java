package org.frankframework.flow.datamapper;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import net.sf.saxon.s9api.*;

import javax.xml.transform.stream.StreamSource;
import java.io.File;


@Slf4j
@Service
public class MappingGeneratorService {
    public void generate() throws SaxonApiException {

        // 1. Create processor (false = no schema validation)
        Processor processor = new Processor(false);

        // 2. Compile XSLT
        XsltCompiler compiler = processor.newXsltCompiler();
        XsltExecutable executable = compiler.compile(new StreamSource(new File("D:\\School\\WeAreFrank\\flow\\src\\main\\java\\org\\frankframework\\flow\\datamapper\\mappingGenerator.xslt")));

        // 3. Load 3.0 transformer
        Xslt30Transformer transformer = executable.load30();

        // 4. Setup output
        Serializer out = processor.newSerializer(new File("output.xml"));
        out.setOutputProperty(Serializer.Property.METHOD, "xml");
        out.setOutputProperty(Serializer.Property.INDENT, "yes");

        // 5. Call initial template (no XML input needed)
        transformer.callTemplate(QName.fromClarkName("main"), out);

        System.out.println("Transformation complete!");
    }
}
