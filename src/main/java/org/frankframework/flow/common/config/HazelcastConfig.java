package org.frankframework.flow.common.config;

import org.apache.commons.lang3.StringUtils;
import org.frankframework.management.bus.LocalGateway;
import org.frankframework.management.bus.OutboundGatewayFactory;
import org.frankframework.management.gateway.HazelcastOutboundGateway;
import org.frankframework.management.security.JwtKeyGenerator;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.integration.channel.PublishSubscribeChannel;
import org.springframework.messaging.SubscribableChannel;

@Configuration
@ConditionalOnProperty(name = "hazelcast.enabled", havingValue = "true")
public class HazelcastConfig {

	@Value("${configurations.directory:}")
	private String configurationsDirectory;

	@Bean
	public JwtKeyGenerator jwtKeyGenerator() {
		return new JwtKeyGenerator();
	}

	@Bean("frank-management-bus")
	@ConditionalOnProperty(name = "configurations.directory")
	public SubscribableChannel frankManagementBus() {
		return new PublishSubscribeChannel();
	}

	@Bean
	public OutboundGatewayFactory outboundGatewayFactory() {
		OutboundGatewayFactory factory = new OutboundGatewayFactory();
		String gatewayClassName = StringUtils.isNotBlank(configurationsDirectory)
				? LocalGateway.class.getCanonicalName()
				: HazelcastOutboundGateway.class.getCanonicalName();
		factory.setGatewayClassname(gatewayClassName);
		return factory;
	}
}
