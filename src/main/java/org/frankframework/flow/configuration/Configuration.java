package org.frankframework.flow.configuration;

import lombok.Getter;
import lombok.Setter;

@Setter
@Getter
public class Configuration {
    private String filename;
    private String xmlContent;

    public Configuration(String filename) {
        this.filename = filename;
        this.xmlContent = "<Configuration><Adapter name='new adapter'></Adapter></Configuration>";
    }
}
