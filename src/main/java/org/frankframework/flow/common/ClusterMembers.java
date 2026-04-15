package org.frankframework.flow.common;

import lombok.extern.log4j.Log4j2;

import org.frankframework.flow.common.config.ClientSession;
import org.frankframework.flow.utility.ResponseUtils;
import org.frankframework.management.bus.OutboundGateway;
import org.frankframework.management.bus.message.JsonMessage;
import org.frankframework.management.gateway.events.ClusterMemberEvent;

import org.springframework.context.ApplicationListener;
import org.springframework.context.annotation.Scope;
import org.springframework.context.annotation.ScopedProxyMode;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@Scope(proxyMode = ScopedProxyMode.TARGET_CLASS)
@Log4j2
public class ClusterMembers implements ApplicationListener<ClusterMemberEvent> {

	private final ClientSession session;

	private final OutboundGateway outboundGateway;

	public ClusterMembers(ClientSession session, OutboundGateway outboundGateway) {
		this.session = session;
		this.outboundGateway = outboundGateway;
	}

	@AllowAllFrankUserRoles
	@GetMapping(value = "/cluster/members", produces = MediaType.APPLICATION_JSON_VALUE)
	public ResponseEntity<?> getClusterMembers() {
		List<OutboundGateway.ClusterMember> members = outboundGateway.getMembers();
		JsonMessage response = new JsonMessage(members);
		return ResponseUtils.convertToSpringResponse(response);
	}

	@Override
	public void onApplicationEvent(ClusterMemberEvent event) {
		log.info("[{}]: {}", event.getType(), event.getMember());
	}
}
