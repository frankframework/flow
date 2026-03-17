package org.frankframework.flow.git;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;
import java.util.stream.IntStream;
import java.util.stream.Stream;
import java.util.stream.StreamSupport;
import lombok.extern.slf4j.Slf4j;
import org.eclipse.jgit.api.Git;
import org.eclipse.jgit.api.MergeResult;
import org.eclipse.jgit.api.PullCommand;
import org.eclipse.jgit.api.PullResult;
import org.eclipse.jgit.api.PushCommand;
import org.eclipse.jgit.api.Status;
import org.eclipse.jgit.api.errors.GitAPIException;
import org.eclipse.jgit.diff.Edit;
import org.eclipse.jgit.diff.MyersDiff;
import org.eclipse.jgit.diff.RawText;
import org.eclipse.jgit.diff.RawTextComparator;
import org.eclipse.jgit.dircache.DirCache;
import org.eclipse.jgit.dircache.DirCacheBuilder;
import org.eclipse.jgit.dircache.DirCacheEntry;
import org.eclipse.jgit.lib.BranchTrackingStatus;
import org.eclipse.jgit.lib.Constants;
import org.eclipse.jgit.lib.FileMode;
import org.eclipse.jgit.lib.ObjectId;
import org.eclipse.jgit.lib.ObjectInserter;
import org.eclipse.jgit.lib.PersonIdent;
import org.eclipse.jgit.lib.Ref;
import org.eclipse.jgit.lib.Repository;
import org.eclipse.jgit.lib.StoredConfig;
import org.eclipse.jgit.revwalk.RevCommit;
import org.eclipse.jgit.revwalk.RevTree;
import org.eclipse.jgit.revwalk.RevWalk;
import org.eclipse.jgit.transport.CredentialsProvider;
import org.eclipse.jgit.transport.FetchResult;
import org.eclipse.jgit.transport.PushResult;
import org.eclipse.jgit.transport.RemoteRefUpdate;
import org.eclipse.jgit.treewalk.TreeWalk;
import org.eclipse.jgit.treewalk.filter.PathFilter;
import org.frankframework.flow.filesystem.FileSystemStorage;
import org.frankframework.flow.project.ProjectNotFoundException;
import org.frankframework.flow.project.ProjectService;
import org.springframework.stereotype.Service;

@Slf4j
@Service
public class GitService {

    private static final int SHORT_ID_LENGTH = 7;

    private final ProjectService projectService;
    private final FileSystemStorage fileSystemStorage;

    public GitService(ProjectService projectService, FileSystemStorage fileSystemStorage) {
        this.projectService = projectService;
        this.fileSystemStorage = fileSystemStorage;
    }

    public boolean isGitRepository(String projectName) throws ProjectNotFoundException, IOException {
        Path projectPath = getProjectPath(projectName);
        boolean isRepo = Files.isDirectory(projectPath.resolve(".git"));
        log.debug("isGitRepository('{}') = {} (path: {})", projectName, isRepo, projectPath);
        return isRepo;
    }

