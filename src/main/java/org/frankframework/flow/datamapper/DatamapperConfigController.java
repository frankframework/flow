package org.frankframework.flow.datamapper;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.NoSuchFileException;
import java.nio.file.Path;
import org.frankframework.flow.configuration.ConfigurationNotFoundException;
import org.frankframework.flow.filetree.FileTreeService;
import org.frankframework.flow.project.ProjectNotFoundException;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/datamapper")
public class DatamapperConfigController {

    private final FileTreeService fileTreeService;
    private final DatamapperConfigService datamapperConfigService;

    public DatamapperConfigController(
            FileTreeService fileTreeService, DatamapperConfigService datamapperConfigService) {
        this.datamapperConfigService = datamapperConfigService;
        this.fileTreeService = fileTreeService;
    }

    @GetMapping("/{projectName}/configuration")
    public ResponseEntity<String> getConfiguration(@PathVariable String projectName)
            throws ConfigurationNotFoundException, IOException {
        String filepath =
                fileTreeService.getConfigurationsDirectoryTree(projectName).getPath()
                        + "\\datamapper\\configuration.json";

        try {
            String content = Files.readString(Path.of(filepath));
            return ResponseEntity.ok().contentType(MediaType.APPLICATION_JSON).body(content);
        } catch (NoSuchFileException e) {
            throw new ConfigurationNotFoundException("Configuration file not found: " + filepath);
        } catch (IllegalArgumentException e) {
            throw new ConfigurationNotFoundException("Invalid configuration path: " + filepath);
        }
    }

    @PutMapping("/{projectName}/configuration")
    public ResponseEntity<Void> updateConfiguration(@PathVariable String projectName, @RequestBody String content)
            throws ConfigurationNotFoundException, IOException, ProjectNotFoundException {

        String filepath =
                fileTreeService.getConfigurationsDirectoryTree(projectName).getPath()
                        + "\\datamapper\\configuration.json";

        try {
            datamapperConfigService.updateFileContent(filepath, content);
            return ResponseEntity.ok().build();
        } catch (IllegalArgumentException e) {

            throw new ConfigurationNotFoundException("Invalid file path: " + filepath);
        }
    }
}
