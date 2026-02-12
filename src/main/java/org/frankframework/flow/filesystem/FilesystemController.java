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

    private final FileSystemStorage fileSystemStorage;

    public FilesystemController(FileSystemStorage fileSystemStorage) {
        this.fileSystemStorage = fileSystemStorage;
    }

    @GetMapping("/browse")
    public ResponseEntity<List<FilesystemEntry>> browse(@RequestParam(required = false, defaultValue = "") String path)
            throws IOException {

        List<FilesystemEntry> entries;
        if (path.isBlank()) {
            entries = fileSystemStorage.listRoots();
        } else {
            entries = fileSystemStorage.listDirectory(path);
        }
        return ResponseEntity.ok(entries);
    }
}
