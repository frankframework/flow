package org.frankframework.flow.common.config;

import jakarta.annotation.PostConstruct;
import java.util.List;
import org.frankframework.flow.exception.ApiException;
import org.frankframework.flow.hazelcast.HazelcastConfigurationDTO;
import org.frankframework.management.bus.BusAction;
import org.frankframework.management.bus.BusMessageUtils;
import org.frankframework.management.bus.BusTopic;
import org.frankframework.management.bus.OutboundGateway;
import org.frankframework.util.JacksonUtils;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.messaging.Message;
import org.springframework.messaging.support.MessageBuilder;
import org.springframework.stereotype.Component;
import org.springframework.web.context.annotation.SessionScope;

@Component
@SessionScope
@ConditionalOnProperty(name = "hazelcast.enabled", havingValue = "true")
public class ConfigurationsConfig {

	private static final String DEFAULT_FF_CONFIGURATION_PREFIX = "IAF_";

	private List<HazelcastConfigurationDTO> configurations = List.of();

	private final OutboundGateway outboundGateway;

	public ConfigurationsConfig(OutboundGateway outboundGateway) {
		this.outboundGateway = outboundGateway;
	}

	@PostConstruct
	public void init() throws ApiException {
		Message<String> request = MessageBuilder.withPayload("NONE")
				.setHeader(BusTopic.TOPIC_HEADER_NAME, BusTopic.CONFIGURATION.name())
				.setHeader(BusAction.ACTION_HEADER_NAME, BusAction.FIND.name())
				.build();

		Message<Object> response = outboundGateway.sendSyncMessage(request);
		configurations = parseConfigurations(response).stream()
				.filter(config -> !config.name().startsWith(DEFAULT_FF_CONFIGURATION_PREFIX))
				.toList();
	}

	private List<HazelcastConfigurationDTO> parseConfigurations(Message<?> response) throws ApiException {
		String contentType = (String) response.getHeaders().get(BusMessageUtils.HEADER_PREFIX + "type");
		if (MediaType.APPLICATION_JSON_VALUE.equals(contentType)) {
			HazelcastConfigurationDTO[] arr = JacksonUtils.convertToDTO(response.getPayload(), HazelcastConfigurationDTO[].class);
			return List.of(arr);
		}

		throw new ApiException("Unexpected result returned by Bus", HttpStatus.INTERNAL_SERVER_ERROR);
	}

	public List<String> getAllConfigurations() {
		return configurations.stream().map(HazelcastConfigurationDTO::name).toList();
	}

	public HazelcastConfigurationDTO getConfiguration(String name) throws ApiException {
		return configurations.stream()
				.filter(config -> config.name().equals(name))
				.findFirst()
				.orElseThrow(() -> new ApiException("configuration not found", HttpStatus.NOT_FOUND));
	}
}
