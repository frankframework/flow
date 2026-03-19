package org.frankframework.flow.common.properties;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;

@Getter
@Setter
@ConfigurationProperties(prefix = "hazelcast")
public class HazelcastProperties {
	private boolean enabled = false;
}
