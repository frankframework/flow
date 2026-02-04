package org.frankframework.flow.filesystem;

import java.io.IOException;
import java.util.List;
import java.util.Map;
import org.frankframework.flow.exception.ApiException;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/filesystem")
public class FilesystemController {

    private final FilesystemService filesystemService;
    private final NativeDialogService nativeDialogService;

    public FilesystemController(FilesystemService filesystemService, NativeDialogService nativeDialogService) {
        this.filesystemService = filesystemService;
        this.nativeDialogService = nativeDialogService;
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

    @GetMapping("/select-native")
    public ResponseEntity<Map<String, String>> selectNativePath() throws ApiException {
        return nativeDialogService
                .selectDirectory()
                .map(path -> ResponseEntity.ok(Map.of("path", path)))
                .orElse(ResponseEntity.noContent().build());
    }
}
