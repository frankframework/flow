package org.frankframework.flow.security;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.Objects;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

@ExtendWith(MockitoExtension.class)
class UserContextFilterTest {

    private static final String ANON_PREFIX = "anon-";
    private static final int ANON_SUFFIX_LENGTH = 16;
    private static final int SESSION_MAX_AGE = 86_400;

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

    // Builds a Bearer header from a raw JSON payload string
    private String bearerWith(String jsonPayload) {
        String encoded = Base64.getUrlEncoder()
                .withoutPadding()
                .encodeToString(jsonPayload.getBytes(StandardCharsets.UTF_8));
        return "Bearer header." + encoded + ".signature";
    }

    @Nested
    @DisplayName("Workspace ID resolution")
    class WorkspaceIdResolution {

        @Test
        @DisplayName("Extracts workspace ID from JWT 'sub' claim")
        void subClaim() throws IOException, ServletException {
            MockHttpServletRequest request = new MockHttpServletRequest();
            request.addHeader("Authorization", bearerWith("{\"sub\":\"user123\"}"));

            filter.doFilter(request, new MockHttpServletResponse(), filterChain);

            assertEquals("user123", userWorkspaceContext.getWorkspaceId());
        }

        @Test
        @DisplayName("Falls back to 'preferred_username' when 'sub' is absent")
        void preferredUsernameClaim() throws IOException, ServletException {
            MockHttpServletRequest request = new MockHttpServletRequest();
            request.addHeader("Authorization", bearerWith("{\"preferred_username\":\"jdoe\"}"));

            filter.doFilter(request, new MockHttpServletResponse(), filterChain);

            assertEquals("jdoe", userWorkspaceContext.getWorkspaceId());
        }

        @Test
        @DisplayName("'sub' takes priority over 'preferred_username' when both are present")
        void subTakesPriorityOverPreferredUsername() throws IOException, ServletException {
            MockHttpServletRequest request = new MockHttpServletRequest();
            request.addHeader("Authorization", bearerWith("{\"sub\":\"primary\",\"preferred_username\":\"secondary\"}"));

            filter.doFilter(request, new MockHttpServletResponse(), filterChain);

            assertEquals("primary", userWorkspaceContext.getWorkspaceId());
        }

        @Test
        @DisplayName("JSON-null 'sub' falls through to 'preferred_username'")
        void nullSubFallsBackToPreferredUsername() throws IOException, ServletException {
            MockHttpServletRequest request = new MockHttpServletRequest();
            request.addHeader("Authorization", bearerWith("{\"sub\":null,\"preferred_username\":\"jdoe\"}"));

            filter.doFilter(request, new MockHttpServletResponse(), filterChain);

            assertEquals("jdoe", userWorkspaceContext.getWorkspaceId());
        }

        @Test
        @DisplayName("Generates anonymous workspace ID when no Authorization header is present")
        void noAuthorizationHeader() throws IOException, ServletException {
            filter.doFilter(new MockHttpServletRequest(), new MockHttpServletResponse(), filterChain);

            String workspaceId = userWorkspaceContext.getWorkspaceId();
            assertTrue(workspaceId.startsWith(ANON_PREFIX));
            assertEquals(ANON_PREFIX.length() + ANON_SUFFIX_LENGTH, workspaceId.length());
        }

        @Test
        @DisplayName("Non-Bearer Authorization header falls back to anonymous workspace ID")
        void nonBearerHeaderFallsBackToSession() throws IOException, ServletException {
            MockHttpServletRequest request = new MockHttpServletRequest();
            request.addHeader("Authorization", "Basic dXNlcjpwYXNz");

            filter.doFilter(request, new MockHttpServletResponse(), filterChain);

            assertTrue(userWorkspaceContext.getWorkspaceId().startsWith(ANON_PREFIX));
        }

        @Test
        @DisplayName("Malformed JWT (too few parts) falls back to anonymous workspace ID")
        void malformedJwtFallsBackToSession() throws IOException, ServletException {
            MockHttpServletRequest request = new MockHttpServletRequest();
            request.addHeader("Authorization", "Bearer singlepart");

            filter.doFilter(request, new MockHttpServletResponse(), filterChain);

            assertTrue(userWorkspaceContext.getWorkspaceId().startsWith(ANON_PREFIX));
        }

        @Test
        @DisplayName("JWT with invalid base64 payload falls back to anonymous workspace ID")
        void invalidBase64PayloadFallsBackToSession() throws IOException, ServletException {
            MockHttpServletRequest request = new MockHttpServletRequest();
            request.addHeader("Authorization", "Bearer header.!!!notbase64!!!.signature");

            filter.doFilter(request, new MockHttpServletResponse(), filterChain);

            assertTrue(userWorkspaceContext.getWorkspaceId().startsWith(ANON_PREFIX));
        }

        @Test
        @DisplayName("Anonymous workspace ID is stored in and reused from the HTTP session")
        void anonWorkspaceIdIsStoredInSession() throws IOException, ServletException {
            MockHttpServletRequest request = new MockHttpServletRequest();
            filter.doFilter(request, new MockHttpServletResponse(), filterChain);

            String storedId = (String) Objects.requireNonNull(request.getSession(false)).getAttribute("workspaceId");
            assertEquals(userWorkspaceContext.getWorkspaceId(), storedId);
        }

        @Test
        @DisplayName("Same session yields the same workspace ID across requests")
        void sameSessionReturnsSameWorkspaceId() throws IOException, ServletException {
            MockHttpServletRequest request1 = new MockHttpServletRequest();
            filter.doFilter(request1, new MockHttpServletResponse(), filterChain);
            String firstId = userWorkspaceContext.getWorkspaceId();

            UserWorkspaceContext ctx2 = new UserWorkspaceContext();
            MockHttpServletRequest request2 = new MockHttpServletRequest();
            request2.setSession(Objects.requireNonNull(request1.getSession(false)));
            new UserContextFilter(ctx2, objectMapper).doFilter(request2, new MockHttpServletResponse(), filterChain);

            assertEquals(firstId, ctx2.getWorkspaceId());
        }

