package org.frankframework.flow.common.config;

import jakarta.servlet.http.HttpServletRequest;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;
import java.util.List;
import java.util.UUID;
import lombok.Getter;
import org.frankframework.management.bus.OutboundGateway;
import org.jspecify.annotations.Nullable;
import org.springframework.beans.factory.InitializingBean;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Component;
import org.springframework.web.context.annotation.SessionScope;

@Component
@SessionScope
public class ClientSession implements InitializingBean {

	@Nullable
	private @Getter UUID memberTarget;
	private final OutboundGateway outboundGateway;
	private final @Getter String workspaceId;

	private static final int SESSION_HASH_LENGTH = 16;

	public ClientSession(@Qualifier("outboundGateway") OutboundGateway outboundGateway, HttpServletRequest request) {
		this.outboundGateway = outboundGateway;
		this.workspaceId = determineWorkspaceId(request);
	}

	public void setMemberTarget(@Nullable UUID id) {
		this.memberTarget = id;
	}

	public void setMemberTarget(String id) {
		setMemberTarget(UUID.fromString(id));
	}

	/*
		When a new session is created, assign a default target
		Maybe we don't want this for the flow, but what if every instance has the same configurations?
	*/
	@Override
	public void afterPropertiesSet() throws Exception {
		List<OutboundGateway.ClusterMember> members = outboundGateway.getMembers();
		members.stream()
				.filter(member -> "worker".equals(member.getType()))
				.findFirst()
				.ifPresent(member -> {
					member.setSelectedMember(true);
					setMemberTarget(member.getId());
				});
	}

	private String determineWorkspaceId(HttpServletRequest request) {

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

}
