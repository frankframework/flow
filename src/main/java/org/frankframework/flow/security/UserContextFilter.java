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
import java.util.List;
import java.util.Objects;
import java.util.UUID;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

@Component
@Slf4j
public class UserContextFilter extends HttpFilter {

    private static final String BEARER_PREFIX = "Bearer ";
    private static final String SESSION_WORKSPACE_KEY = "workspaceId";
    private static final String ANON_ID_PREFIX = "anon-";
    private static final int ANON_ID_LENGTH = 16;
    private static final int SESSION_MAX_AGE = 86_400;
    private static final int MIN_JWT_PARTS = 2;
    private static final List<String> JWT_USER_CLAIMS = List.of("sub", "preferred_username");

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
        String userId = extractUserIdFromBearer(request.getHeader("Authorization"));
        if (userId != null) return sanitize(userId);

        HttpSession session = request.getSession(true);
        String workspaceId = (String) session.getAttribute(SESSION_WORKSPACE_KEY);
        if (workspaceId == null) {
            workspaceId = generateAnonWorkspaceId();
            session.setAttribute(SESSION_WORKSPACE_KEY, workspaceId);
            log.debug("Created new anonymous workspace for session: {}", workspaceId);
        }
        return workspaceId;
    }

    private String extractUserIdFromBearer(String authHeader) {
        if (authHeader == null || !authHeader.startsWith(BEARER_PREFIX)) return null;
        return extractUserIdFromJwt(authHeader.substring(BEARER_PREFIX.length()));
    }

    private String extractUserIdFromJwt(String token) {
        try {
            String[] parts = token.split("\\.");
            if (parts.length < MIN_JWT_PARTS) return null;

            JsonNode claims = objectMapper.readTree(Base64.getUrlDecoder().decode(parts[1]));
            return JWT_USER_CLAIMS.stream()
                    .map(claim -> claimValue(claims, claim))
                    .filter(Objects::nonNull)
                    .findFirst()
                    .orElse(null);
        } catch (Exception e) {
            log.warn("Failed to parse JWT: {}", e.getMessage());
        }
        return null;
    }

    private String claimValue(JsonNode claims, String name) {
        JsonNode node = claims.path(name);
        return (!node.isMissingNode() && !node.isNull()) ? node.asText() : null;
    }

    private void refreshSessionCookie(HttpServletRequest request, HttpServletResponse response) {
        HttpSession session = request.getSession(false);
        if (session == null) return;

        String contextPath = request.getContextPath();
        Cookie cookie = new Cookie("JSESSIONID", session.getId());
        cookie.setPath(contextPath.isEmpty() ? "/" : contextPath);
        cookie.setHttpOnly(true);
        cookie.setSecure(request.isSecure());
        cookie.setMaxAge(SESSION_MAX_AGE);
        response.addCookie(cookie);
    }

    private String generateAnonWorkspaceId() {
        return ANON_ID_PREFIX + UUID.randomUUID().toString().replace("-", "").substring(0, ANON_ID_LENGTH);
    }

    private String sanitize(String input) {
        return input.replaceAll("[^a-zA-Z0-9.@-]", "_");
    }
}
