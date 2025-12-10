package org.frankframework.flow.configuration;

import static org.junit.Assert.assertEquals;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.BeforeEach;

class ConfigurationTest {
    private Configuration configuration;

    @BeforeEach
    void init() {
        configuration = new Configuration("new_configuration");
    }

    @Test
    void testConfigurationInitialization() {
        assertEquals("new_configuration", configuration.getFilename());
        assertEquals("<Configuration></Configuration>", configuration.getXmlContent());
    }

}
