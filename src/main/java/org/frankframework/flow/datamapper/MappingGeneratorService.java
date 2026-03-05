package org.frankframework.flow.datamapper;

import lombok.extern.slf4j.Slf4j;
import org.frankframework.flow.filesystem.FileSystemStorage;
import org.springframework.stereotype.Service;
import net.sf.saxon.s9api.*;

import javax.xml.transform.stream.StreamSource;
import java.io.File;
import java.io.IOException;
import java.io.StringReader;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.HashMap;
import java.util.Map;


@Slf4j
@Service
public class MappingGeneratorService {

    private final FileSystemStorage fileSystemStorage;

    public MappingGeneratorService(FileSystemStorage fileSystemStorage) {
        this.fileSystemStorage = fileSystemStorage;
    }


    public void generate(String jsonPath, String outputPath) throws SaxonApiException, IOException {
        if (jsonPath == null || jsonPath.isBlank()) {
            throw new IllegalArgumentException("JSON file path must not be empty");
        }
        Path absolutePath = fileSystemStorage.toAbsolutePath(jsonPath);

        if (!Files.exists(absolutePath)) {
            throw new IllegalArgumentException("JSON file not found: " + absolutePath);
        }

        Processor processor = new Processor(false);
        XsltCompiler compiler = processor.newXsltCompiler();
        XsltExecutable executable =
                compiler.compile(new StreamSource(
                        new File("src/main/java/org/frankframework/flow/datamapper/mappingGenerator.xslt")));
        Xslt30Transformer transformer = executable.load30();


        String xmlParams = "<params><jsonPath>" + absolutePath.toUri() + "</jsonPath></params>";
        StreamSource paramsSource = new StreamSource(new StringReader(xmlParams));

        Serializer out = processor.newSerializer(new File(String.valueOf(fileSystemStorage.toAbsolutePath(outputPath))));
        out.setOutputProperty(Serializer.Property.METHOD, "xml");
        out.setOutputProperty(Serializer.Property.INDENT, "yes");
        transformer.transform(paramsSource, out);

    }
}
