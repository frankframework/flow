package org.frankframework.flow.common;

import lombok.Getter;

import org.frankframework.flow.common.config.ClientSession;
import org.frankframework.flow.exception.ApiException;
import org.frankframework.flow.utility.ResponseUtils;
import org.frankframework.management.bus.BusException;
import org.frankframework.management.bus.OutboundGateway;
import org.frankframework.management.bus.message.RequestMessageBuilder;
import org.frankframework.management.gateway.events.ClusterMemberEvent;

import org.jspecify.annotations.NonNull;
import org.springframework.beans.BeansException;
import org.springframework.beans.factory.InitializingBean;
import org.springframework.context.ApplicationContext;
import org.springframework.context.ApplicationContextAware;
import org.springframework.context.ApplicationListener;
import org.springframework.core.env.Environment;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.Message;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

@Service
public class FrankFrameworkService implements ApplicationContextAware, InitializingBean, ApplicationListener<ClusterMemberEvent> {

	private @Getter ApplicationContext applicationContext;
	private @Getter Environment environment;
	private @Getter List<OutboundGateway.ClusterMember> clusterMembers;

	private final ClientSession session;

	public FrankFrameworkService(ClientSession session) {
		this.session = session;
	}

	public ResponseEntity<?> callSyncGateway(RequestMessageBuilder input) throws ApiException {
		Message<?> response = sendSyncMessage(input);
		// Build the response or do some final checks / return a different response
		return ResponseUtils.convertToSpringResponse(response);
	}

	public ResponseEntity<?> callAsyncGateway(RequestMessageBuilder input) {
		OutboundGateway gateway = getGateway();
		gateway.sendAsyncMessage(input.build(session.getMemberTarget()));
		return ResponseEntity.ok().build();
	}

	@Override
	public void afterPropertiesSet() {
		environment = applicationContext.getEnvironment();
		clusterMembers = getGateway().getMembers().stream()
				.filter(m -> "worker".equals(m.getType()))
				.toList();
	}

	@Override
	public void setApplicationContext(@NonNull ApplicationContext applicationContext) throws BeansException {
		this.applicationContext = applicationContext;
	}

	@Override
	public void onApplicationEvent(@NonNull ClusterMemberEvent event) {
		afterPropertiesSet();
	}

	protected final OutboundGateway getGateway() {
		return getApplicationContext().getBean("outboundGateway", OutboundGateway.class);
	}

	@NonNull
	protected Message<?> sendSyncMessage(RequestMessageBuilder input) throws ApiException {
		try {
			return getGateway().sendSyncMessage(input.build(getMemberTarget()));
		} catch (BusException e) {
			throw new ApiException("Error while sending message to topic [%s] with action [%s]".formatted(input.getTopic(), input.getAction()), HttpStatus.INTERNAL_SERVER_ERROR);
		}
	}

	private UUID getMemberTarget() {
		return session.getMemberTarget();
	}
}
