package org.frankframework.flow.project;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.util.unit.DataSize;

@ConfigurationProperties(prefix = "flow.import")
public record ImportProperties(DataSize maxUploadSize) {
	private static final DataSize DEFAULT_MAX_UPLOAD_SIZE = DataSize.ofMegabytes(80);

	public ImportProperties {
		if (maxUploadSize == null) {
			maxUploadSize = DEFAULT_MAX_UPLOAD_SIZE;
		}
	}
}
