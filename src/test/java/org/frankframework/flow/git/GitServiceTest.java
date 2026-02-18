package org.frankframework.flow.git;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import org.eclipse.jgit.api.Git;
import org.frankframework.flow.filesystem.FileSystemStorage;
import org.frankframework.flow.project.Project;
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

    @Test
    public void isGitRepositoryReturnsTrueForGitRepo() throws Exception {
        when(mockProject.getRootPath()).thenReturn(tempDir.toString());
        when(projectService.getProject("test-project")).thenReturn(mockProject);
        when(fileSystemStorage.toAbsolutePath(tempDir.toString())).thenReturn(tempDir);
        assertTrue(gitService.isGitRepository("test-project"));
    }

    @Test
    public void getStatusReturnsCorrectBranch() throws Exception {
        when(mockProject.getRootPath()).thenReturn(tempDir.toString());
        when(projectService.getProject("test-project")).thenReturn(mockProject);
        when(fileSystemStorage.toAbsolutePath(tempDir.toString())).thenReturn(tempDir);
        GitStatusDTO status = gitService.getStatus("test-project");

        assertNotNull(status);
        assertNotNull(status.branch());
    }

    @Test
    public void getStatusShowsModifiedFiles() throws Exception {
        when(mockProject.getRootPath()).thenReturn(tempDir.toString());
        when(projectService.getProject("test-project")).thenReturn(mockProject);
        when(fileSystemStorage.toAbsolutePath(tempDir.toString())).thenReturn(tempDir);
        Files.writeString(tempDir.resolve("README.md"), "# Modified\n", StandardCharsets.UTF_8);

        GitStatusDTO status = gitService.getStatus("test-project");

        assertTrue(status.modified().contains("README.md"));
    }

    @Test
    public void getStatusShowsUntrackedFiles() throws Exception {
        when(mockProject.getRootPath()).thenReturn(tempDir.toString());
        when(projectService.getProject("test-project")).thenReturn(mockProject);
        when(fileSystemStorage.toAbsolutePath(tempDir.toString())).thenReturn(tempDir);
        Files.writeString(tempDir.resolve("new-file.txt"), "new content", StandardCharsets.UTF_8);

        GitStatusDTO status = gitService.getStatus("test-project");

        assertTrue(status.untracked().contains("new-file.txt"));
    }

    @Test
    public void stageFileAddsToStagedChanges() throws Exception {
        when(mockProject.getRootPath()).thenReturn(tempDir.toString());
        when(projectService.getProject("test-project")).thenReturn(mockProject);
        when(fileSystemStorage.toAbsolutePath(tempDir.toString())).thenReturn(tempDir);
        Files.writeString(tempDir.resolve("README.md"), "# Modified\n", StandardCharsets.UTF_8);

        gitService.stageFile("test-project", "README.md");

        GitStatusDTO status = gitService.getStatus("test-project");
        assertTrue(status.staged().contains("README.md"));
        assertFalse(status.modified().contains("README.md"));
    }

    @Test
    public void unstageFileRemovesFromStagedChanges() throws Exception {
        when(mockProject.getRootPath()).thenReturn(tempDir.toString());
        when(projectService.getProject("test-project")).thenReturn(mockProject);
        when(fileSystemStorage.toAbsolutePath(tempDir.toString())).thenReturn(tempDir);
        Files.writeString(tempDir.resolve("README.md"), "# Modified\n", StandardCharsets.UTF_8);
        git.add().addFilepattern("README.md").call();

        gitService.unstageFile("test-project", "README.md");

        GitStatusDTO status = gitService.getStatus("test-project");
        assertFalse(status.staged().contains("README.md"));
        assertTrue(status.modified().contains("README.md"));
    }

    @Test
    public void commitCreatesNewCommit() throws Exception {
        when(mockProject.getRootPath()).thenReturn(tempDir.toString());
        when(projectService.getProject("test-project")).thenReturn(mockProject);
        when(fileSystemStorage.toAbsolutePath(tempDir.toString())).thenReturn(tempDir);
        Files.writeString(tempDir.resolve("README.md"), "# Modified\n", StandardCharsets.UTF_8);
        git.add().addFilepattern("README.md").call();

        GitCommitResultDTO result = gitService.commit("test-project", "Test commit message");

        assertNotNull(result.commitId());
        assertEquals("Test commit message", result.message());
        assertNotNull(result.author());
        assertTrue(result.timestamp() > 0);
    }

    @Test
    public void getLogReturnsCommits() throws Exception {
        when(mockProject.getRootPath()).thenReturn(tempDir.toString());
        when(projectService.getProject("test-project")).thenReturn(mockProject);
        when(fileSystemStorage.toAbsolutePath(tempDir.toString())).thenReturn(tempDir);
        List<GitLogEntryDTO> log = gitService.getLog("test-project", 10);

        assertFalse(log.isEmpty());
        assertEquals("Initial commit", log.getFirst().message());
        assertNotNull(log.getFirst().shortId());
    }

    @Test
    public void getFileDiffReturnsOldAndNewContent() throws Exception {
        when(mockProject.getRootPath()).thenReturn(tempDir.toString());
        when(projectService.getProject("test-project")).thenReturn(mockProject);
        when(fileSystemStorage.toAbsolutePath(tempDir.toString())).thenReturn(tempDir);
        Files.writeString(tempDir.resolve("README.md"), "# Modified Content\n", StandardCharsets.UTF_8);

        GitFileDiffDTO diff = gitService.getFileDiff("test-project", "README.md");

        assertEquals("README.md", diff.filePath());
        assertEquals("# Test Project\n", diff.oldContent());
        assertEquals("# Modified Content\n", diff.newContent());
    }

    @Test
    public void stageHunksPartiallyStagesFile() throws Exception {
        when(mockProject.getRootPath()).thenReturn(tempDir.toString());
        when(projectService.getProject("test-project")).thenReturn(mockProject);
        when(fileSystemStorage.toAbsolutePath(tempDir.toString())).thenReturn(tempDir);
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
    public void stageFileHandlesNewUntrackedFile() throws Exception {
        when(mockProject.getRootPath()).thenReturn(tempDir.toString());
        when(projectService.getProject("test-project")).thenReturn(mockProject);
        when(fileSystemStorage.toAbsolutePath(tempDir.toString())).thenReturn(tempDir);
        Files.writeString(tempDir.resolve("brand-new.txt"), "new file content", StandardCharsets.UTF_8);

        gitService.stageFile("test-project", "brand-new.txt");

        GitStatusDTO status = gitService.getStatus("test-project");
        assertTrue(status.staged().contains("brand-new.txt"));
    }

    @Test
    public void stageFileHandlesDeletedFile() throws Exception {
        when(mockProject.getRootPath()).thenReturn(tempDir.toString());
        when(projectService.getProject("test-project")).thenReturn(mockProject);
        when(fileSystemStorage.toAbsolutePath(tempDir.toString())).thenReturn(tempDir);
        Files.delete(tempDir.resolve("README.md"));

        gitService.stageFile("test-project", "README.md");

        GitStatusDTO status = gitService.getStatus("test-project");
        assertTrue(status.staged().contains("README.md"));
    }

    @Test
    public void notAGitRepositoryThrowsException() throws Exception {
        Path nonGitDir = tempDir.resolve("not-git");
        Files.createDirectories(nonGitDir);

        Project mockProject = mock(Project.class);
        when(mockProject.getRootPath()).thenReturn(nonGitDir.toString());
        when(projectService.getProject("not-git")).thenReturn(mockProject);
        when(fileSystemStorage.toAbsolutePath(nonGitDir.toString())).thenReturn(nonGitDir);

        assertThrows(NotAGitRepositoryException.class, () -> gitService.getStatus("not-git"));
    }
}