    /**
     * Retrieves the git status for the specified project, including lists of staged, modified, untracked, and conflicting files, as well as branch information and ahead/behind counts. It uses JGit to access the repository and gather this information, and then constructs a GitStatusDTO to return to the caller. The method handles exceptions related to repository access and git operations, and logs relevant information for debugging purposes.
     * @param projectName the name of the project for which to retrieve the git status
     * @return a GitStatusDTO containing the lists of staged, modified, untracked, and conflicting files, as well as branch information and ahead/behind counts
     * @throws ProjectNotFoundException if the specified project does not exist in the system
     * @throws IOException if an I/O error occurs while accessing the project's repository
     * @throws NotAGitRepositoryException if the specified project exists but is not a git repository
     * @throws GitOperationException if an error occurs while performing git operations to retrieve the status information
     */
    public GitStatusDTO getStatus(String projectName)
            throws ProjectNotFoundException, IOException, NotAGitRepositoryException, GitOperationException {
        log.debug("Fetching git status for project '{}'", projectName);
        try (Git git = openGit(projectName)) {
            Repository repo = git.getRepository();
            Status status = git.status().call();

            List<String> staged = mergeUnique(status.getAdded(), status.getChanged(), status.getRemoved());
            List<String> modified = mergeUnique(status.getModified(), status.getMissing());

            String branch = repo.getBranch();
            int ahead = 0;
            int behind = 0;
            boolean hasRemote = !repo.getRemoteNames().isEmpty();

            BranchTrackingStatus tracking = BranchTrackingStatus.of(repo, branch);
            if (tracking != null) {
                ahead = tracking.getAheadCount();
                behind = tracking.getBehindCount();
            }

            log.debug(
                    "Status for '{}': branch={}, staged={}, modified={}, untracked={}, conflicts={}",
                    projectName,
                    branch,
                    staged.size(),
                    modified.size(),
                    status.getUntracked().size(),
                    status.getConflicting().size());

            return new GitStatusDTO(
                    staged,
                    modified,
                    List.copyOf(status.getUntracked()),
                    List.copyOf(status.getConflicting()),
                    branch,
                    ahead,
                    behind,
                    hasRemote,
                    fileSystemStorage.isLocalEnvironment());
        } catch (GitAPIException e) {
            log.error("Failed to get git status for project '{}'", projectName, e);
            throw new GitOperationException("Failed to get git status", e);
        }
    }

    /**
     * Retrieves the diff for a specific file by reading the content from the HEAD commit and the working tree, normalizing line endings, and then computing the hunks using a Myers diff. It returns a GitFileDiffDTO containing the file path, old content, new content, and the list of hunks representing the differences between the two versions. The method handles exceptions related to repository access and git operations, and logs relevant information for debugging purposes.
     */
    public GitFileDiffDTO getFileDiff(String projectName, String filePath)
            throws ProjectNotFoundException, IOException, NotAGitRepositoryException {
        log.debug("Getting file diff for '{}' in project '{}'", filePath, projectName);
        try (Git git = openGit(projectName)) {
            Repository repo = git.getRepository();

            String oldContent = normalizeLineEndings(readHeadVersion(repo, filePath));
            String newContent = normalizeLineEndings(readWorkingVersion(repo, filePath));

            List<GitHunkDTO> hunks = computeHunks(oldContent, newContent);
            log.debug("Computed {} hunks for file '{}'", hunks.size(), filePath);

            return new GitFileDiffDTO(filePath, oldContent, newContent, hunks);
        }
    }

    /**
     * Stages a file by adding it to the git index if it exists in the working tree, or removing it from the index if it has been deleted. This method uses JGit to perform the add or remove operation based on the presence of the file in the working directory, allowing for both new files and deleted files to be staged appropriately. It handles exceptions related to repository access and git operations, and logs relevant information for debugging purposes.
     */
    public void stageFile(String projectName, String filePath)
            throws ProjectNotFoundException, IOException, NotAGitRepositoryException, GitOperationException {
        log.debug("Staging file '{}' in project '{}'", filePath, projectName);
        try (Git git = openGit(projectName)) {
            Path workingFile = safeResolvePath(git.getRepository(), filePath);
            if (Files.exists(workingFile)) {
                git.add().addFilepattern(filePath).call();
            } else {
                git.rm().addFilepattern(filePath).call();
            }
        } catch (GitAPIException e) {
            log.error("Failed to stage file '{}' in project '{}'", filePath, projectName, e);
            throw new GitOperationException("Failed to stage file: " + filePath, e);
        }
    }

    /**
     * Unstages a file by performing a mixed reset on the specified file path, which effectively removes the file from the staging area while keeping the changes in the working directory. This allows users to unstage a file without losing their modifications. The method uses JGit to execute the reset command and handles exceptions related to repository access and git operations, logging relevant information for debugging purposes.
     */
    public void unstageFile(String projectName, String filePath)
            throws ProjectNotFoundException, IOException, NotAGitRepositoryException, GitOperationException {
        log.debug("Unstaging file '{}' in project '{}'", filePath, projectName);
        try (Git git = openGit(projectName)) {
            git.reset().addPath(filePath).call();
        } catch (GitAPIException e) {
            log.error("Failed to unstage file '{}' in project '{}'", filePath, projectName, e);
            throw new GitOperationException("Failed to unstage file: " + filePath, e);
        }
    }

