package org.frankframework.flow.configuration;

public class ConfigurationDTO {
	public String name;
	public String version;
	public boolean stubbed;
	public String type;
	public String directory;

	public String parent;

	@Override
	public String toString() {
		return name;
	}
}
