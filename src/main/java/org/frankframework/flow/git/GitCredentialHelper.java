package org.frankframework.flow.git;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.io.OutputStreamWriter;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.TimeUnit;
import lombok.extern.slf4j.Slf4j;
import org.eclipse.jgit.lib.Repository;
import org.eclipse.jgit.transport.CredentialsProvider;
import org.eclipse.jgit.transport.UsernamePasswordCredentialsProvider;

/**
 * Delegates credential resolution to the system's git credential helper
 * (e.g. Git Credential Manager, macOS Keychain, credential-cache).
 *
 * <p>Calls {@code git credential fill} as a subprocess, which invokes whatever
 * credential helper the user has configured in their git config.
 */
@Slf4j
public final class GitCredentialHelper {

    private static final long PROCESS_TIMEOUT_SECONDS = 10;

    private GitCredentialHelper() {}

    /**
     * Resolves credentials for git operations using a fallback chain:
     * 1. If a token is explicitly provided, use it directly
     * 2. For local environments, try the system git credential helper
     * 3. Return null if nothing works (JGit will fail with auth error)
     *
     * @param repo repository to read the remote URL from (may be null for clone)
     * @param explicitToken user-provided token, or null
     * @param isLocalEnvironment true for local profile
     */
    public static CredentialsProvider resolve(Repository repo, String explicitToken, boolean isLocalEnvironment) {
        if (explicitToken != null && !explicitToken.isBlank()) {
            return new UsernamePasswordCredentialsProvider("token", explicitToken);
        }

        if (isLocalEnvironment && repo != null) {
            CredentialsProvider systemCreds = fromRemoteUrl(repo);
            if (systemCreds != null) {
                return systemCreds;
            }
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
                // ssh git url's wont be handled by git credential helper, so this will skip it.
                return null;
            }
            return new URI(remoteUrl);
        } catch (Exception e) {
            log.debug("Could not parse remote URL: {}", remoteUrl);
            return null;
        }
    }

    private static CredentialsProvider queryGitCredential(URI uri) {
        try {
            ProcessBuilder pb = new ProcessBuilder("git", "credential", "fill");
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
        } catch (Exception e) {
            log.debug("Failed to query system git credential helper: {}", e.getMessage());
            return null;
        }
    }
}