    /**
     * Stages specific hunks of a file by computing the diff between the HEAD version and the working tree version, applying only the selected hunks to create a patched version of the file, and then writing that patched content directly to the git index. This allows for partial staging of changes at the hunk level, rather than staging the entire file. The method handles exceptions related to repository access and git operations, and logs relevant information for debugging purposes.
     */
    public void stageHunks(String projectName, String filePath, List<Integer> hunkIndices)
            throws ProjectNotFoundException, IOException, NotAGitRepositoryException {
        log.debug("Staging hunks {} for file '{}' in project '{}'", hunkIndices, filePath, projectName);
        try (Git git = openGit(projectName)) {
            Repository repo = git.getRepository();

            String headContent = normalizeLineEndings(readHeadVersion(repo, filePath));
            String workingContent = normalizeLineEndings(readWorkingVersion(repo, filePath));

            List<GitHunkDTO> allHunks = computeHunks(headContent, workingContent);
            log.debug("Found {} total hunks, staging {} of them", allHunks.size(), hunkIndices.size());

            String patchedContent = applySelectedHunks(headContent, workingContent, allHunks, hunkIndices);
            writeToIndex(repo, filePath, patchedContent);
        }
    }

    /**
     * Creates a new git commit for the specified project with the given commit message. It uses JGit to perform the commit operation, and then constructs a GitCommitResultDTO containing the commit ID, full message, author name, and timestamp of the commit. The method handles exceptions related to repository access and git operations, and logs relevant information for debugging purposes.
     */
    public GitCommitResultDTO commit(String projectName, String message)
            throws ProjectNotFoundException, IOException, NotAGitRepositoryException, GitOperationException {
        log.debug("Creating commit in project '{}' with message: '{}'", projectName, message);
        try (Git git = openGit(projectName)) {
            RevCommit commit = git.commit()
                    .setMessage(message)
                    .setSign(false)
                    .setNoVerify(true)
                    .call();
            PersonIdent author = commit.getAuthorIdent();
            String shortId = commit.getId().abbreviate(SHORT_ID_LENGTH).name();
            log.info("Commit created: {} by {} - '{}'", shortId, author.getName(), message);
            return new GitCommitResultDTO(
                    commit.getId().getName(),
                    commit.getFullMessage(),
                    author.getName(),
                    author.getWhenAsInstant().toEpochMilli());
        } catch (GitAPIException e) {
            log.error("Failed to commit in project '{}': {}", projectName, e.getMessage(), e);
            throw new GitOperationException("Failed to commit", e);
        }
    }

    /**
     * Performs a git push operation for the specified project, using JGit to push changes to the remote repository. It applies credentials if a token is provided, and then analyzes the PushResult to determine if the push was successful and constructs a user-friendly message summarizing the outcome of the push for each ref update. The method returns a GitPushResultDTO indicating whether the push was successful overall and includes a descriptive message for the user.
     */
    public GitPushResultDTO push(String projectName, String token)
            throws ProjectNotFoundException, IOException, NotAGitRepositoryException, GitOperationException {
        log.debug("Pushing changes for project '{}'", projectName);
        String effectiveToken = resolveToken(projectName, token);
        try (Git git = openGit(projectName)) {
            PushCommand pushCommand = git.push();
            applyCredentials(pushCommand, git.getRepository(), effectiveToken);

            Iterable<PushResult> results = pushCommand.call();
            return buildPushResult(projectName, results);
        } catch (GitAPIException e) {
            log.error("Failed to push for project '{}': {}", projectName, e.getMessage(), e);
            String message = !fileSystemStorage.isLocalEnvironment()
                    ? "Push failed — check your Personal Access Token (PAT) input"
                    : "Failed to push";
            throw new GitOperationException(message, e);
        }
    }

