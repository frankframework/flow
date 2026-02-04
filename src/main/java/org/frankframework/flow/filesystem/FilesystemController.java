package org.frankframework.flow.filesystem;

import java.io.IOException;
import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/filesystem")
public class FilesystemController {

    private final FilesystemService filesystemService;

    public FilesystemController(FilesystemService filesystemService) {
        this.filesystemService = filesystemService;
    }

    @GetMapping("/browse")
    public ResponseEntity<List<FilesystemEntry>> browse(@RequestParam(required = false, defaultValue = "") String path)
            throws IOException {

        List<FilesystemEntry> entries;
        if (path.isBlank()) {
            entries = filesystemService.listRoots();
        } else {
            entries = filesystemService.listDirectories(path);
        }
        return ResponseEntity.ok(entries);
    }
}
