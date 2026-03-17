package org.frankframework.flow.security;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpFilter;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.Base64;
import java.util.HexFormat;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

@Component
@Slf4j
public class UserContextFilter extends HttpFilter {

	private static final String BEARER_PREFIX = "Bearer ";
	private static final int SESSION_HASH_LENGTH = 16;
	private static final int MIN_JWT_PARTS = 2;

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

		chain.doFilter(request, response);
	}

	private String determineWorkspaceId(HttpServletRequest request) {
		String authHeader = request.getHeader("Authorization");
		if (authHeader != null && authHeader.startsWith(BEARER_PREFIX)) {
			String userId = extractUserIdFromJwt(authHeader.substring(BEARER_PREFIX.length()));
			if (userId != null) return sanitize(userId);
		}

		String sessionId = request.getHeader("X-Session-ID");
		if (sessionId != null && !sessionId.isBlank()) {
			return "anon-" + hashSessionId(sessionId);
		}

		return "anonymous";
	}

	private String hashSessionId(String sessionId) {
		try {
			MessageDigest digest = MessageDigest.getInstance("SHA-256");
			byte[] hash = digest.digest(sessionId.getBytes(StandardCharsets.UTF_8));
			return HexFormat.of().formatHex(hash).substring(0, SESSION_HASH_LENGTH);
		} catch (NoSuchAlgorithmException e) {
			return sanitize(sessionId);
		}
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
