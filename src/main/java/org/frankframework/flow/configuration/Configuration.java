package org.frankframework.flow.configuration;

public class Configuration {
	private String filename;
	private String xmlContent;

	public Configuration(String filename) {
		this.filename = filename;
		this.xmlContent = "<Configuration><Adapter name='new adapter'></Adapter></Configuration>";
	}

	public String getFilename() {
		return filename;
	}

	public void setFilename(String filename) {
		this.filename = filename;
	}
	public String getXmlContent() {
		return this.xmlContent;
	}

	public void setXmlContent(String xmlContent) {
		this.xmlContent = xmlContent;
	}
}
