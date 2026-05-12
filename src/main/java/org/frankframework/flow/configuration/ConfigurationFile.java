package org.frankframework.flow.configuration;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class ConfigurationFile {
	private String filepath;
	private String xmlContent;

	public ConfigurationFile(String filepath, String xmlContent) {
		this.filepath = filepath;
		this.xmlContent = xmlContent;
	}
}
