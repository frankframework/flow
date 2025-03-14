package org.frankframework.flow;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import org.frankframework.management.bus.OutboundGatewayFactory;
import org.frankframework.management.gateway.HazelcastOutboundGateway;
import org.frankframework.management.security.JwtKeyGenerator;

@Configuration
public class FlowConfiguration {

	@Bean
	public OutboundGatewayFactory createOutboundGatewayFactory() {
		OutboundGatewayFactory factory = new OutboundGatewayFactory();
		factory.setGatewayClassname(HazelcastOutboundGateway.class.getCanonicalName());
		return factory;
	}

	@Bean
	public JwtKeyGenerator jwtKeyGenerator() {
		return new JwtKeyGenerator();
	}
}
