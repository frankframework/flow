package org.frankframework.flow.datamapper;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
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

    private String getConfigFilePath(String projectName) throws ConfigurationNotFoundException {
        try {

            return Path.of(fileTreeService
                            .getConfigurationsDirectoryTree(projectName)
                            .getPath())
                    .resolve("datamapper")
                    .resolve("configuration.json")
                    .toString();
        } catch (IOException e) {
            throw new ConfigurationNotFoundException(
                    "Failed to resolve configuration file path for project: " + projectName);
        }
    }

    public void updateFileContent(String projectName, String newContent) throws ConfigurationNotFoundException {
        Path absoluteFilePath;

        try {
            absoluteFilePath = fileSystemStorage.toAbsolutePath(getConfigFilePath(projectName));
            String datamapperFilePath = Path.of(fileTreeService
                            .getConfigurationsDirectoryTree(projectName)
                            .getPath())
                    .resolve("datamapper")
                    .toString();

            Path directoryPath = Path.of(datamapperFilePath);
            if (!Files.isDirectory(directoryPath)) {
                Files.createDirectory(directoryPath);
            }
        } catch (IOException e) {
            throw new ConfigurationNotFoundException(
                    "Failed to resolve configuration file path for project: " + projectName);
        }

        if (Files.isDirectory(absoluteFilePath)) {
            throw new ConfigurationNotFoundException(
                    "Cannot update configuration because path is a directory: " + absoluteFilePath);
        }

        try {
            if (Files.notExists(absoluteFilePath)) {
                fileSystemStorage.createFile(String.valueOf(absoluteFilePath));
            }

            fileSystemStorage.writeFile(absoluteFilePath.toString(), newContent);

        } catch (IOException e) {
            throw new ConfigurationNotFoundException("Failed to update configuration file: " + absoluteFilePath);
        }
    }

    public String getConfig(String projectName) throws ConfigurationNotFoundException {
        try {
            String filePath = this.getConfigFilePath(projectName);
            return fileSystemStorage.readFile(filePath);
        } catch (IOException e) {
            throw new ConfigurationNotFoundException(
                    "Failed to resolve configuration file path for project: " + projectName);
        }
    }
}
