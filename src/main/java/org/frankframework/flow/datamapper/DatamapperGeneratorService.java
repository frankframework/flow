package org.frankframework.flow.datamapper;

import java.io.IOException;
import java.io.StringReader;
import java.net.URL;
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

    private Path getConfigFilePath(String projectName) throws ApiException {
        return getDatamapperDir(projectName).resolve("generationFile.json");
    }

    private Path getDatamapperDir(String projectName) throws ApiException {
        try {
            return fileSystemStorage
                    .toAbsolutePath(fileTreeService
                            .getConfigurationsDirectoryTree(projectName)
                            .getPath())
                    .resolve("datamapper");
        } catch (IOException e) {
            throw new ApiException(
                    "Failed to resolve configuration file path for project: " + projectName, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    public void saveGenerationFile(String projectName, String content) throws ApiException {
        Path configurationPath;
        Path datamapperDir = getDatamapperDir(projectName);

        try {
            configurationPath = getConfigFilePath(projectName);

            if (!Files.isDirectory(datamapperDir)) {
                Files.createDirectory(datamapperDir);
            }
        } catch (IOException | ConfigurationNotFoundException e) {
            throw new ApiException(
                    "Failed to resolve configuration file path for project: " + projectName, HttpStatus.NOT_FOUND);
        }

        if (Files.isDirectory(configurationPath)) {
            throw new ApiException(
                    "Cannot update configuration because path is a directory: " + configurationPath,
                    HttpStatus.INTERNAL_SERVER_ERROR);
        }

        try {
            if (Files.notExists(configurationPath)) {
                fileSystemStorage.createFile(configurationPath.toString());
            }

            fileSystemStorage.writeFile(configurationPath.toString(), content);

        } catch (IOException e) {
            throw new ApiException(
                    "Failed to update configuration file: " + configurationPath, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    private void deleteGenerationFile(String projectName) throws ApiException {
        try {

            fileSystemStorage.delete(getConfigFilePath(projectName).toString());

        } catch (IOException e) {
            throw new ApiException(
                    "Failed to find configuration for project: " + projectName, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    public void generateFromProject(String projectName, String content) throws ApiException {
        saveGenerationFile(projectName, content);
        generate(
                getConfigFilePath(projectName).toString(),
                getDatamapperDir(projectName).resolve("export.xslt").toString());
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
            URL xsltUrl = getClass().getClassLoader().getResource("datamapper/mappingGenerator.xslt");

            if (xsltUrl == null) {
                throw new RuntimeException("mappingGenerator.xslt not found");
            }

            StreamSource source = new StreamSource(xsltUrl.openStream());
            source.setSystemId(xsltUrl.toExternalForm());

            executable = compiler.compile(source);

            Xslt30Transformer transformer = executable.load30();

            String xmlParams = "<params><jsonPath>" + absolutePath.toUri() + "</jsonPath></params>";
            StreamSource paramsSource = new StreamSource(new StringReader(xmlParams));
            Serializer out = processor.newSerializer(
                    fileSystemStorage.toAbsolutePath(outputPath).toFile());

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