    /**
     * Performs a git pull operation for the specified project, using JGit to fetch and merge changes from the remote repository. It applies credentials if a token is provided, and then analyzes the PullResult to determine if the pull was successful, if there were merge conflicts, and how many refs were updated. The method returns a GitPullResultDTO containing this information in a user-friendly format.
     */
    public GitPullResultDTO pull(String projectName, String token)
            throws ProjectNotFoundException, IOException, NotAGitRepositoryException, GitOperationException {
        log.debug("Pulling changes for project '{}'", projectName);
        String effectiveToken = resolveToken(projectName, token);
        try (Git git = openGit(projectName)) {
            PullCommand pullCommand = git.pull();
            applyCredentials(pullCommand, git.getRepository(), effectiveToken);

            PullResult result = pullCommand.call();
            return buildPullResult(projectName, result);
        } catch (GitAPIException e) {
            log.error("Failed to pull for project '{}': {}", projectName, e.getMessage(), e);
            String message = !fileSystemStorage.isLocalEnvironment()
                    ? "Pull failed — check your Personal Access Token (PAT) input"
                    : "Failed to pull";
            throw new GitOperationException(message, e);
        }
    }

    /**
     * Retrieves the git log for the specified project, returning a list of GitLogEntryDTO objects representing the most recent commits. It uses JGit to access the repository and fetch the commit history, mapping each RevCommit to a GitLogEntryDTO that includes the full commit ID, abbreviated short ID, commit message, author name, and commit timestamp. The method handles exceptions related to repository access and logs relevant information for debugging purposes.
     */
    public List<GitLogEntryDTO> getLog(String projectName, int count)
            throws ProjectNotFoundException, IOException, NotAGitRepositoryException, GitOperationException {
        log.debug("Getting git log for project '{}' (count: {})", projectName, count);
        try (Git git = openGit(projectName)) {
            Iterable<RevCommit> commits = git.log().setMaxCount(count).call();

            List<GitLogEntryDTO> entries = StreamSupport.stream(commits.spliterator(), false)
                    .map(commit -> {
                        PersonIdent author = commit.getAuthorIdent();
                        return new GitLogEntryDTO(
                                commit.getId().getName(),
                                commit.getId().abbreviate(SHORT_ID_LENGTH).name(),
                                commit.getShortMessage(),
                                author.getName(),
                                author.getWhenAsInstant().toEpochMilli());
                    })
                    .toList();

            log.debug("Returning {} log entries for project '{}'", entries.size(), projectName);
            return entries;
        } catch (GitAPIException e) {
            log.error("Failed to get log for project '{}': {}", projectName, e.getMessage(), e);
            throw new GitOperationException("Failed to get log", e);
        }
    }

    /**
     * Resolves credentials and applies them to the given PushCommand. It uses the GitCredentialHelper to determine the appropriate credentials based on the repository configuration and the provided token. If credentials are found, they are set on the PushCommand to enable authenticated pushes to remote repositories that require it.
     * Uses the explicit token if provided, otherwise falls back to the project's stored clone token.
     **/
    private String resolveToken(String projectName, String explicitToken) {
        if (explicitToken != null && !explicitToken.isBlank()) {
            return explicitToken;
        }
        try {
            return projectService.getProject(projectName).getGitToken();
        } catch (ProjectNotFoundException e) {
            return null;
        }
    }

    private void applyCredentials(PushCommand command, Repository repo, String token) {
        CredentialsProvider credentials =
                GitCredentialHelper.resolve(repo, token, fileSystemStorage.isLocalEnvironment());
        if (credentials != null) {
            command.setCredentialsProvider(credentials);
        }
    }

    /**
     * Resolves credentials and applies them to the given PullCommand. It uses the GitCredentialHelper to determine the appropriate credentials based on the repository configuration and the provided token. If credentials are found, they are set on the PullCommand to enable authenticated pulls from remote repositories that require it.
     */
    private void applyCredentials(PullCommand command, Repository repo, String token) {
        CredentialsProvider credentials =
                GitCredentialHelper.resolve(repo, token, fileSystemStorage.isLocalEnvironment());
        if (credentials != null) {
            command.setCredentialsProvider(credentials);
        }
    }

