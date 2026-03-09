package org.frankframework.flow.datamapper;

import java.io.File;
import java.io.IOException;
import java.io.StringReader;
import java.nio.file.Files;
import java.nio.file.Path;
import javax.xml.transform.stream.StreamSource;
import lombok.extern.slf4j.Slf4j;
import net.sf.saxon.s9api.*;
import org.frankframework.flow.configuration.ConfigurationNotFoundException;
import org.frankframework.flow.exception.ApiException;
import org.frankframework.flow.filesystem.FileSystemStorage;
import org.frankframework.flow.filetree.FileTreeService;
import org.springframework.http.HttpStatus;
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

    private String getConfigFilePath(String projectName) throws ApiException {
        return Path.of(getDatamapperFilePath(projectName))
                .resolve("generationFile.json")
                .toString();
    }

    private String getDatamapperFilePath(String projectName) throws ApiException {
        try {
            return Path.of(fileTreeService
                            .getConfigurationsDirectoryTree(projectName)
                            .getPath())
                    .resolve("datamapper")
                    .toString();
        } catch (IOException e) {
            throw new ApiException(
                    "Failed to resolve configuration file path for project: " + projectName,
                    HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    public void saveGenerationFile(String projectName, String content) throws ApiException {
        Path absoluteFilePath;

        try {
            absoluteFilePath = fileSystemStorage.toAbsolutePath(getConfigFilePath(projectName));
            String datamapperFilePath = getDatamapperFilePath(projectName);

            Path path = Path.of(datamapperFilePath);
            if (!Files.isDirectory(path)) {
                Files.createDirectory(path);
            }
        } catch (IOException | ConfigurationNotFoundException e) {
            throw new ApiException(
                    "Failed to resolve configuration file path for project: " + projectName, HttpStatus.NOT_FOUND);
        }

        if (Files.isDirectory(absoluteFilePath)) {
            throw new ApiException(
                    "Cannot update configuration because path is a directory: " + absoluteFilePath,
                    HttpStatus.INTERNAL_SERVER_ERROR);
        }

        try {
            if (Files.notExists(absoluteFilePath)) {
                fileSystemStorage.createFile(String.valueOf(absoluteFilePath));
            }

            fileSystemStorage.writeFile(absoluteFilePath.toString(), content);

        } catch (IOException e) {
            throw new ApiException(
                    "Failed to update configuration file: " + absoluteFilePath, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    private void deleteGenerationFile(String projectName) throws ApiException {
        try {
            Path absoluteFilePath = fileSystemStorage.toAbsolutePath(getConfigFilePath(projectName));
            fileSystemStorage.delete(absoluteFilePath.toString());

        } catch (IOException e) {
            throw new ApiException(
                    "Failed to find configuration for project: " + projectName, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    public void generateFromProject(String projectName, String content) throws ApiException {
        saveGenerationFile(projectName, content);
        generate(getConfigFilePath(projectName), getDatamapperFilePath(projectName) + "/export.xslt");
        deleteGenerationFile(projectName);
    }

    public void generate(String jsonPath, String outputPath) throws ApiException {
        if (jsonPath == null || jsonPath.isBlank()) {
            throw new ApiException("JSON file path must not be empty", HttpStatus.BAD_REQUEST);
        }
        Path absolutePath;
        try {
            absolutePath = fileSystemStorage.toAbsolutePath(jsonPath);
        } catch (IOException e) {
            throw new ApiException("Invalid filepath", HttpStatus.BAD_REQUEST);
        }

        if (!Files.exists(absolutePath)) {
            throw new ApiException("JSON file not found: " + absolutePath, HttpStatus.INTERNAL_SERVER_ERROR);
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
            throw new ApiException("Error generating new XSLT!", HttpStatus.INTERNAL_SERVER_ERROR);
        } catch (IOException e) {
            throw new ApiException("Invalid destination path for XSLT", HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
}
