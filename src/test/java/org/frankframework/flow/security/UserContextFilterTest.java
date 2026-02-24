package org.frankframework.flow.security;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.Cookie;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.Objects;
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
        request.addHeader("Authorization", "Bearer header." + payload + ".signature");

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
        request.addHeader("Authorization", "Bearer header." + payload + ".signature");

        filter.doFilter(request, response, filterChain);

        assertEquals("jdoe", userWorkspaceContext.getWorkspaceId());
    }

    @Test
    void generatesWorkspaceIdAndStoresInSession() throws IOException, ServletException {
        MockHttpServletRequest request = new MockHttpServletRequest();
        MockHttpServletResponse response = new MockHttpServletResponse();

        filter.doFilter(request, response, filterChain);

        assertTrue(userWorkspaceContext.isInitialized());
        String workspaceId = userWorkspaceContext.getWorkspaceId();
        assertTrue(workspaceId.startsWith("anon-"));
        assertEquals(5 + 16, workspaceId.length());
        assertEquals(
                workspaceId, Objects.requireNonNull(request.getSession(false)).getAttribute("workspaceId"));
    }

    @Test
    void returnsSameWorkspaceIdForSameSession() throws IOException, ServletException {
        MockHttpServletRequest request1 = new MockHttpServletRequest();
        filter.doFilter(request1, new MockHttpServletResponse(), filterChain);
        String firstId = userWorkspaceContext.getWorkspaceId();

        UserWorkspaceContext ctx2 = new UserWorkspaceContext();
        UserContextFilter filter2 = new UserContextFilter(ctx2, objectMapper);
        MockHttpServletRequest request2 = new MockHttpServletRequest();
        request2.setSession(Objects.requireNonNull(request1.getSession(false)));

        filter2.doFilter(request2, new MockHttpServletResponse(), filterChain);

        assertEquals(firstId, ctx2.getWorkspaceId(), "Same session must yield the same workspace ID");
    }

    @Test
    void differentSessionsGetDifferentWorkspaceIds() throws IOException, ServletException {
        MockHttpServletRequest request1 = new MockHttpServletRequest();
        filter.doFilter(request1, new MockHttpServletResponse(), filterChain);
        String id1 = userWorkspaceContext.getWorkspaceId();

        UserWorkspaceContext ctx2 = new UserWorkspaceContext();
        UserContextFilter filter2 = new UserContextFilter(ctx2, objectMapper);
        filter2.doFilter(new MockHttpServletRequest(), new MockHttpServletResponse(), filterChain);

        assertNotEquals(id1, ctx2.getWorkspaceId(), "Different sessions should get different workspace IDs");
    }

    @Test
    void skipsInitializationWhenAlreadyInitialized() throws IOException, ServletException {
        userWorkspaceContext.initialize("pre-set-id");

        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader("Authorization", "Bearer invalid");

        filter.doFilter(request, new MockHttpServletResponse(), filterChain);

        assertEquals("pre-set-id", userWorkspaceContext.getWorkspaceId());
    }

    @Test
    void handlesInvalidJwtGracefully() throws IOException, ServletException {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader("Authorization", "Bearer not-a-valid-jwt");

        filter.doFilter(request, new MockHttpServletResponse(), filterChain);

        assertTrue(userWorkspaceContext.isInitialized());
        assertTrue(
                userWorkspaceContext.getWorkspaceId().startsWith("anon-"),
                "Invalid JWT should fall back to session-based workspace ID");
    }

    @Test
    void sanitizesSpecialCharactersInUserId() throws IOException, ServletException {
        MockHttpServletRequest request = new MockHttpServletRequest();
        String payload = Base64.getUrlEncoder()
                .withoutPadding()
                .encodeToString("{\"sub\":\"user!@#$%^&\"}".getBytes(StandardCharsets.UTF_8));
        request.addHeader("Authorization", "Bearer header." + payload + ".sig");

        filter.doFilter(request, new MockHttpServletResponse(), filterChain);

        assertTrue(userWorkspaceContext.getWorkspaceId().matches("[a-zA-Z0-9.@_-]+"));
    }

    @Test
    void handlesJwtWithOnlyOnePartGracefully() throws IOException, ServletException {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader("Authorization", "Bearer singlepart");

        filter.doFilter(request, new MockHttpServletResponse(), filterChain);

        assertTrue(userWorkspaceContext.getWorkspaceId().startsWith("anon-"));
    }

    @Test
    void renewsSessionCookieOnEveryRequest() throws IOException, ServletException {
        MockHttpServletRequest request1 = new MockHttpServletRequest();
        MockHttpServletResponse response1 = new MockHttpServletResponse();
        filter.doFilter(request1, response1, filterChain);

        Cookie renewedCookie = response1.getCookie("JSESSIONID");
        assertNotNull(renewedCookie, "JSESSIONID cookie should be set");
        assertEquals(86_400, renewedCookie.getMaxAge(), "Cookie should be refreshed to 24 h on every request");

        UserWorkspaceContext ctx2 = new UserWorkspaceContext();
        UserContextFilter filter2 = new UserContextFilter(ctx2, objectMapper);
        MockHttpServletRequest request2 = new MockHttpServletRequest();
        request2.setSession(Objects.requireNonNull(request1.getSession(false)));
        MockHttpServletResponse response2 = new MockHttpServletResponse();
        filter2.doFilter(request2, response2, filterChain);

        Cookie refreshedCookie = response2.getCookie("JSESSIONID");
        assertNotNull(refreshedCookie, "JSESSIONID cookie should be refreshed on the second request too");
        assertEquals(86_400, refreshedCookie.getMaxAge());
    }

    @Test
    void chainIsAlwaysCalled() throws IOException, ServletException {
        MockHttpServletRequest request = new MockHttpServletRequest();
        MockHttpServletResponse response = new MockHttpServletResponse();

        filter.doFilter(request, response, filterChain);

        verify(filterChain).doFilter(request, response);
    }
}
