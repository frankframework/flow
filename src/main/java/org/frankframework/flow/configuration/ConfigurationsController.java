package org.frankframework.flow.configuration;

import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;

import org.springframework.core.io.ClassPathResource;
import org.springframework.http.ResponseEntity;
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
			config.xmlContent = "1.0." + i;
			configurations.add(config);
		}
	}

	@PostMapping
	public ConfigurationDTO create(@RequestBody ConfigurationDTO configuration) {
		configurations.add(configuration);
		return configuration;
	}

	@GetMapping("/{filename}")
	public ResponseEntity<ConfigurationDTO> getById(@PathVariable String filename) {
		String resourcePath = "configuration/" + filename;
		ClassPathResource resource = new ClassPathResource(resourcePath);
		if  (!resource.exists()) {
			return ResponseEntity.notFound().build();
		}

		try (InputStream inputStream = resource.getInputStream()) {
			String xmlContent = new String(inputStream.readAllBytes(), StandardCharsets.UTF_8);
			ConfigurationDTO configuration = new ConfigurationDTO();
			configuration.name = filename;
			configuration.xmlContent = xmlContent;
			return ResponseEntity.ok(configuration);
		} catch (IOException exception) {
			return ResponseEntity.internalServerError().build();
		}
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