    /**
     * Builds a GitPushResultDTO by analyzing the results of a push operation. It collects all RemoteRefUpdate objects from the push results, checks if all updates were successful (OK or UP_TO_DATE), and constructs a user-friendly message summarizing the outcome of the push for each ref. The final GitPushResultDTO indicates whether the push was successful overall and includes a descriptive message for the user.
     * @param projectName the name of the project for logging purposes
     * @param results the iterable of PushResult objects returned by JGit after performing the push operation, which contains details about the status of each ref update
     * @return a GitPushResultDTO containing the overall success status of the push and a message summarizing the results for each ref update, suitable for displaying to the user
     */
    private GitPushResultDTO buildPushResult(String projectName, Iterable<PushResult> results) {
        List<RemoteRefUpdate> allUpdates = StreamSupport.stream(results.spliterator(), false)
                .flatMap(result -> result.getRemoteUpdates().stream())
                .toList();

        boolean allOk = allUpdates.stream()
                .allMatch(update -> update.getStatus() == RemoteRefUpdate.Status.OK
                        || update.getStatus() == RemoteRefUpdate.Status.UP_TO_DATE);

        String message = allUpdates.stream().map(this::formatPushUpdate).collect(Collectors.joining("; "));

        if (message.isEmpty()) {
            message = "Push completed";
        }

        log.info("Push result for '{}': success={}, message='{}'", projectName, allOk, message);
        return new GitPushResultDTO(allOk, message);
    }

    /**
     * Formats a user-friendly message for a RemoteRefUpdate based on its status. It extracts the branch name from the remote ref and then uses a switch statement to generate a descriptive message for each possible status, such as "Pushed to main" for OK, "main is already up to date" for UP_TO_DATE, and specific rejection reasons for non-fast-forward or remote changes. This helps provide clear feedback to the user about the outcome of their push operation.
     * @param update the RemoteRefUpdate object representing the result of a push operation for a specific ref
     * @return a formatted message describing the result of the push for that ref, suitable for displaying to the user
     */
    private String formatPushUpdate(RemoteRefUpdate update) {
        String refName = update.getRemoteName().replace("refs/heads/", "");
        return switch (update.getStatus()) {
            case OK -> "Pushed to " + refName;
            case UP_TO_DATE -> refName + " is already up to date";
            case REJECTED_NONFASTFORWARD -> "Push rejected: " + refName + " requires pull first";
            case REJECTED_REMOTE_CHANGED -> "Push rejected: remote ref changed for " + refName;
            default -> refName + ": " + update.getStatus();
        };
    }

    /**
     * Builds a GitPullResultDTO based on the PullResult from JGit, analyzing the merge status, conflicts, and fetch results to create a user-friendly message. It checks if the pull was successful, whether there were merge conflicts, and how many refs were updated during the fetch. The resulting message summarizes the outcome of the pull operation in a clear way.
     * @param projectName the name of the project for logging purposes
     * @param result the PullResult returned by JGit after performing the pull operation
     * @return a GitPullResultDTO containing the success status, a descriptive message, and whether there were merge conflicts
     */
    private GitPullResultDTO buildPullResult(String projectName, PullResult result) {
        boolean success = result.isSuccessful();

        if (result.getMergeResult() == null) {
            return new GitPullResultDTO(success, success ? "Pull completed" : "Pull failed", false);
        }

        MergeResult.MergeStatus mergeStatus = result.getMergeResult().getMergeStatus();
        boolean hasConflicts = mergeStatus == MergeResult.MergeStatus.CONFLICTING;

        FetchResult fetchResult = result.getFetchResult();
        int updatedRefs =
                fetchResult != null ? fetchResult.getTrackingRefUpdates().size() : 0;

        String message = formatMergeStatus(mergeStatus, updatedRefs, result);

        log.info(
                "Pull result for '{}': success={}, hasConflicts={}, message='{}'",
                projectName,
                success,
                hasConflicts,
                message);
        return new GitPullResultDTO(success, message, hasConflicts);
    }

