package org.frankframework.flow.common.config;

import com.fasterxml.jackson.databind.ObjectMapper;

import org.frankframework.management.bus.LocalGateway;
import org.frankframework.management.bus.OutboundGatewayFactory;
import org.frankframework.management.gateway.InputStreamHttpMessageConverter;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.EnvironmentAware;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.env.Environment;
import org.springframework.http.converter.HttpMessageConverter;
import org.springframework.http.converter.HttpMessageConverters;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.method.HandlerTypePredicate;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.PathMatchConfigurer;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class WebConfiguration implements WebMvcConfigurer, EnvironmentAware {

	private String gatewayClassName;

	private static final long MAX_AGE_SECONDS = 3600;

	@Value("${cors.allowed.origins:}")
	private String[] allowedOrigins;

	@Override
	public void addCorsMappings(CorsRegistry registry) {
		registry.addMapping("/**")
				.allowedOrigins(allowedOrigins)
				.allowedMethods("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS")
				.allowedHeaders("*")
				.allowCredentials(false)
				.maxAge(MAX_AGE_SECONDS);
	}

	@Override
	public void configurePathMatch(PathMatchConfigurer configurer) {
		configurer.addPathPrefix("/api", HandlerTypePredicate.forAnnotation(RestController.class));
	}

	@Override
	public void configureMessageConverters(HttpMessageConverters.ServerBuilder builder) {
		builder.addCustomConverter(new InputStreamHttpMessageConverter());
	}

	@Override
	public void setEnvironment(Environment environment) {
		gatewayClassName = environment.getProperty("management.gateway.outbound.class", String.class, LocalGateway.class.getCanonicalName());
	}

	@Bean
	public OutboundGatewayFactory outboundGateway() {
		OutboundGatewayFactory factory = new OutboundGatewayFactory();
		factory.setGatewayClassname(gatewayClassName);
		return factory;
	}

	@Bean
	public ObjectMapper objectMapper() {
		return new ObjectMapper();
	}

	@Bean
	public RestTemplate restTemplate() {
		return new RestTemplate();
	}
}
