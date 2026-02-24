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
    void resolveWithTokenOnCloudReturnsCredentials() {
        CredentialsProvider result = GitCredentialHelper.resolve(null, "my-token", false);
        assertNotNull(result);
        assertInstanceOf(UsernamePasswordCredentialsProvider.class, result);
    }

    @Test
    void resolveWithTokenOnLocalReturnsCredentials() {
        Repository repo = mock(Repository.class);
        CredentialsProvider result = GitCredentialHelper.resolve(repo, "my-token", true);
        assertNotNull(result);
    }

    @Test
    void resolveWithTokenAndNullRepoReturnsCredentials() {
        assertNotNull(GitCredentialHelper.resolve(null, "tok", true));
    }

    @Test
    void resolveWithTokenAndNullRepoOnCloudReturnsCredentials() {
        assertNotNull(GitCredentialHelper.resolve(null, "tok", false));
    }

    @Test
    void resolveOnCloudWithNullTokenReturnsNull() {
        assertNull(GitCredentialHelper.resolve(mock(Repository.class), null, false));
    }

    @Test
    void resolveOnCloudWithEmptyTokenReturnsNull() {
        assertNull(GitCredentialHelper.resolve(mock(Repository.class), "", false));
    }

    @Test
    void resolveOnCloudWithBlankTokenReturnsNull() {
        assertNull(GitCredentialHelper.resolve(mock(Repository.class), "   ", false));
    }

    @Test
    void resolveOnCloudWithNullRepoAndNullTokenReturnsNull() {
        assertNull(GitCredentialHelper.resolve(null, null, false));
    }

    @Test
    void resolveLocalNullRepoNullTokenReturnsNull() {
        assertNull(GitCredentialHelper.resolve(null, null, true));
    }

    @Test
    void resolveLocalNullRepoEmptyTokenReturnsNull() {
        assertNull(GitCredentialHelper.resolve(null, "", true));
    }

    @Test
    void resolveLocalWithNullRemoteUrlReturnsNull() {
        Repository repo = mock(Repository.class);
        StoredConfig config = mock(StoredConfig.class);
        when(repo.getConfig()).thenReturn(config);
        when(config.getString("remote", "origin", "url")).thenReturn(null);

        assertNull(GitCredentialHelper.resolve(repo, null, true));
    }

    @Test
    void resolveLocalWithEmptyRemoteUrlReturnsNull() {
        Repository repo = mock(Repository.class);
        StoredConfig config = mock(StoredConfig.class);
        when(repo.getConfig()).thenReturn(config);
        when(config.getString("remote", "origin", "url")).thenReturn("");

        assertNull(GitCredentialHelper.resolve(repo, null, true));
    }

    @Test
    void resolveLocalWithBlankRemoteUrlReturnsNull() {
        Repository repo = mock(Repository.class);
        StoredConfig config = mock(StoredConfig.class);
        when(repo.getConfig()).thenReturn(config);
        when(config.getString("remote", "origin", "url")).thenReturn("   ");

        assertNull(GitCredentialHelper.resolve(repo, null, true));
    }

    @Test
    void resolveLocalWithSshRemoteReturnsNull() {
        Repository repo = mock(Repository.class);
        StoredConfig config = mock(StoredConfig.class);
        when(repo.getConfig()).thenReturn(config);
        when(config.getString("remote", "origin", "url")).thenReturn("git@github.com:user/repo.git");

        assertNull(GitCredentialHelper.resolve(repo, null, true));
    }

    @Test
    void resolveLocalWithSshGitlabRemoteReturnsNull() {
        Repository repo = mock(Repository.class);
        StoredConfig config = mock(StoredConfig.class);
        when(repo.getConfig()).thenReturn(config);
        when(config.getString("remote", "origin", "url")).thenReturn("git@gitlab.com:group/project.git");

        assertNull(GitCredentialHelper.resolve(repo, null, true));
    }

    @Test
    void resolveLocalWithMalformedRemoteUrlReturnsNull() {
        Repository repo = mock(Repository.class);
        StoredConfig config = mock(StoredConfig.class);
        when(repo.getConfig()).thenReturn(config);
        when(config.getString("remote", "origin", "url")).thenReturn("://broken url");

        assertNull(GitCredentialHelper.resolve(repo, null, true));
    }

    @Test
    void resolveLocalWithConfigExceptionReturnsNull() {
        // Exercises: fromRemoteUrl -> catch Exception -> return null
        Repository repo = mock(Repository.class);
        when(repo.getConfig()).thenThrow(new RuntimeException("Config error"));

        assertNull(GitCredentialHelper.resolve(repo, null, true));
    }

    @Test
    void resolveLocalWithNullPointerExceptionReturnsNull() {
        Repository repo = mock(Repository.class);
        when(repo.getConfig()).thenThrow(new NullPointerException());

        assertNull(GitCredentialHelper.resolve(repo, null, true));
    }

    @Test
    void resolveLocalWithHttpsRemoteDoesNotThrow() {
        Repository repo = mock(Repository.class);
        StoredConfig config = mock(StoredConfig.class);
        when(repo.getConfig()).thenReturn(config);
        when(config.getString("remote", "origin", "url"))
                .thenReturn("https://github.com/nonexistent-user-12345/nonexistent-repo.git");

        CredentialsProvider result = GitCredentialHelper.resolve(repo, null, true);
        assertTrue(result == null || result instanceof UsernamePasswordCredentialsProvider);
    }

    @Test
    void resolveLocalWithHttpRemoteDoesNotThrow() {
        Repository repo = mock(Repository.class);
        StoredConfig config = mock(StoredConfig.class);
        when(repo.getConfig()).thenReturn(config);
        when(config.getString("remote", "origin", "url")).thenReturn("http://example.com/repo.git");

        CredentialsProvider result = GitCredentialHelper.resolve(repo, null, true);
        assertTrue(result == null || result instanceof UsernamePasswordCredentialsProvider);
    }

    @Test
    void resolveLocalWithUrlContainingPortDoesNotThrow() {
        Repository repo = mock(Repository.class);
        StoredConfig config = mock(StoredConfig.class);
        when(repo.getConfig()).thenReturn(config);
        when(config.getString("remote", "origin", "url")).thenReturn("https://gitlab.example.com:8443/group/repo.git");

        CredentialsProvider result = GitCredentialHelper.resolve(repo, null, true);
        assertTrue(result == null || result instanceof UsernamePasswordCredentialsProvider);
    }

    @Test
    void resolveLocalWithDeepPathRemoteDoesNotThrow() {
        Repository repo = mock(Repository.class);
        StoredConfig config = mock(StoredConfig.class);
        when(repo.getConfig()).thenReturn(config);
        when(config.getString("remote", "origin", "url")).thenReturn("https://github.com/org/sub/deep/repo.git");

        CredentialsProvider result = GitCredentialHelper.resolve(repo, null, true);
        assertTrue(result == null || result instanceof UsernamePasswordCredentialsProvider);
    }

    @Test
    void resolveLocalWithUrlWithoutPathDoesNotThrow() {
        Repository repo = mock(Repository.class);
        StoredConfig config = mock(StoredConfig.class);
        when(repo.getConfig()).thenReturn(config);
        when(config.getString("remote", "origin", "url")).thenReturn("https://example.com");

        CredentialsProvider result = GitCredentialHelper.resolve(repo, null, true);
        assertTrue(result == null || result instanceof UsernamePasswordCredentialsProvider);
    }

    @Test
    void resolveForUrlWithTokenOnCloudReturnsCredentials() {
        assertNotNull(GitCredentialHelper.resolveForUrl("https://github.com/user/repo.git", "my-token", false));
    }

    @Test
    void resolveForUrlWithTokenOnLocalReturnsCredentials() {
        assertNotNull(GitCredentialHelper.resolveForUrl("https://github.com/user/repo.git", "tok", true));
    }

    @Test
    void resolveForUrlTokenWithSshUrlStillReturnsCredentials() {
        assertNotNull(GitCredentialHelper.resolveForUrl("git@github.com:user/repo.git", "my-pat", true));
    }

    @Test
    void resolveForUrlTokenWithNullUrlReturnsCredentials() {
        assertNotNull(GitCredentialHelper.resolveForUrl(null, "token", false));
    }

    @Test
    void resolveForUrlOnCloudWithNullTokenReturnsNull() {
        assertNull(GitCredentialHelper.resolveForUrl("https://github.com/user/repo.git", null, false));
    }

    @Test
    void resolveForUrlOnCloudWithEmptyTokenReturnsNull() {
        assertNull(GitCredentialHelper.resolveForUrl("https://github.com/user/repo.git", "", false));
    }

    @Test
    void resolveForUrlOnCloudWithNullUrlAndNullTokenReturnsNull() {
        assertNull(GitCredentialHelper.resolveForUrl(null, null, false));
    }

    @Test
    void resolveForUrlLocalWithNullUrlReturnsNull() {
        assertNull(GitCredentialHelper.resolveForUrl(null, null, true));
    }

    @Test
    void resolveForUrlLocalWithSshUrlReturnsNull() {
        assertNull(GitCredentialHelper.resolveForUrl("git@github.com:user/repo.git", null, true));
    }

    @Test
    void resolveForUrlLocalWithSshBitbucketUrlReturnsNull() {
        assertNull(GitCredentialHelper.resolveForUrl("git@bitbucket.org:team/repo.git", null, true));
    }

    @Test
    void resolveForUrlLocalWithMalformedUrlReturnsNull() {
        // Exercises: parseGitUri -> URISyntaxException -> null
        assertNull(GitCredentialHelper.resolveForUrl("not a valid url %%%", null, true));
    }

    @Test
    void resolveForUrlLocalWithBrokenSchemeReturnsNull() {
        assertNull(GitCredentialHelper.resolveForUrl("://broken", null, true));
    }

    @Test
    void resolveForUrlLocalWithSpacesReturnsNull() {
        assertNull(GitCredentialHelper.resolveForUrl("https://example .com/repo", null, true));
    }

    @Test
    void resolveForUrlLocalWithHttpsDoesNotThrow() {
        CredentialsProvider result = GitCredentialHelper.resolveForUrl(
                "https://github.com/nonexistent-user-12345/nonexistent-repo.git", null, true);
        assertTrue(result == null || result instanceof UsernamePasswordCredentialsProvider);
    }

    @Test
    void resolveForUrlLocalWithHttpDoesNotThrow() {
        CredentialsProvider result = GitCredentialHelper.resolveForUrl("http://example.com/repo.git", null, true);
        assertTrue(result == null || result instanceof UsernamePasswordCredentialsProvider);
    }

    @Test
    void resolveForUrlLocalWithPortDoesNotThrow() {
        CredentialsProvider result =
                GitCredentialHelper.resolveForUrl("https://gitlab.example.com:8443/repo.git", null, true);
        assertTrue(result == null || result instanceof UsernamePasswordCredentialsProvider);
    }

    @Test
    void resolveForUrlLocalWithDeepPathDoesNotThrow() {
        CredentialsProvider result =
                GitCredentialHelper.resolveForUrl("https://github.com/org/sub/repo.git", null, true);
        assertTrue(result == null || result instanceof UsernamePasswordCredentialsProvider);
    }

    @Test
    void resolveForUrlLocalWithNoPathDoesNotThrow() {
        CredentialsProvider result = GitCredentialHelper.resolveForUrl("https://example.com", null, true);
        assertTrue(result == null || result instanceof UsernamePasswordCredentialsProvider);
    }

    @Test
    void resolveForUrlLocalWithUserInfoDoesNotThrow() {
        CredentialsProvider result = GitCredentialHelper.resolveForUrl("https://user@github.com/repo.git", null, true);
        assertTrue(result == null || result instanceof UsernamePasswordCredentialsProvider);
    }

    @Test
    void resolveForUrlLocalWithFragmentDoesNotThrow() {
        CredentialsProvider result = GitCredentialHelper.resolveForUrl("https://github.com/repo.git#main", null, true);
        assertTrue(result == null || result instanceof UsernamePasswordCredentialsProvider);
    }

    @Test
    void resolveForUrlLocalWithQueryParamsDoesNotThrow() {
        CredentialsProvider result =
                GitCredentialHelper.resolveForUrl("https://github.com/repo.git?ref=main", null, true);
        assertTrue(result == null || result instanceof UsernamePasswordCredentialsProvider);
    }

    @Test
    void resolveForUrlIsConsistentAcrossMultipleCalls() {
        CredentialsProvider first = GitCredentialHelper.resolveForUrl(
                "https://github.com/nonexistent-user-12345/nonexistent-repo.git", null, true);
        CredentialsProvider second = GitCredentialHelper.resolveForUrl(
                "https://github.com/nonexistent-user-12345/nonexistent-repo.git", null, true);

        assertEquals(first == null, second == null, "Repeated calls should return consistent results");
    }

    @Test
    void resolveIsConsistentAcrossMultipleCalls() {
        Repository repo = mock(Repository.class);
        StoredConfig config = mock(StoredConfig.class);
        when(repo.getConfig()).thenReturn(config);
        when(config.getString("remote", "origin", "url"))
                .thenReturn("https://github.com/nonexistent-user-12345/nonexistent-repo.git");

        CredentialsProvider first = GitCredentialHelper.resolve(repo, null, true);
        CredentialsProvider second = GitCredentialHelper.resolve(repo, null, true);

        assertEquals(first == null, second == null, "Repeated calls should return consistent results");
    }
}
