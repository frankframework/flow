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

    public String getFilepath() {
        return filepath;
    }

    public void setFilepath(String filepath) {
        this.filepath = filepath;
    }

    public String getXmlContent() {
        return this.xmlContent;
    }

    public void setXmlContent(String xmlContent) {
        this.xmlContent = xmlContent;
    }
}
