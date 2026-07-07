package org.frankframework.flow.common.config;

import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.MapperFeature;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.databind.json.JsonMapper;
import jakarta.servlet.MultipartConfigElement;
import org.frankframework.flow.project.ImportProperties;
import org.frankframework.management.gateway.InputStreamHttpMessageConverter;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.converter.FormHttpMessageConverter;
import org.springframework.http.converter.HttpMessageConverters;
import org.springframework.http.converter.json.MappingJackson2HttpMessageConverter;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.method.HandlerTypePredicate;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.PathMatchConfigurer;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
@EnableConfigurationProperties(ImportProperties.class)
public class WebConfiguration implements WebMvcConfigurer {

	private static final long MAX_AGE_SECONDS = 3600;

	private static final long MULTIPART_REQUEST_HEADROOM_BYTES = 5L * 1024 * 1024;

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
		JsonMapper jsonMapper = JsonMapper.builder()
				.enable(MapperFeature.ACCEPT_CASE_INSENSITIVE_ENUMS)
				.configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false)
				.configure(DeserializationFeature.ACCEPT_EMPTY_ARRAY_AS_NULL_OBJECT, true)
				.configure(DeserializationFeature.READ_UNKNOWN_ENUM_VALUES_AS_NULL, true)
				.configure(DeserializationFeature.FAIL_ON_NULL_FOR_PRIMITIVES, false) // allow null value for boolean
				.configure(SerializationFeature.INDENT_OUTPUT, true) // pretty print
				.build();

		builder.withJsonConverter(new MappingJackson2HttpMessageConverter(jsonMapper));

		builder.addCustomConverter(new InputStreamHttpMessageConverter());
		builder.addCustomConverter(new FormHttpMessageConverter());
	}

	@Bean
	public MultipartConfigElement multipartConfigElement(ImportProperties importProperties) {
		long maxFileSize = importProperties.maxUploadSize().toBytes();
		long maxRequestSize = maxFileSize + MULTIPART_REQUEST_HEADROOM_BYTES;
		return new MultipartConfigElement(null, maxFileSize, maxRequestSize, 0);
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