    private String formatMergeStatus(MergeResult.MergeStatus mergeStatus, int updatedRefs, PullResult result) {
        return switch (mergeStatus) {
            case ALREADY_UP_TO_DATE -> "Already up to date";
            case FAST_FORWARD ->
                String.format("Fast-forwarded (%d ref%s updated)", updatedRefs, updatedRefs != 1 ? "s" : "");
            case MERGED -> "Merged successfully";
            case CONFLICTING ->
                String.format(
                        "Pulled with %d conflicting file(s)",
                        result.getMergeResult().getConflicts().size());
            case FAILED -> "Pull failed: merge could not be performed";
            case ABORTED -> "Pull aborted";
            case NOT_SUPPORTED -> "Merge strategy not supported";
            default -> mergeStatus.toString();
        };
    }

    /**
     * Computes hunks using a line-by-line Myers diff on normalized (LF) strings.
     * Uses WS_IGNORE_ALL so that indentation/formatting changes don't merge
     * separate content changes into one giant chunk.
     */
    private List<GitHunkDTO> computeHunks(String oldContent, String newContent) {
        RawText oldText = new RawText(oldContent.getBytes(StandardCharsets.UTF_8));
        RawText newText = new RawText(newContent.getBytes(StandardCharsets.UTF_8));

        List<Edit> edits = MyersDiff.INSTANCE.diff(RawTextComparator.WS_IGNORE_ALL, oldText, newText).stream()
                .filter(edit -> edit.getType() != Edit.Type.EMPTY)
                .toList();

        log.debug(
                "Myers diff produced {} edits (old={} lines, new={} lines)",
                edits.size(),
                oldText.size(),
                newText.size());

        return IntStream.range(0, edits.size())
                .mapToObj(index -> buildHunkFromEdit(index, edits.get(index), oldText, newText))
                .toList();
    }

    /**
     * Builds a GitHunkDTO from a Myers Edit object, converting the edit's line ranges into a unified hunk format with a header and content. The content is prefixed with '-' for removed lines and '+' for added lines, following standard diff conventions. The header includes the old and new line numbers and counts in the format "@@ -oldStart,oldCount +newStart,newCount @@".
     * @param index the index of the edit in the list of edits (used for identifying the hunk)
     * @param edit the Myers Edit object representing a contiguous change between the old and new texts
     * @param oldText the RawText representation of the old content (HEAD version)
     * @param newText the RawText representation of the new content (working tree version)
     * @return a GitHunkDTO containing the index, header, content, and line number/count information for the hunk represented by the edit
     */
    private GitHunkDTO buildHunkFromEdit(int index, Edit edit, RawText oldText, RawText newText) {
        int oldStart = edit.getBeginA() + 1;
        int oldCount = edit.getLengthA();
        int newStart = edit.getBeginB() + 1;
        int newCount = edit.getLengthB();

        String content = Stream.concat(
                        IntStream.range(edit.getBeginA(), edit.getEndA()).mapToObj(i -> "-" + oldText.getString(i)),
                        IntStream.range(edit.getBeginB(), edit.getEndB()).mapToObj(i -> "+" + newText.getString(i)))
                .collect(Collectors.joining("\n", "", "\n"));

        String header = String.format("@@ -%d,%d +%d,%d @@", oldStart, oldCount, newStart, newCount);
        return new GitHunkDTO(index, header, content, oldStart, oldCount, newStart, newCount);
    }

