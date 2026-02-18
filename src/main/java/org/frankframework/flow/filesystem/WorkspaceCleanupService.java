package org.frankframework.flow.filesystem;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.attribute.FileTime;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.stream.Stream;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Profile;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.util.FileSystemUtils;

@Slf4j
@Service
@Profile("cloud")
public class WorkspaceCleanupService {
    private static final long CLEANUP_INTERVAL_MS = 3_600_000L;

    @Value("${frankflow.workspace.root:/tmp/frankflow/workspace}")
    private String workspaceRootPath;

    @Value("${frankflow.workspace.retention-hours:24}")
    private int retentionHours;

    @Scheduled(fixedRate = CLEANUP_INTERVAL_MS)
    public void cleanupOldWorkspaces() {
        log.info("Starting workspace cleanup check...");

        Path root = Paths.get(workspaceRootPath);
        if (!Files.exists(root)) {
            log.info("Workspace root does not exist yet, skipping cleanup: {}", root);
            return;
        }

        Instant cutoffTime = Instant.now().minus(retentionHours, ChronoUnit.HOURS);

        try (Stream<Path> sessions = Files.list(root)) {
            sessions.filter(Files::isDirectory).forEach(sessionDir -> {
                try {
                    FileTime lastModifiedTime = Files.getLastModifiedTime(sessionDir);

                    if (lastModifiedTime.toInstant().isBefore(cutoffTime)) {
                        log.info("Deleting expired workspace: {}", sessionDir);
                        FileSystemUtils.deleteRecursively(sessionDir);
                    }
                } catch (IOException e) {
                    log.error("Failed to clean up session: {}", sessionDir, e);
                }
            });
        } catch (IOException e) {
            log.error("Error accessing workspace root for cleanup", e);
        }
    }
}
