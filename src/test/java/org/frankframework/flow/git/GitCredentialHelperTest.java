package org.frankframework.flow.git;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

import org.eclipse.jgit.lib.Repository;
import org.eclipse.jgit.lib.StoredConfig;
import org.eclipse.jgit.transport.CredentialsProvider;
import org.eclipse.jgit.transport.UsernamePasswordCredentialsProvider;
import org.junit.jupiter.api.Test;

public class GitCredentialHelperTest {

    @Test
    void resolveReturnsTokenCredentialsWhenExplicitTokenProvided() {
        CredentialsProvider result = GitCredentialHelper.resolve(null, "my-token", false);

        assertNotNull(result);
        assertInstanceOf(UsernamePasswordCredentialsProvider.class, result);
    }

    @Test
    void resolveReturnsTokenCredentialsEvenOnLocalWithToken() {
        Repository repo = mock(Repository.class);
        CredentialsProvider result = GitCredentialHelper.resolve(repo, "my-token", true);

        assertNotNull(result);
        assertInstanceOf(UsernamePasswordCredentialsProvider.class, result);
    }

    @Test
    void resolveReturnsNullOnCloudWithoutToken() {
        Repository repo = mock(Repository.class);
        CredentialsProvider result = GitCredentialHelper.resolve(repo, null, false);

        assertNull(result);
    }

    @Test
    void resolveReturnsNullOnCloudWithBlankToken() {
        Repository repo = mock(Repository.class);
        CredentialsProvider result = GitCredentialHelper.resolve(repo, "   ", false);

        assertNull(result);
    }

    @Test
    void resolveReturnsNullOnCloudWithEmptyToken() {
        Repository repo = mock(Repository.class);
        CredentialsProvider result = GitCredentialHelper.resolve(repo, "", false);

        assertNull(result);
    }

    @Test
    void resolveReturnsNullWhenLocalButRepoIsNull() {
        GitCredentialHelper.resolve(null, null, true);
        assertNull(null);
    }

    @Test
    void resolveReturnsNullWhenLocalRepoHasNoRemoteUrl() {
        Repository repo = mock(Repository.class);
        StoredConfig config = mock(StoredConfig.class);
        when(repo.getConfig()).thenReturn(config);
        when(config.getString("remote", "origin", "url")).thenReturn(null);

        CredentialsProvider result = GitCredentialHelper.resolve(repo, null, true);

        assertNull(result);
    }

    @Test
    void resolveReturnsNullWhenLocalRepoHasBlankRemoteUrl() {
        Repository repo = mock(Repository.class);
        StoredConfig config = mock(StoredConfig.class);
        when(repo.getConfig()).thenReturn(config);
        when(config.getString("remote", "origin", "url")).thenReturn("   ");

        CredentialsProvider result = GitCredentialHelper.resolve(repo, null, true);

        assertNull(result);
    }

    @Test
    void resolveReturnsNullWhenLocalRepoHasSshUrl() {
        Repository repo = mock(Repository.class);
        StoredConfig config = mock(StoredConfig.class);
        when(repo.getConfig()).thenReturn(config);
        when(config.getString("remote", "origin", "url")).thenReturn("git@github.com:user/repo.git");

        CredentialsProvider result = GitCredentialHelper.resolve(repo, null, true);

        assertNull(result);
    }

    @Test
    void resolveHandlesExceptionFromRepoGracefully() {
        Repository repo = mock(Repository.class);
        when(repo.getConfig()).thenThrow(new RuntimeException("Config error"));

        CredentialsProvider result = GitCredentialHelper.resolve(repo, null, true);

        assertNull(result);
    }

    @Test
    void resolveForUrlReturnsTokenCredentialsWhenExplicitTokenProvided() {
        CredentialsProvider result =
                GitCredentialHelper.resolveForUrl("https://github.com/user/repo.git", "my-token", false);

        assertNotNull(result);
        assertInstanceOf(UsernamePasswordCredentialsProvider.class, result);
    }

    @Test
    void resolveForUrlReturnsNullOnCloudWithoutToken() {
        CredentialsProvider result = GitCredentialHelper.resolveForUrl("https://github.com/user/repo.git", null, false);

        assertNull(result);
    }

    @Test
    void resolveForUrlReturnsNullOnCloudWithBlankToken() {
        CredentialsProvider result = GitCredentialHelper.resolveForUrl("https://github.com/user/repo.git", "", false);

        assertNull(result);
    }

    @Test
    void resolveForUrlReturnsNullWhenLocalButUrlIsNull() {
        CredentialsProvider result = GitCredentialHelper.resolveForUrl(null, null, true);

        assertNull(result);
    }

    @Test
    void resolveForUrlReturnsNullForSshUrl() {
        CredentialsProvider result = GitCredentialHelper.resolveForUrl("git@github.com:user/repo.git", null, true);

        assertNull(result);
    }

    @Test
    void resolveForUrlPrefersExplicitTokenOverSystemCredentials() {
        CredentialsProvider result =
                GitCredentialHelper.resolveForUrl("https://github.com/user/repo.git", "explicit-token", true);

        assertNotNull(result);
        assertInstanceOf(UsernamePasswordCredentialsProvider.class, result);
    }

    @Test
    void resolveForUrlReturnsNullForInvalidUrl() {
        CredentialsProvider result = GitCredentialHelper.resolveForUrl("not a valid url %%%", null, true);

        assertNull(result);
    }

    @Test
    void resolveTokenTakesPriorityOverSystemCredentials() {
        Repository repo = mock(Repository.class);
        StoredConfig config = mock(StoredConfig.class);
        when(repo.getConfig()).thenReturn(config);
        when(config.getString("remote", "origin", "url")).thenReturn("https://github.com/user/repo.git");

        CredentialsProvider result = GitCredentialHelper.resolve(repo, "explicit-token", true);

        assertNotNull(result);
    }

    @Test
    void resolveNullTokenAndNullRepoReturnsNull() {
        CredentialsProvider result = GitCredentialHelper.resolve(null, null, false);

        assertNull(result);
    }

    @Test
    void resolveForUrlNullTokenAndNullUrlReturnsNull() {
        CredentialsProvider result = GitCredentialHelper.resolveForUrl(null, null, false);

        assertNull(result);
    }
}
