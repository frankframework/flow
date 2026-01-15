package org.frankframework.flow.configuration;

import static org.junit.Assert.assertEquals;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class ConfigurationTest {
    private Configuration configuration;

    @BeforeEach
    void init() {
        configuration = new Configuration("new_configuration");
    }

    @Test
    void testConfigurationInitialization() {
        assertEquals("new_configuration", configuration.getFilepath());
        assertEquals(
                "<Configuration><Adapter name='new adapter'></Adapter></Configuration>", configuration.getXmlContent());
    }
}
