package org.frankframework.flow.project;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

import java.util.List;

import org.frankframework.flow.configuration.Configuration;
import org.frankframework.flow.projectsettings.FilterType;
import org.junit.jupiter.api.BeforeEach;

class ProjectTest {

    private Project project;

    @BeforeEach
    void init() {
        project = new Project("TestProject");
    }

    @Test
    void testProjectInitialization() {

        assertEquals("TestProject", project.getName());
        assertEquals(project, project);
    }

    @Test
    void testSetConfigurationXmlUpdatesExistingConfiguration() {
        String filename = "config1.xml";
        Configuration config = new Configuration(filename);
        config.setXmlContent("<old/>");
        project.addConfiguration(config);

        project.setConfigurationXml(filename, "<new/>");

        assertEquals("<new/>", config.getXmlContent());
    }

    @Test
    void testSetConfigurationXmlDoesNothingIfFilenameNotFound() {
        String filename = "config1.xml";
        Configuration config = new Configuration(filename);
        config.setXmlContent("<old/>");
        project.addConfiguration(config);

        project.setConfigurationXml("nonexistent.xml", "<new/>");

        assertEquals("<old/>", config.getXmlContent());
    }

    @Test
    void testProjectEnableFilter() {
        assertFalse(project.isFilterEnabled(FilterType.ADAPTER));
        project.enableFilter(FilterType.ADAPTER);
        assertTrue(project.isFilterEnabled(FilterType.ADAPTER));
    }

    @Test
    void testProjectDisableFilter() {
        project.enableFilter(FilterType.ADAPTER);
        assertTrue(project.isFilterEnabled(FilterType.ADAPTER));

        project.disableFilter(FilterType.ADAPTER);
        assertFalse(project.isFilterEnabled(FilterType.ADAPTER));
    }

    @Test
    void testDisableFilterThatWasNeverEnabled() {
        assertFalse(project.isFilterEnabled(FilterType.ADAPTER));

        project.disableFilter(FilterType.ADAPTER);

        assertFalse(project.isFilterEnabled(FilterType.ADAPTER));
    }

    @Test
    void testAddConfigurationToProject() {
        assertTrue(project.getConfigurations().isEmpty());

        Configuration configuration = new Configuration("new_file");
        project.addConfiguration(configuration);

        List<Configuration> configurations = project.getConfigurations();
        assertEquals(1, configurations.size());
        assertTrue(configurations.contains(configuration));
    }

    @Test
    void updateAdapterReplacesAdapterAndUpdatesXml() {
        String originalXml = """
                <Configuration>
                    <Adapter name="OldAdapter">
                        <Settings>123</Settings>
                    </Adapter>
                    <Adapter name="OtherAdapter">
                        <Settings>456</Settings>
                    </Adapter>
                </Configuration>
                """;

        String newAdapterXml = """
                <Adapter name="OldAdapter">
                    <Settings>999</Settings>
                </Adapter>
                """;

        Configuration config = new Configuration("config1.xml");
        config.setXmlContent(originalXml);
        project.getConfigurations().add(config);

        boolean result = project.updateAdapter("config1.xml", "OldAdapter", newAdapterXml);

        assertTrue(result, "Adapter should be updated");

        String updatedXml = config.getXmlContent();

        assertTrue(updatedXml.contains("<Settings>999</Settings>"),
                "New adapter XML should be present");

        assertFalse(updatedXml.contains("<Settings>123</Settings>"),
                "Old adapter definition should be removed");

        assertTrue(updatedXml.contains("OtherAdapter"),
                "Other adapters must remain unchanged");
    }

    @Test
    void updateAdapterReturnsFalseWhenAdapterNotFound() {
        String originalXml = """
                <Configuration>
                    <Adapter name="A1"><X>1</X></Adapter>
                </Configuration>
                """;

        Configuration config = new Configuration("config1.xml");
        config.setXmlContent(originalXml);
        project.getConfigurations().add(config);

        boolean result = project.updateAdapter("config1.xml", "MissingAdapter",
                "<Adapter name=\"MissingAdapter\"/>");

        assertFalse(result, "Should return false if adapter does not exist");
        assertEquals(originalXml, config.getXmlContent(),
                "XML should remain unchanged when no adapter is replaced");
    }

    @Test
    void updateAdapterReturnsFalseForInvalidXml() {
        String originalXml = "<Configuration><Adapter name=\"A1\"/></Configuration>";

        Configuration config = new Configuration("config1.xml");
        config.setXmlContent(originalXml);
        project.getConfigurations().add(config);

        String invalidXml = "<Adapter><bad>";

        boolean result = project.updateAdapter("config1.xml", "A1", invalidXml);

        assertFalse(result, "Invalid XML should make updateAdapter return false");
        assertEquals(originalXml, config.getXmlContent(),
                "XML should remain unchanged after catching an exception");
    }
}
