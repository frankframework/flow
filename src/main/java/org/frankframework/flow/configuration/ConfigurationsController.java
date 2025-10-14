package org.frankframework.flow.configuration;

import java.util.ArrayList;
import java.util.List;

import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController()
@RequestMapping("/configurations")
public class ConfigurationsController {
	private List<ConfigurationDTO> configurations = new ArrayList<>();

	public ConfigurationsController() {
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