        @Test
        @DisplayName("Different sessions get different workspace IDs")
        void differentSessionsGetDifferentWorkspaceIds() throws IOException, ServletException {
            filter.doFilter(new MockHttpServletRequest(), new MockHttpServletResponse(), filterChain);
            String id1 = userWorkspaceContext.getWorkspaceId();

            UserWorkspaceContext ctx2 = new UserWorkspaceContext();
            new UserContextFilter(ctx2, objectMapper).doFilter(new MockHttpServletRequest(), new MockHttpServletResponse(), filterChain);

            assertNotEquals(id1, ctx2.getWorkspaceId());
        }

        @Test
        @DisplayName("Already-initialized context is not re-initialized on subsequent requests")
        void doesNotReinitializeWhenAlreadyInitialized() throws IOException, ServletException {
            userWorkspaceContext.initialize("pre-set-id");

            MockHttpServletRequest request = new MockHttpServletRequest();
            request.addHeader("Authorization", bearerWith("{\"sub\":\"other\"}"));
            filter.doFilter(request, new MockHttpServletResponse(), filterChain);

            assertEquals("pre-set-id", userWorkspaceContext.getWorkspaceId());
        }

        @Test
        @DisplayName("Special characters in the JWT user ID are sanitized")
        void sanitizesSpecialCharactersInUserId() throws IOException, ServletException {
            MockHttpServletRequest request = new MockHttpServletRequest();
            request.addHeader("Authorization", bearerWith("{\"sub\":\"user!@#$%^&\"}"));

            filter.doFilter(request, new MockHttpServletResponse(), filterChain);

            assertTrue(userWorkspaceContext.getWorkspaceId().matches("[a-zA-Z0-9.@_-]+"));
        }
    }

    @Nested
    @DisplayName("Session cookie")
    class SessionCookie {

        @Test
        @DisplayName("JSESSIONID cookie is set on every request")
        void cookieIsSetOnEveryRequest() throws IOException, ServletException {
            MockHttpServletRequest request = new MockHttpServletRequest();
            MockHttpServletResponse response = new MockHttpServletResponse();
            filter.doFilter(request, response, filterChain);

            assertNotNull(response.getCookie("JSESSIONID"));
        }

        @Test
        @DisplayName("Cookie max-age is 24 hours")
        void cookieMaxAgeIs24Hours() throws IOException, ServletException {
            MockHttpServletResponse response = new MockHttpServletResponse();
            filter.doFilter(new MockHttpServletRequest(), response, filterChain);

            assertEquals(SESSION_MAX_AGE, Objects.requireNonNull(response.getCookie("JSESSIONID")).getMaxAge());
        }

        @Test
        @DisplayName("Cookie is marked HttpOnly")
        void cookieIsHttpOnly() throws IOException, ServletException {
            MockHttpServletResponse response = new MockHttpServletResponse();
            filter.doFilter(new MockHttpServletRequest(), response, filterChain);

            assertTrue(Objects.requireNonNull(response.getCookie("JSESSIONID")).isHttpOnly());
        }

        @Test
        @DisplayName("Cookie path defaults to '/' when context path is empty")
        void cookiePathDefaultsToSlash() throws IOException, ServletException {
            MockHttpServletResponse response = new MockHttpServletResponse();
            filter.doFilter(new MockHttpServletRequest(), response, filterChain);

            assertEquals("/", Objects.requireNonNull(response.getCookie("JSESSIONID")).getPath());
        }

        @Test
        @DisplayName("Cookie path matches the application context path when set")
        void cookiePathMatchesContextPath() throws IOException, ServletException {
            MockHttpServletRequest request = new MockHttpServletRequest();
            request.setContextPath("/myapp");
            MockHttpServletResponse response = new MockHttpServletResponse();
            filter.doFilter(request, response, filterChain);

            assertEquals("/myapp", Objects.requireNonNull(response.getCookie("JSESSIONID")).getPath());
        }

        @Test
        @DisplayName("Cookie is marked Secure on HTTPS requests")
        void cookieIsSecureOnHttpsRequest() throws IOException, ServletException {
            MockHttpServletRequest request = new MockHttpServletRequest();
            request.setSecure(true);
            MockHttpServletResponse response = new MockHttpServletResponse();
            filter.doFilter(request, response, filterChain);

            assertTrue(Objects.requireNonNull(response.getCookie("JSESSIONID")).getSecure());
        }

        @Test
        @DisplayName("Cookie is not marked Secure on HTTP requests")
        void cookieIsNotSecureOnHttpRequest() throws IOException, ServletException {
            MockHttpServletRequest request = new MockHttpServletRequest();
            request.setSecure(false);
            MockHttpServletResponse response = new MockHttpServletResponse();
            filter.doFilter(request, response, filterChain);

            assertFalse(Objects.requireNonNull(response.getCookie("JSESSIONID")).getSecure());
        }
    }

    @Nested
    @DisplayName("Filter chain")
    class FilterChainBehavior {

        @Test
        @DisplayName("Filter chain is always called, regardless of workspace ID resolution outcome")
        void chainIsAlwaysCalled() throws IOException, ServletException {
            MockHttpServletRequest request = new MockHttpServletRequest();
            MockHttpServletResponse response = new MockHttpServletResponse();
            filter.doFilter(request, response, filterChain);

            verify(filterChain).doFilter(request, response);
        }
    }
}
