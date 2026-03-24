package org.frankframework.flow.hazelcast;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@JsonIgnoreProperties(ignoreUnknown = true)
public record HazelcastConfigurationDTO(String name, String directory) {}
