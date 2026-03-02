package org.frankframework.flow.datamapper;



import java.io.IOException;

import net.sf.saxon.s9api.SaxonApiException;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;





public class MappingGeneratorServiceTest {
    private MappingGeneratorService service;



    @BeforeEach
    void setUp() throws IOException {
        service = new MappingGeneratorService();
    }

    @AfterEach
    void tearDown() throws IOException {
    }

    @Test
    public void generateMapping() throws SaxonApiException {
        service.generate();
    }
}
