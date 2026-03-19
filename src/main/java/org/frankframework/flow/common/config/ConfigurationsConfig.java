package org.frankframework.flow.common.config;

import java.util.ArrayList;
import java.util.List;

import org.frankframework.flow.exception.ApiException;
import org.frankframework.flow.hazelcast.HazelcastConfigurationDTO;
import org.frankframework.management.bus.BusAction;
import org.frankframework.management.bus.BusMessageUtils;
import org.frankframework.management.bus.BusTopic;
import org.frankframework.management.bus.OutboundGateway;
import org.frankframework.util.JacksonUtils;
import org.springframework.beans.factory.InitializingBean;
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
public class ConfigurationsConfig implements InitializingBean {
	private static final String DEFAULT_FF_CONFIGURATION_PREFIX = "IAF_";

	private List<HazelcastConfigurationDTO> configurations = new ArrayList<>();

	private final OutboundGateway outboundGateway;

	public ConfigurationsConfig(OutboundGateway outboundGateway) {
		this.outboundGateway = outboundGateway;
	}


	@Override
	public void afterPropertiesSet() throws Exception {
		Message<String> request = MessageBuilder.withPayload("NONE").setHeader(BusTopic.TOPIC_HEADER_NAME, BusTopic.CONFIGURATION.name()).setHeader(BusAction.ACTION_HEADER_NAME, BusAction.FIND.name()).build();

		Message<Object> response = outboundGateway.sendSyncMessage(request);
		List<HazelcastConfigurationDTO> configs = getConfigurations(response);

		configurations = configs.stream().filter(e -> !e.getName().startsWith(DEFAULT_FF_CONFIGURATION_PREFIX)).toList();
	}

	private List<HazelcastConfigurationDTO> getConfigurations(Message<?> response) throws ApiException {
		if(MediaType.APPLICATION_JSON_VALUE.equals(response.getHeaders().get(BusMessageUtils.HEADER_PREFIX+"type"))) {
			HazelcastConfigurationDTO[] arr = JacksonUtils.convertToDTO(response.getPayload(), HazelcastConfigurationDTO[].class);
			return List.of(arr); //TODO new TypeReference<List<ConfigurationDTO>>(){}
		}

		throw new ApiException("unexpected result returned by Bus", HttpStatus.INTERNAL_SERVER_ERROR);
	}

	public List<String> getAllConfigurations() {
		return configurations.stream().map(HazelcastConfigurationDTO::getName).toList();
	}

	public HazelcastConfigurationDTO getConfiguration(String name) throws ApiException {
		return configurations.stream()
				.filter(e -> e.getName().equals(name))
				.findFirst()
				.orElseThrow(() -> new ApiException("configuration not found", HttpStatus.NOT_FOUND));
	}
}
