package org.frankframework.flow.common.config;

import org.apache.commons.lang3.StringUtils;

import org.frankframework.management.bus.LocalGateway;
import org.frankframework.management.bus.OutboundGatewayFactory;
import org.frankframework.management.gateway.HazelcastOutboundGateway;
import org.frankframework.management.security.JwtKeyGenerator;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.ApplicationContext;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Scope;
import org.springframework.integration.channel.PublishSubscribeChannel;
import org.springframework.messaging.MessageChannel;

@Configuration
@ConditionalOnProperty(name = "hazelcast.enabled", havingValue = "true")
public class AnnotationConfig {

	private final ApplicationContext applicationContext;

	public AnnotationConfig(ApplicationContext applicationContext) {
		this.applicationContext = applicationContext;
	}

	@Bean
	public JwtKeyGenerator jwtKeyGenerator() {
		return new JwtKeyGenerator();
	}

	@Bean(name = "frank-management-bus")
	@ConditionalOnProperty(name = "configurations.directory", matchIfMissing = false)
	public MessageChannel frankManagementBus() {
		return new PublishSubscribeChannel();
	}

	@Bean
	@Scope("singleton")
	public OutboundGatewayFactory createOutboundGatewayFactory() {
		OutboundGatewayFactory factory = new OutboundGatewayFactory();
		String configDirectory = applicationContext.getEnvironment().getProperty("configurations.directory");
		String gatewayClassName = StringUtils.isEmpty(configDirectory) ? HazelcastOutboundGateway.class.getCanonicalName() : LocalGateway.class.getCanonicalName();
		factory.setGatewayClassname(gatewayClassName);
		return factory;
	}
}
