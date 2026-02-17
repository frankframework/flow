package org.frankframework.flow.recentproject;

import java.util.List;
import java.util.Map;
import org.frankframework.flow.filesystem.FileSystemStorage;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/recent-projects")
public class RecentProjectController {
    private final RecentProjectsService recentProjectsService;
    private final FileSystemStorage fileSystemStorage;

    public RecentProjectController(RecentProjectsService recentProjectsService, FileSystemStorage fileSystemStorage) {
        this.recentProjectsService = recentProjectsService;
        this.fileSystemStorage = fileSystemStorage;
    }

    @GetMapping
    public ResponseEntity<List<RecentProject>> getRecentProjects() {
        List<RecentProject> projects = recentProjectsService.getRecentProjects();

        if (!fileSystemStorage.isLocalEnvironment()) {
            projects = projects.stream()
                    .map(p ->
                            new RecentProject(p.name(), fileSystemStorage.toRelativePath(p.rootPath()), p.lastOpened()))
                    .toList();
        }

        return ResponseEntity.ok(projects);
    }

    @DeleteMapping
    public ResponseEntity<Void> removeRecentProject(@RequestBody Map<String, String> body) {
        String rootPath = body.get("rootPath");
        if (rootPath == null || rootPath.isBlank()) {
            return ResponseEntity.badRequest().build();
        }

        // In cloud mode, convert the relative path back to absolute before removing
        if (!fileSystemStorage.isLocalEnvironment()) {
            try {
                rootPath = fileSystemStorage.toAbsolutePath(rootPath).toString();
            } catch (Exception e) {
                return ResponseEntity.badRequest().build();
            }
        }

        recentProjectsService.removeRecentProject(rootPath);
        return ResponseEntity.ok().build();
    }
}
