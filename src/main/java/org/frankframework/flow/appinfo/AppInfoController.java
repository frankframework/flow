package org.frankframework.flow.appinfo;

import java.util.Map;
import org.frankframework.flow.filesystem.FileSystemStorage;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/app-info")
public class AppInfoController {
    private final FileSystemStorage fileSystemStorage;

    public AppInfoController(FileSystemStorage fileSystemStorage) {
        this.fileSystemStorage = fileSystemStorage;
    }

    @GetMapping
    public Map<String, Object> getInfo() {
        return Map.of(
                "isLocal",
                fileSystemStorage.isLocalEnvironment(),
                "workspaceRoot",
                fileSystemStorage.isLocalEnvironment() ? "Computer" : "Cloud Workspace");
    }
}
