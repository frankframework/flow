package org.frankframework.flow.configuration;

import lombok.Getter;
import lombok.Setter;
import org.frankframework.flow.utility.PathUtils;

@Getter
@Setter
public class ConfigurationFile {
	private String filepath;
	private String xmlContent;

	public ConfigurationFile(String filepath, String xmlContent) {
		// Store the filepath normalized to forward slashes so every consumer can compare paths consistently.
		this.filepath = PathUtils.toForwardSlash(filepath);
		this.xmlContent = xmlContent;
	}
}
