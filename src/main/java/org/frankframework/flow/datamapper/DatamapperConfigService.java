package org.frankframework.flow.datamapper;

import org.frankframework.flow.configuration.ConfigurationNotFoundException;
import org.frankframework.flow.filesystem.FileSystemStorage;
import org.frankframework.flow.project.ProjectNotFoundException;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
@Service
public class DatamapperConfigService {
    private final FileSystemStorage fileSystemStorage;

    public DatamapperConfigService(FileSystemStorage fileSystemStorage) {
        this.fileSystemStorage = fileSystemStorage;
    }

    public void updateFileContent(String filepath, String newContent)
            throws IOException, ProjectNotFoundException, ConfigurationNotFoundException {


        Path filePath = fileSystemStorage.toAbsolutePath(filepath);

        if (!Files.exists(filePath)) {
            Files.createFile(filePath);
        }

        if (Files.isDirectory(filePath)) {
            throw new IllegalArgumentException("Cannot update a directory: " + filepath);
        }


        fileSystemStorage.writeFile(filepath, newContent);

    }
}