    /**
     * Applies selected hunks to produce a patched version of the HEAD content.
     * Unselected hunks keep the HEAD version; selected hunks take the working-tree lines.
     */
    private String applySelectedHunks(
            String headContent, String workingContent, List<GitHunkDTO> allHunks, List<Integer> selectedIndices) {

        Set<Integer> selected = new HashSet<>(selectedIndices);
        if (selected.containsAll(allHunks.stream().map(GitHunkDTO::index).toList())) {
            log.debug("All hunks selected, using working content directly");
            return workingContent;
        }

        String[] workingLines = workingContent.split("\n", -1);
        List<String> result = new ArrayList<>(Arrays.asList(headContent.split("\n", -1)));
        int offset = 0;

        for (GitHunkDTO hunk : allHunks) {
            if (!selected.contains(hunk.index())) {
                continue;
            }

            int adjustedStart = hunk.oldStart() - 1 + offset;

            for (int remaining = hunk.oldCount(); remaining > 0 && adjustedStart < result.size(); remaining--) {
                result.remove(adjustedStart);
            }

            int newStart = hunk.newStart() - 1;
            List<String> newLines = Arrays.stream(
                            workingLines, newStart, Math.min(newStart + hunk.newCount(), workingLines.length))
                    .toList();
            result.addAll(adjustedStart, newLines);

            offset += hunk.newCount() - hunk.oldCount();

            log.trace(
                    "Applied hunk {}: old @{} ({} lines) -> new @{} ({} lines), offset={}",
                    hunk.index(),
                    hunk.oldStart(),
                    hunk.oldCount(),
                    hunk.newStart(),
                    hunk.newCount(),
                    offset);
        }

        return String.join("\n", result);
    }

    /**
     * Reads the content of the specified file from the working tree. If the file does not exist in the working tree, returns an empty string. This is used to get the "new" version of the file for diffing and hunk staging.
     * @param repo the Git repository to read from
     * @param filePath the path of the file to read (relative to the repository root)
     * @return the content of the file in the working tree, or an empty string if the file does not exist
     * @throws IOException if an I/O error occurs while reading the file from the working tree
     */
    private String readWorkingVersion(Repository repo, String filePath) throws IOException {
        Path workingFile = safeResolvePath(repo, filePath);
        return Files.exists(workingFile) ? Files.readString(workingFile, StandardCharsets.UTF_8) : "";
    }

    /**
     * Reads the content of the specified file as it exists in the HEAD commit. If the file does not exist in HEAD, returns an empty string. This is used to get the "old" version of the file for diffing and hunk staging.
     * @param repo the Git repository to read from
     * @param filePath the path of the file to read (relative to the repository root)
     * @return the content of the file in the HEAD commit, or an empty string if the file does not exist in HEAD
     * @throws IOException if an I/O error occurs while reading from the repository
     */
    private String readHeadVersion(Repository repo, String filePath) throws IOException {
        Ref head = repo.exactRef(Constants.HEAD);
        if (head == null || head.getObjectId() == null) {
            return "";
        }

        try (RevWalk revWalk = new RevWalk(repo)) {
            RevCommit headCommit = revWalk.parseCommit(head.getObjectId());
            RevTree tree = headCommit.getTree();

            try (TreeWalk treeWalk = new TreeWalk(repo)) {
                treeWalk.addTree(tree);
                treeWalk.setRecursive(true);
                treeWalk.setFilter(PathFilter.create(filePath));

                if (!treeWalk.next()) {
                    return "";
                }

                ObjectId objectId = treeWalk.getObjectId(0);
                return new String(repo.open(objectId).getBytes(), StandardCharsets.UTF_8);
            }
        }
    }

    /**
     * Normalizes line endings to LF for consistent diffing, since JGit's MyersDiff operates on lines and we want to avoid spurious edits due to CRLF vs LF differences.
     * @param text the input text to normalize
     * @return the text with all line endings normalized to LF (\n)
     */
    private static String normalizeLineEndings(String text) {
        return text.replace("\r\n", "\n").replace("\r", "\n");
    }

    /**
     * Merges multiple sets of file paths into a single list of unique paths. This is used to combine the various categories of changed files (added, modified, removed) into a single "staged" or "modified" list without duplicates.
     * @param sets varargs of sets containing file paths (e.g., added, changed, removed)
     * @return a list of unique file paths merged from all input sets, preserving the order they were encountered
     */
    @SafeVarargs
    private static List<String> mergeUnique(Set<String>... sets) {
        return Stream.of(sets).flatMap(Set::stream).distinct().toList();
    }

