package org.frankframework.flow.datamapper;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import javax.naming.ConfigurationException;
import org.frankframework.flow.configuration.ConfigurationNotFoundException;
import org.frankframework.flow.filesystem.FileSystemStorage;
import org.frankframework.flow.filetree.FileTreeService;
import org.springframework.stereotype.Service;

@Service
public class DatamapperConfigService {
    private final FileSystemStorage fileSystemStorage;
    private final FileTreeService fileTreeService;

    public DatamapperConfigService(FileSystemStorage fileSystemStorage, FileTreeService fileTreeService) {
        this.fileSystemStorage = fileSystemStorage;
        this.fileTreeService = fileTreeService;
    }

    private Path getConfigFilePath(String projectName) throws ConfigurationNotFoundException {
        return getDatamapperDir(projectName).resolve("configuration.json");
    }

    private Path getDatamapperDir(String projectName) throws ConfigurationNotFoundException{
        try {
            return fileSystemStorage.toAbsolutePath(fileTreeService
                            .getConfigurationsDirectoryTree(projectName)
                            .getPath())
                    .resolve("datamapper");
        } catch (IOException e) {
            throw new ConfigurationNotFoundException(
                    "Failed to resolve configuration file path for project: " + projectName);
        }
    }

    public void updateFileContent(String projectName, String newContent)
            throws ConfigurationNotFoundException, ConfigurationException {
        Path absoluteFilePath;

        Path dataMapperDir = null;
        try {
            absoluteFilePath = getConfigFilePath(projectName);


            dataMapperDir = fileSystemStorage.toAbsolutePath(fileTreeService
                            .getConfigurationsDirectoryTree(projectName)
                            .getPath())
                    .resolve("datamapper");


            if (!Files.isDirectory(dataMapperDir)) {
                Files.createDirectory(dataMapperDir);
            }
        } catch (IOException e) {
            throw new ConfigurationException("Can't create datamapper directory on " + e.getMessage());
        }

        if (Files.isDirectory(absoluteFilePath)) {
            throw new ConfigurationException(
                    "Cannot update configuration because path is a directory: " + absoluteFilePath);
        }

        try {
            if (Files.notExists(absoluteFilePath)) {
                fileSystemStorage.createFile(String.valueOf(absoluteFilePath));
            }

            fileSystemStorage.writeFile(absoluteFilePath.toString(), newContent);

        } catch (IOException e) {
            throw new ConfigurationException("Failed to update configuration file: " + absoluteFilePath);
        }
    }

    public String getConfig(String projectName) throws ConfigurationNotFoundException {
        try {
            String filePath = this.getConfigFilePath(projectName).toString();
            if(!Files.exists(Path.of(filePath))){
                fileSystemStorage.createFile(filePath);
            }
            return fileSystemStorage.readFile(filePath);
        } catch (IOException e) {
            throw new ConfigurationNotFoundException(
                    "Failed to resolve configuration file path for project: " + projectName);
        }
    }
}
