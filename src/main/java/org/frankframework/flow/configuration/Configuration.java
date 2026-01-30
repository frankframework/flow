package org.frankframework.flow.configuration;

import lombok.Getter;
import lombok.Setter;

@Setter
@Getter
public class Configuration {
    private String filepath;
    private String xmlContent;

    public Configuration(String filepath) {
        this.filepath = filepath;
        this.xmlContent = "<Configuration><Adapter name='new adapter'></Adapter></Configuration>";
    }
}