    /**
     * Writes the given content to the Git index for the specified file path. This is used for staging changes at the hunk level.
     * @param repo the Git repository to write to
     * @param filePath the path of the file to stage (relative to the repository root)
     * @param content the content to write to the index (should be the patched version of the file with selected hunks applied)
     * @throws IOException if an I/O error occurs while writing to the index
     */
    private void writeToIndex(Repository repo, String filePath, String content) throws IOException {
        log.debug("Writing {} bytes to index for '{}'", content.length(), filePath);
        try (ObjectInserter inserter = repo.newObjectInserter()) {
            ObjectId blobId = inserter.insert(Constants.OBJ_BLOB, content.getBytes(StandardCharsets.UTF_8));
            inserter.flush();

            DirCache dirCache = repo.lockDirCache();
            try {
                DirCacheBuilder builder = dirCache.builder();

                IntStream.range(0, dirCache.getEntryCount())
                        .mapToObj(dirCache::getEntry)
                        .filter(entry -> !entry.getPathString().equals(filePath))
                        .forEach(builder::add);

                DirCacheEntry newEntry = new DirCacheEntry(filePath);
                newEntry.setObjectId(blobId);
                newEntry.setFileMode(FileMode.REGULAR_FILE);
                builder.add(newEntry);

                builder.finish();
                dirCache.write();
                dirCache.commit();
            } finally {
                dirCache.unlock();
            }
        }
    }

    /**
     * Resolves the absolute path to the project's root directory based on the project name.
     * @param projectName the name of the project whose path to resolve
     * @return the absolute Path to the project's root directory
     * @throws ProjectNotFoundException if the project with the given name does not exist
     * @throws IOException if an I/O error occurs while resolving the path
     */
    private Path getProjectPath(String projectName) throws ProjectNotFoundException, IOException {
        String rootPath = projectService.getProject(projectName).getRootPath();
        return fileSystemStorage.toAbsolutePath(rootPath);
    }

    /**
     * Opens the Git repository for the given project name. Validates that the .git directory exists.
     * @param projectName the name of the project whose Git repository to open
     * @return a Git instance for the project's repository
     * @throws ProjectNotFoundException if the project does not exist
     * @throws IOException if an I/O error occurs while accessing the project directory
     * @throws NotAGitRepositoryException if the project directory is not a Git repository (i.e., missing .git folder)
     */
    private Git openGit(String projectName) throws ProjectNotFoundException, IOException, NotAGitRepositoryException {
        Path projectPath = getProjectPath(projectName);
        if (!Files.isDirectory(projectPath.resolve(".git"))) {
            throw new NotAGitRepositoryException(projectName);
        }
        Git git = Git.open(projectPath.toFile());
        hardenRepository(git.getRepository());
        return git;
    }

    /**
     * Hardens a repository's configuration to prevent the execution of unwanted or malicious scripts.
     *
     * disables all git hooks (pre-commit, post-checkout, etc.).
     * prevents symlinks that could escape the repo root.
     *
     * These settings are written to the repo's local {.git/config} and do not affect the
     * remote repository or the user's project files.
     */
    public static void hardenRepository(Repository repo) throws IOException {
        StoredConfig config = repo.getConfig();
        config.setString("core", null, "hooksPath", "/dev/null");
        config.setBoolean("core", null, "symlinks", false);

        for (String subsection : config.getSubsections("filter")) {
            config.unsetSection("filter", subsection);
        }

        config.save();
    }

    /**
     * Safely resolves a user-provided file path against the repository working tree,
     * ensuring the result stays within the repo root to prevent path traversal attacks.
     */
    private Path safeResolvePath(Repository repo, String filePath) {
        Path repoRoot = repo.getWorkTree().toPath().normalize();
        Path resolved = repoRoot.resolve(filePath).normalize();
        if (!resolved.startsWith(repoRoot)) {
            throw new SecurityException("Invalid path: outside repository directory");
        }
        return resolved;
    }
}
