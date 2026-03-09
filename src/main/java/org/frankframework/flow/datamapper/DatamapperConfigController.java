package org.frankframework.flow.datamapper;

import org.frankframework.flow.configuration.ConfigurationNotFoundException;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/datamapper")
public class DatamapperConfigController {

    private final DatamapperConfigService datamapperConfigService;

    public DatamapperConfigController(DatamapperConfigService datamapperConfigService) {
        this.datamapperConfigService = datamapperConfigService;
    }

    @GetMapping("/{projectName}/configuration")
    public ResponseEntity<String> getConfiguration(@PathVariable String projectName)
            throws ConfigurationNotFoundException {

        String content = datamapperConfigService.getConfig(projectName);
        return ResponseEntity.ok().contentType(MediaType.APPLICATION_JSON).body(content);
    }

    @PutMapping("/{projectName}/configuration")
    public ResponseEntity<Void> updateConfiguration(@PathVariable String projectName, @RequestBody String content)
            throws ConfigurationNotFoundException {

        try {
            datamapperConfigService.updateFileContent(projectName, content);
            return ResponseEntity.ok().build();
        } catch (IllegalArgumentException e) {

            throw new ConfigurationNotFoundException(e.getMessage());
        }
    }
}
