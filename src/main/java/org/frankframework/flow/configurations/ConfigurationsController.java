package org.frankframework.flow.configurations;

import java.util.ArrayList;
import java.util.List;

import org.springframework.http.MediaType;
import org.springframework.messaging.Message;
import org.springframework.messaging.support.MessageBuilder;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import org.frankframework.flow.services.FrankApiService;
import org.frankframework.management.bus.BusAction;
import org.frankframework.management.bus.BusMessageUtils;
import org.frankframework.management.bus.BusTopic;
import org.frankframework.management.bus.OutboundGateway;
import org.frankframework.util.JacksonUtils;

@RestController()
@RequestMapping("/configurations")
public class ConfigurationsController {
	private final FrankApiService frankApiService;
	private final OutboundGateway gateway;
	private List<ConfigurationDTO> configurations = new ArrayList<>();

	public ConfigurationsController(FrankApiService frankApiService, OutboundGateway gateway) {
		this.frankApiService = frankApiService;
		this.gateway = gateway;

		seedConfigurations();
	}

	private void seedConfigurations() {
		for (int i = 1; i <= 10; i++) {
			ConfigurationDTO config = new ConfigurationDTO();
			config.name = "Config" + i;
			config.version = "1.0." + i;
			config.stubbed = i % 2 == 0;
			config.type = "Type" + i;
			config.directory = "/path/to/config" + i;
			config.parent = "Parent" + i;
			configurations.add(config);
		}
	}

	@GetMapping
	public List<ConfigurationDTO> getAll() {
		Message<String> request = MessageBuilder.withPayload("NONE")
				.setHeader(BusTopic.TOPIC_HEADER_NAME, BusTopic.CONFIGURATION.name())
				.setHeader(BusAction.ACTION_HEADER_NAME, BusAction.FIND.name())
				.build();

		Message<Object> response = gateway.sendSyncMessage(request);
		List<ConfigurationDTO> configs = getConfigurations(response);

		assert configs != null;
		configurations = configs.stream().filter(e -> !e.name.startsWith("IAF_")).toList();

		return configurations;
	}

	private List<ConfigurationDTO> getConfigurations(Message<?> response) {
		if (MediaType.APPLICATION_JSON_VALUE.equals(response.getHeaders().get(BusMessageUtils.HEADER_PREFIX + "type"))) {
			ConfigurationDTO[] arr = JacksonUtils.convertToDTO(response.getPayload(), ConfigurationDTO[].class);
			return List.of(arr); //TODO new TypeReference<List<ConfigurationDTO>>(){}
		}

		return null;
	}

	@PostMapping
	public ConfigurationDTO create(@RequestBody ConfigurationDTO configuration) {
		configurations.add(configuration);
		return configuration;
	}

	@GetMapping("/{name}")
	public ConfigurationDTO getById(@PathVariable String name) {
		for (ConfigurationDTO config : configurations) {
			if (config.name.equals(name)) {
				return config;
			}
		}
		return null;
	}

	@PutMapping("/{name}")
	public ConfigurationDTO update(@PathVariable String name, @RequestBody ConfigurationDTO configuration) {
		for (ConfigurationDTO config : configurations) {
			if (config.name.equals(name)) {
				config = configuration;
				return config;
			}
		}
		return null;
	}

	@DeleteMapping("/{name}")
	public ConfigurationDTO delete(@PathVariable String name) {
		for (ConfigurationDTO config : configurations) {
			if (config.name.equals(name)) {
				configurations.remove(config);
				return config;
			}
		}
		return null;
	}


}
