package org.frankframework.flow.common;

import org.frankframework.management.bus.LocalGateway;
import org.frankframework.management.bus.OutboundGatewayFactory;

import org.frankframework.management.security.JwtKeyGenerator;

import org.springframework.context.EnvironmentAware;
import org.springframework.context.annotation.Bean;
import org.springframework.core.env.Environment;
import org.springframework.integration.channel.PublishSubscribeChannel;
import org.springframework.messaging.SubscribableChannel;
import org.springframework.stereotype.Component;

@Component
public class FrankGateway implements EnvironmentAware {

	private String gatewayClassName;

	@Override
	public void setEnvironment(Environment environment) {
		gatewayClassName = environment.getProperty("management.gateway.outbound.class", String.class, LocalGateway.class.getCanonicalName());
	}

	@Bean("frank-management-bus")
	public SubscribableChannel frankManagementBus() {
		return new PublishSubscribeChannel();
	}

	@Bean
	public OutboundGatewayFactory outboundGateway() {
		OutboundGatewayFactory factory = new OutboundGatewayFactory();
		factory.setGatewayClassname(gatewayClassName);
		return factory;
	}

	@Bean
	public JwtKeyGenerator jwtKeyGenerator() {
		return new JwtKeyGenerator();
	}
}
