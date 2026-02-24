package org.frankframework.flow.security;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpFilter;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import java.io.IOException;
import java.util.Base64;
import java.util.UUID;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

@Component
@Slf4j
public class UserContextFilter extends HttpFilter {

    private static final String BEARER_PREFIX = "Bearer ";
    private static final int HASH_LENGTH = 16;
    private static final int MIN_JWT_PARTS = 2;
    private static final String SESSION_WORKSPACE_KEY = "workspaceId";
    private static final int SESSION_MAX_AGE = 86_400;

    private final UserWorkspaceContext userWorkspaceContext;
    private final ObjectMapper objectMapper;

    public UserContextFilter(UserWorkspaceContext userWorkspaceContext, ObjectMapper objectMapper) {
        this.userWorkspaceContext = userWorkspaceContext;
        this.objectMapper = objectMapper;
    }

    @Override
    protected void doFilter(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws IOException, ServletException {

        if (!userWorkspaceContext.isInitialized()) {
            String workspaceId = determineWorkspaceId(request);
            userWorkspaceContext.initialize(workspaceId);
            log.debug("Context initialized for workspace: {}", workspaceId);
        }

        refreshSessionCookie(request, response);

        chain.doFilter(request, response);
    }

    private String determineWorkspaceId(HttpServletRequest request) {
        String authHeader = request.getHeader("Authorization");
        if (authHeader != null && authHeader.startsWith(BEARER_PREFIX)) {
            String userId = extractUserIdFromJwt(authHeader.substring(BEARER_PREFIX.length()));
            if (userId != null) return sanitize(userId);
        }

        HttpSession session = request.getSession(true);
        String workspaceId = (String) session.getAttribute(SESSION_WORKSPACE_KEY);
        if (workspaceId == null) {
            workspaceId =
                    "anon-" + UUID.randomUUID().toString().replace("-", "").substring(0, HASH_LENGTH);
            session.setAttribute(SESSION_WORKSPACE_KEY, workspaceId);
            log.debug("Created new workspace for session: {}", workspaceId);
        }
        return workspaceId;
    }

    private void refreshSessionCookie(HttpServletRequest request, HttpServletResponse response) {
        HttpSession session = request.getSession(false);
        if (session == null) return;

        String contextPath = request.getContextPath();
        Cookie cookie = new Cookie("JSESSIONID", session.getId());
        cookie.setPath(contextPath.isEmpty() ? "/" : contextPath);
        cookie.setHttpOnly(true);
        cookie.setMaxAge(SESSION_MAX_AGE);
        response.addCookie(cookie);
    }

    private String sanitize(String input) {
        return input.replaceAll("[^a-zA-Z0-9.@-]", "_");
    }

    private String extractUserIdFromJwt(String token) {
        try {
            String[] parts = token.split("\\.");
            if (parts.length < MIN_JWT_PARTS) return null;
            String payload = new String(Base64.getUrlDecoder().decode(parts[1]));
            JsonNode claims = objectMapper.readTree(payload);

            if (!claims.path("sub").isMissingNode()) {
                return claims.path("sub").asText();
            }
            if (!claims.path("preferred_username").isMissingNode()) {
                return claims.path("preferred_username").asText();
            }
        } catch (Exception e) {
            log.warn("Invalid JWT format");
        }
        return null;
    }
}
