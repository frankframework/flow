package org.frankframework.flow.security;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.Base64;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

@ExtendWith(MockitoExtension.class)
class UserContextFilterTest {

    private UserContextFilter filter;
    private UserWorkspaceContext userWorkspaceContext;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Mock
    private FilterChain filterChain;

    @BeforeEach
    void setUp() {
        userWorkspaceContext = new UserWorkspaceContext();
        filter = new UserContextFilter(userWorkspaceContext, objectMapper);
    }

    @Test
    void extractsUserIdFromJwtSubClaim() throws IOException, ServletException {
        MockHttpServletRequest request = new MockHttpServletRequest();
        MockHttpServletResponse response = new MockHttpServletResponse();

        String payload = Base64.getUrlEncoder()
                .withoutPadding()
                .encodeToString("{\"sub\":\"user123\"}".getBytes(StandardCharsets.UTF_8));
        String jwt = "header." + payload + ".signature";
        request.addHeader("Authorization", "Bearer " + jwt);

        filter.doFilter(request, response, filterChain);

        assertTrue(userWorkspaceContext.isInitialized());
        assertEquals("user123", userWorkspaceContext.getWorkspaceId());
        verify(filterChain).doFilter(request, response);
    }

    @Test
    void extractsUserIdFromJwtPreferredUsernameClaim() throws IOException, ServletException {
        MockHttpServletRequest request = new MockHttpServletRequest();
        MockHttpServletResponse response = new MockHttpServletResponse();

        String payload = Base64.getUrlEncoder()
                .withoutPadding()
                .encodeToString("{\"preferred_username\":\"jdoe\"}".getBytes(StandardCharsets.UTF_8));
        String jwt = "header." + payload + ".signature";
        request.addHeader("Authorization", "Bearer " + jwt);

        filter.doFilter(request, response, filterChain);

        assertTrue(userWorkspaceContext.isInitialized());
        assertEquals("jdoe", userWorkspaceContext.getWorkspaceId());
    }

    @Test
    void usesSessionIdWhenNoJwt() throws IOException, ServletException {
        MockHttpServletRequest request = new MockHttpServletRequest();
        MockHttpServletResponse response = new MockHttpServletResponse();

        request.addHeader("X-Workspace-ID", "my-session-123");

        filter.doFilter(request, response, filterChain);

        assertTrue(userWorkspaceContext.isInitialized());
        assertTrue(userWorkspaceContext.getWorkspaceId().startsWith("anon-"));
        assertEquals(5 + 16, userWorkspaceContext.getWorkspaceId().length()); // "anon-" + 16 hex chars
    }

    @Test
    void defaultsToAnonymousWithoutHeaders() throws IOException, ServletException {
        MockHttpServletRequest request = new MockHttpServletRequest();
        MockHttpServletResponse response = new MockHttpServletResponse();

        filter.doFilter(request, response, filterChain);

        assertTrue(userWorkspaceContext.isInitialized());
        assertEquals("anonymous", userWorkspaceContext.getWorkspaceId());
    }

    @Test
    void skipsInitializationWhenAlreadyInitialized() throws IOException, ServletException {
        userWorkspaceContext.initialize("pre-set-id");

        MockHttpServletRequest request = new MockHttpServletRequest();
        MockHttpServletResponse response = new MockHttpServletResponse();
        request.addHeader("Authorization", "Bearer invalid");

        filter.doFilter(request, response, filterChain);

        assertEquals("pre-set-id", userWorkspaceContext.getWorkspaceId());
    }

    @Test
    void handlesInvalidJwtGracefully() throws IOException, ServletException {
        MockHttpServletRequest request = new MockHttpServletRequest();
        MockHttpServletResponse response = new MockHttpServletResponse();
        request.addHeader("Authorization", "Bearer not-a-valid-jwt");

        filter.doFilter(request, response, filterChain);

        assertTrue(userWorkspaceContext.isInitialized());
        assertEquals("anonymous", userWorkspaceContext.getWorkspaceId());
    }

    @Test
    void sanitizesSpecialCharactersInUserId() throws IOException, ServletException {
        MockHttpServletRequest request = new MockHttpServletRequest();
        MockHttpServletResponse response = new MockHttpServletResponse();

        String payload = Base64.getUrlEncoder()
                .withoutPadding()
                .encodeToString("{\"sub\":\"user!@#$%^&\"}".getBytes(StandardCharsets.UTF_8));
        String jwt = "header." + payload + ".signature";
        request.addHeader("Authorization", "Bearer " + jwt);

        filter.doFilter(request, response, filterChain);

        String workspaceId = userWorkspaceContext.getWorkspaceId();
        assertTrue(workspaceId.matches("[a-zA-Z0-9.@_-]+"));
    }

    @Test
    void handlesBlankSessionId() throws IOException, ServletException {
        MockHttpServletRequest request = new MockHttpServletRequest();
        MockHttpServletResponse response = new MockHttpServletResponse();
        request.addHeader("X-Workspace-ID", "   ");

        filter.doFilter(request, response, filterChain);

        assertEquals("anonymous", userWorkspaceContext.getWorkspaceId());
    }

    @Test
    void handlesJwtWithOnlyOnePartGracefully() throws IOException, ServletException {
        MockHttpServletRequest request = new MockHttpServletRequest();
        MockHttpServletResponse response = new MockHttpServletResponse();
        request.addHeader("Authorization", "Bearer singlepart");

        filter.doFilter(request, response, filterChain);

        assertEquals("anonymous", userWorkspaceContext.getWorkspaceId());
    }

    @Test
    void chainIsAlwaysCalled() throws IOException, ServletException {
        MockHttpServletRequest request = new MockHttpServletRequest();
        MockHttpServletResponse response = new MockHttpServletResponse();

        filter.doFilter(request, response, filterChain);

        verify(filterChain).doFilter(request, response);
    }

    @Test
    void consistentSessionHashing() throws IOException, ServletException {
        MockHttpServletRequest request1 = new MockHttpServletRequest();
        MockHttpServletResponse response1 = new MockHttpServletResponse();
        request1.addHeader("X-Workspace-ID", "same-session");
        filter.doFilter(request1, response1, filterChain);
        String firstId = userWorkspaceContext.getWorkspaceId();

        // Create a fresh context for the second request
        UserWorkspaceContext ctx2 = new UserWorkspaceContext();
        UserContextFilter filter2 = new UserContextFilter(ctx2, objectMapper);
        MockHttpServletRequest request2 = new MockHttpServletRequest();
        MockHttpServletResponse response2 = new MockHttpServletResponse();
        request2.addHeader("X-Workspace-ID", "same-session");
        filter2.doFilter(request2, response2, filterChain);

        assertEquals(firstId, ctx2.getWorkspaceId());
    }
}
