package org.frankframework.flow.filesystem;

import static org.junit.jupiter.api.Assertions.*;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.attribute.FileTime;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Comparator;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

class WorkspaceCleanupServiceTest {

    private WorkspaceCleanupService cleanupService;
    private Path tempWorkspaceRoot;

    @BeforeEach
    void setUp() throws IOException {
        tempWorkspaceRoot = Files.createTempDirectory("cleanup_test");
        cleanupService = new WorkspaceCleanupService();
        ReflectionTestUtils.setField(cleanupService, "workspaceRootPath", tempWorkspaceRoot.toString());
        ReflectionTestUtils.setField(cleanupService, "retentionHours", 24);
    }

    @AfterEach
    void tearDown() throws IOException {
        if (tempWorkspaceRoot != null && Files.exists(tempWorkspaceRoot)) {
            try (var stream = Files.walk(tempWorkspaceRoot)) {
                stream.sorted(Comparator.reverseOrder()).forEach(p -> {
                    try {
                        Files.delete(p);
                    } catch (IOException ignored) {
                    }
                });
            }
        }
    }

    @Test
    void cleanupDeletesExpiredWorkspaces() throws IOException {
        Path expiredSession = Files.createDirectory(tempWorkspaceRoot.resolve("expired-session"));
        Files.setLastModifiedTime(expiredSession, FileTime.from(Instant.now().minus(48, ChronoUnit.HOURS)));

        cleanupService.cleanupOldWorkspaces();

        assertFalse(Files.exists(expiredSession));
    }

    @Test
    void cleanupKeepsRecentWorkspaces() throws IOException {
        Path recentSession = Files.createDirectory(tempWorkspaceRoot.resolve("recent-session"));
        Files.setLastModifiedTime(recentSession, FileTime.from(Instant.now()));

        cleanupService.cleanupOldWorkspaces();

        assertTrue(Files.exists(recentSession));
    }

    @Test
    void cleanupHandlesMixedWorkspaces() throws IOException {
        Path expired = Files.createDirectory(tempWorkspaceRoot.resolve("old"));
        Files.setLastModifiedTime(expired, FileTime.from(Instant.now().minus(48, ChronoUnit.HOURS)));

        Path recent = Files.createDirectory(tempWorkspaceRoot.resolve("new"));
        Files.setLastModifiedTime(recent, FileTime.from(Instant.now()));

        cleanupService.cleanupOldWorkspaces();

        assertFalse(Files.exists(expired));
        assertTrue(Files.exists(recent));
    }

    @Test
    void cleanupSkipsWhenRootDoesNotExist() {
        ReflectionTestUtils.setField(cleanupService, "workspaceRootPath", "/nonexistent/workspace/root");
        assertDoesNotThrow(() -> cleanupService.cleanupOldWorkspaces());
    }

    @Test
    void cleanupIgnoresFiles() throws IOException {
        Files.writeString(tempWorkspaceRoot.resolve("not-a-dir.txt"), "data");

        assertDoesNotThrow(() -> cleanupService.cleanupOldWorkspaces());
        assertTrue(Files.exists(tempWorkspaceRoot.resolve("not-a-dir.txt")));
    }

    @Test
    void cleanupDeletesExpiredWorkspacesWithContents() throws IOException {
        Path expiredSession = Files.createDirectory(tempWorkspaceRoot.resolve("expired-with-files"));
        Files.writeString(expiredSession.resolve("project-file.xml"), "<config/>");
        Files.createDirectory(expiredSession.resolve("subdir"));
        Files.writeString(expiredSession.resolve("subdir/nested.txt"), "data");
        Files.setLastModifiedTime(expiredSession, FileTime.from(Instant.now().minus(48, ChronoUnit.HOURS)));

        cleanupService.cleanupOldWorkspaces();

        assertFalse(Files.exists(expiredSession));
    }

    @Test
    void cleanupRespectsCustomRetentionHours() throws IOException {
        ReflectionTestUtils.setField(cleanupService, "retentionHours", 1);

        Path session = Files.createDirectory(tempWorkspaceRoot.resolve("session"));
        Files.setLastModifiedTime(session, FileTime.from(Instant.now().minus(2, ChronoUnit.HOURS)));

        cleanupService.cleanupOldWorkspaces();

        assertFalse(Files.exists(session));
    }

    @Test
    void cleanupWithEmptyWorkspaceRoot() throws IOException {
        assertDoesNotThrow(() -> cleanupService.cleanupOldWorkspaces());
    }
}
