package org.frankframework.flow.datamapper;

import java.io.File;
import java.io.IOException;
import java.io.StringReader;
import java.nio.file.Files;
import java.nio.file.Path;
import javax.naming.ConfigurationException;
import javax.xml.transform.stream.StreamSource;
import lombok.extern.slf4j.Slf4j;
import net.sf.saxon.s9api.*;
import org.frankframework.flow.configuration.ConfigurationNotFoundException;
import org.frankframework.flow.filesystem.FileSystemStorage;
import org.frankframework.flow.filetree.FileTreeService;
import org.springframework.stereotype.Service;

@Slf4j
@Service
public class DatamapperGeneratorService {

    private final FileSystemStorage fileSystemStorage;
    private final FileTreeService fileTreeService;

    public DatamapperGeneratorService(FileSystemStorage fileSystemStorage, FileTreeService fileTreeService) {
        this.fileSystemStorage = fileSystemStorage;
        this.fileTreeService = fileTreeService;
    }

    private String getConfigFilePath(String projectName) throws ConfigurationNotFoundException {
        return Path.of(getDatamapperFilePath(projectName))
                .resolve("generationFile.json")
                .toString();
    }

    private String getDatamapperFilePath(String projectName) throws ConfigurationNotFoundException {
        try {
            return Path.of(fileTreeService
                            .getConfigurationsDirectoryTree(projectName)
                            .getPath())
                    .resolve("datamapper")
                    .toString();
        } catch (IOException e) {
            throw new ConfigurationNotFoundException(
                    "Failed to resolve configuration file path for project: " + projectName);
        }
    }

    public void saveGenerationFile(String projectName, String content)
            throws ConfigurationNotFoundException, ConfigurationException {
        Path absoluteFilePath;

        try {
            absoluteFilePath = fileSystemStorage.toAbsolutePath(getConfigFilePath(projectName));
            String datamapperFilePath = getDatamapperFilePath(projectName);

            Path path = Path.of(datamapperFilePath);
            if (!Files.isDirectory(path)) {
                Files.createDirectory(path);
            }
        } catch (IOException | ConfigurationNotFoundException e) {
            throw new ConfigurationNotFoundException(
                    "Failed to resolve configuration file path for project: " + projectName);
        }

        if (Files.isDirectory(absoluteFilePath)) {
            throw new ConfigurationException(
                    "Cannot update configuration because path is a directory: " + absoluteFilePath);
        }

        try {
            if (Files.notExists(absoluteFilePath)) {
                fileSystemStorage.createFile(String.valueOf(absoluteFilePath));
            }

            fileSystemStorage.writeFile(absoluteFilePath.toString(), content);

        } catch (IOException e) {
            throw new ConfigurationException("Failed to update configuration file: " + absoluteFilePath);
        }
    }

    private void deleteGenerationFile(String projectName) throws ConfigurationNotFoundException {
        try {
            Path absoluteFilePath = fileSystemStorage.toAbsolutePath(getConfigFilePath(projectName));
            fileSystemStorage.delete(absoluteFilePath.toString());

        } catch (IOException e) {
            throw new ConfigurationNotFoundException("Failed to find configuration for project: " + projectName);
        }
    }

    public void generateFromProject(String projectName, String content)
            throws ConfigurationNotFoundException, ConfigurationException, DatamapperGenerationException {
        saveGenerationFile(projectName, content);
        generate(getConfigFilePath(projectName), getDatamapperFilePath(projectName) + "/export.xslt");
        deleteGenerationFile(projectName);
    }

    public void generate(String jsonPath, String outputPath)
            throws ConfigurationNotFoundException, DatamapperGenerationException {
        if (jsonPath == null || jsonPath.isBlank()) {
            throw new ConfigurationNotFoundException("JSON file path must not be empty");
        }
        Path absolutePath;
        try {
            absolutePath = fileSystemStorage.toAbsolutePath(jsonPath);
        } catch (IOException e) {
            throw new ConfigurationNotFoundException("Invalid filepath");
        }

        if (!Files.exists(absolutePath)) {
            throw new ConfigurationNotFoundException("JSON file not found: " + absolutePath);
        }

        Processor processor = new Processor(false);
        XsltCompiler compiler = processor.newXsltCompiler();
        XsltExecutable executable = null;
        try {
            executable = compiler.compile(new StreamSource(
                    new File("src/main/java/org/frankframework/flow/datamapper/mappingGenerator.xslt")));

            Xslt30Transformer transformer = executable.load30();

            String xmlParams = "<params><jsonPath>" + absolutePath.toUri() + "</jsonPath></params>";
            StreamSource paramsSource = new StreamSource(new StringReader(xmlParams));

            Serializer out =
                    processor.newSerializer(new File(String.valueOf(fileSystemStorage.toAbsolutePath(outputPath))));

            out.setOutputProperty(Serializer.Property.METHOD, "xml");
            out.setOutputProperty(Serializer.Property.INDENT, "yes");
            transformer.transform(paramsSource, out);
        } catch (SaxonApiException e) {
            throw new DatamapperGenerationException("Error generating new XSLT!");
        } catch (IOException e) {
            throw new DatamapperGenerationException("Invalid destination path for XSLT");
        }
    }
}
