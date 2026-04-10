package org.frankframework.flow.common.config;

import lombok.Getter;

import org.frankframework.management.bus.OutboundGateway;

import org.jspecify.annotations.Nullable;
import org.springframework.beans.factory.InitializingBean;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Component;
import org.springframework.web.context.annotation.SessionScope;

import java.util.List;
import java.util.UUID;

@Component
@SessionScope
public class ClientSession implements InitializingBean {

	@Autowired
	@Qualifier("outboundGateway")
	private OutboundGateway outboundGateway;

	/**
	 * Get target or `NULL` when no target has been specified or `afterPropertiesSet` has not been called yet.
	 */
	@Nullable
	private @Getter UUID memberTarget;

	public void setMemberTarget(@Nullable UUID id) {
		this.memberTarget = id;
	}

	public void setMemberTarget(String id) {
		setMemberTarget(UUID.fromString(id));
	}

	// When a new session is created, assign a default target
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

}
