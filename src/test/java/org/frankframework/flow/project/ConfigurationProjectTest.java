package org.frankframework.flow.project;

import static org.junit.jupiter.api.Assertions.*;

import java.util.List;

import org.frankframework.flow.configuration.ConfigurationFile;
import org.frankframework.flow.projectsettings.FilterType;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class ConfigurationProjectTest {

	private ConfigurationProject configurationProject;

	@BeforeEach
	void init() {
		configurationProject = new ConfigurationProject("TestProject", "/path/to/project");
	}

	@Test
	void testProjectInitialization() {
		assertEquals("TestProject", configurationProject.getName());
	}

	@Test
	void testProjectEnableFilter() {
		assertFalse(configurationProject.isFilterEnabled(FilterType.ADAPTER));
		configurationProject.enableFilter(FilterType.ADAPTER);
		assertTrue(configurationProject.isFilterEnabled(FilterType.ADAPTER));
	}

	@Test
	void testProjectDisableFilter() {
		configurationProject.enableFilter(FilterType.ADAPTER);
		assertTrue(configurationProject.isFilterEnabled(FilterType.ADAPTER));

		configurationProject.disableFilter(FilterType.ADAPTER);
		assertFalse(configurationProject.isFilterEnabled(FilterType.ADAPTER));
	}

	@Test
	void testDisableFilterThatWasNeverEnabled() {
		assertFalse(configurationProject.isFilterEnabled(FilterType.ADAPTER));

		configurationProject.disableFilter(FilterType.ADAPTER);

		assertFalse(configurationProject.isFilterEnabled(FilterType.ADAPTER));
	}

	@Test
	void testAddConfigurationToProject() {
		assertTrue(configurationProject.getConfigurationFiles().isEmpty());

		ConfigurationFile configuration = new ConfigurationFile("new_file", "");
		configurationProject.addConfiguration(configuration);

		List<ConfigurationFile> configurations = configurationProject.getConfigurationFiles();
		assertEquals(1, configurations.size());
		assertTrue(configurations.contains(configuration));
	}
}
