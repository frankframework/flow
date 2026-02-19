package org.frankframework.flow.git;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.io.OutputStreamWriter;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.concurrent.TimeUnit;
import lombok.extern.slf4j.Slf4j;
import org.eclipse.jgit.lib.Repository;
import org.eclipse.jgit.transport.CredentialsProvider;
import org.eclipse.jgit.transport.UsernamePasswordCredentialsProvider;

/**
 * Resolves credentials for git operations.
 *
 * <ul>
 *   <li><b>Cloud / production</b>: only explicit PAT tokens are used. The system
 *       credential helper is never invoked — there is no shared credential store
 *       across visitors.</li>
 *   <li><b>Local development</b>: if no explicit token is provided, falls back to
 *       the developer's own {@code git credential fill} (Git Credential Manager,
 *       macOS Keychain, etc.). Git may or may not be installed.</li>
 * </ul>
 *
 * <p>To satisfy SonarQube S4036, the git executable is resolved to an absolute
 * path before being passed to {@link ProcessBuilder}. Resolution is lazy — it
 * only happens when a local user actually triggers a credential lookup.
 */
@Slf4j
public final class GitCredentialHelper {

    private static final long PROCESS_TIMEOUT_SECONDS = 10;

    private static volatile String gitExecutable;
    private static volatile boolean gitResolved;

    private GitCredentialHelper() {}

    /**
     * Resolves credentials for git operations using a fallback chain:
     * If a token is explicitly provided, use it directly.
     * For local environments only, try the system git credential helper.
     * Return null if nothing works (JGit will fail with an auth error).
     */
    public static CredentialsProvider resolve(Repository repo, String explicitToken, boolean isLocalEnvironment) {
        if (explicitToken != null && !explicitToken.isBlank()) {
            return new UsernamePasswordCredentialsProvider("token", explicitToken);
        }

        if (isLocalEnvironment && repo != null) {
            return fromRemoteUrl(repo);
        }

        return null;
    }

    /**
     * Resolves credentials for a URL directly (used for clone where no repo exists yet).
     */
    public static CredentialsProvider resolveForUrl(
            String remoteUrl, String explicitToken, boolean isLocalEnvironment) {
        if (explicitToken != null && !explicitToken.isBlank()) {
            return new UsernamePasswordCredentialsProvider("token", explicitToken);
        }

        if (isLocalEnvironment && remoteUrl != null) {
            URI uri = parseGitUri(remoteUrl);
            if (uri != null) {
                return queryGitCredential(uri);
            }
        }

        return null;
    }

    private static CredentialsProvider fromRemoteUrl(Repository repo) {
        try {
            String remoteUrl = repo.getConfig().getString("remote", "origin", "url");
            if (remoteUrl == null || remoteUrl.isBlank()) {
                return null;
            }

            URI uri = parseGitUri(remoteUrl);
            if (uri == null) {
                return null;
            }

            return queryGitCredential(uri);
        } catch (Exception e) {
            log.debug("Could not resolve credentials from system helper: {}", e.getMessage());
            return null;
        }
    }

    private static URI parseGitUri(String remoteUrl) {
        try {
            if (remoteUrl.startsWith("git@")) {
                return null;
            }
            return new URI(remoteUrl);
        } catch (Exception e) {
            log.debug("Could not parse remote URL: {}", remoteUrl);
            return null;
        }
    }

    private static CredentialsProvider queryGitCredential(URI uri) {
        String gitPath = getGitExecutable();
        if (gitPath == null) {
            log.debug("Git executable not found on this system; skipping credential helper");
            return null;
        }

        try {
            ProcessBuilder pb = new ProcessBuilder(gitPath, "credential", "fill");
            pb.redirectErrorStream(false);
            Process process = pb.start();

            String protocol = uri.getScheme() != null ? uri.getScheme() : "https";
            String host = uri.getHost();
            String path = uri.getPath();

            try (OutputStreamWriter writer =
                    new OutputStreamWriter(process.getOutputStream(), StandardCharsets.UTF_8)) {
                writer.write("protocol=" + protocol + "\n");
                writer.write("host=" + host + "\n");
                if (path != null && !path.isEmpty()) {
                    writer.write("path=" + path + "\n");
                }
                writer.write("\n");
                writer.flush();
            }

            if (!process.waitFor(PROCESS_TIMEOUT_SECONDS, TimeUnit.SECONDS)) {
                process.destroyForcibly();
                log.debug("git credential fill timed out");
                return null;
            }

            if (process.exitValue() != 0) {
                log.debug("git credential fill exited with code {}", process.exitValue());
                return null;
            }

            String username = null;
            String password = null;

            try (BufferedReader reader =
                    new BufferedReader(new InputStreamReader(process.getInputStream(), StandardCharsets.UTF_8))) {
                String line;
                while ((line = reader.readLine()) != null) {
                    if (line.startsWith("username=")) {
                        username = line.substring("username=".length());
                    } else if (line.startsWith("password=")) {
                        password = line.substring("password=".length());
                    }
                }
            }

            if (username != null && password != null) {
                log.debug("Resolved credentials from system credential helper for {}", host);
                return new UsernamePasswordCredentialsProvider(username, password);
            }

            return null;
        } catch (InterruptedException e) {
            log.debug("Git credential helper interrupted");
            Thread.currentThread().interrupt();
            return null;
        } catch (Exception e) {
            log.debug("Failed to query system git credential helper: {}", e.getMessage());
            return null;
        }
    }

    /**
     * Lazily resolves the absolute path to the git executable. Only runs once,
     * and only when a local-environment credential lookup actually needs it.
     * On cloud/production this method is never called.
     */
    private static String getGitExecutable() {
        if (!gitResolved) {
            synchronized (GitCredentialHelper.class) {
                if (!gitResolved) {
                    gitExecutable = findGitOnPath();
                    gitResolved = true;
                }
            }
        }
        return gitExecutable;
    }

    /**
     * Searches PATH for the git executable and returns its absolute path.
     * Uses absolute paths in ProcessBuilder to satisfy SonarQube S4036.
     */
    private static String findGitOnPath() {
        boolean isWindows = System.getProperty("os.name", "").toLowerCase().contains("win");
        String[] candidates = isWindows ? new String[] {"git.exe", "git.cmd"} : new String[] {"git"};

        String pathEnv = System.getenv("PATH");
        if (pathEnv == null) {
            log.debug("PATH environment variable not set; git credential helper unavailable");
            return null;
        }

        String separator = isWindows ? ";" : ":";
        for (String dir : pathEnv.split(separator)) {
            Path dirPath = Path.of(dir);
            if (!Files.isDirectory(dirPath)) continue;
            for (String candidate : candidates) {
                Path exe = dirPath.resolve(candidate);
                if (Files.isRegularFile(exe) && Files.isExecutable(exe)) {
                    String absolutePath = exe.toAbsolutePath().toString();
                    log.debug("Resolved git executable: {}", absolutePath);
                    return absolutePath;
                }
            }
        }

        log.debug("Git not found on PATH; credential helper unavailable");
        return null;
    }
}
