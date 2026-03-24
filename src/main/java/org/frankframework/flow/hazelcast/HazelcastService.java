package org.frankframework.flow.hazelcast;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.ArrayList;
import java.util.List;
import lombok.extern.slf4j.Slf4j;
import org.frankframework.management.bus.BusAction;
import org.frankframework.management.bus.BusMessageUtils;
import org.frankframework.management.bus.BusTopic;
import org.frankframework.management.bus.OutboundGateway;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.messaging.Message;
import org.springframework.messaging.support.MessageBuilder;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@ConditionalOnProperty(name = "hazelcast.enabled", havingValue = "true")
public class HazelcastService {

	private static final String WORKER_TYPE = "WORKER";

	private final ObjectProvider<OutboundGateway> outboundGatewayProvider;
	private final ObjectMapper objectMapper;

	public HazelcastService(ObjectProvider<OutboundGateway> outboundGatewayProvider, ObjectMapper objectMapper) {
		this.outboundGatewayProvider = outboundGatewayProvider;
		this.objectMapper = objectMapper;
	}

	public List<FrankInstanceDTO> getRemoteInstances() {
		OutboundGateway gateway = outboundGatewayProvider.getIfAvailable();
		if (gateway == null) {
			log.warn("OutboundGateway is not available");
			return List.of();
		}

		List<OutboundGateway.ClusterMember> members = gateway.getMembers();
		log.debug("Hazelcast cluster members: {}", members.size());

		return collectWorkerInstances(gateway, members);
	}

	private List<FrankInstanceDTO> collectWorkerInstances(OutboundGateway gateway, List<OutboundGateway.ClusterMember> members) {
		List<FrankInstanceDTO> result = new ArrayList<>();
		for (OutboundGateway.ClusterMember member : members) {
			if (!WORKER_TYPE.equalsIgnoreCase(member.getType())) {
				continue;
			}

			try {
				List<HazelcastConfigurationDTO> configurations = fetchConfigurations(gateway, member);
				result.add(toFrankInstance(member, configurations));
			} catch (Exception e) {
				log.debug("Member [{}] did not respond ({}), skipping", member.getName(), e.getMessage());
			}
		}
		return result;
	}

	private List<HazelcastConfigurationDTO> fetchConfigurations(OutboundGateway gateway, OutboundGateway.ClusterMember member) {
		log.debug("Fetching configurations from member name=[{}] id=[{}]", member.getName(), member.getId());
		Message<String> request = MessageBuilder.withPayload("NONE")
				.setHeader(BusTopic.TOPIC_HEADER_NAME, BusTopic.CONFIGURATION.name())
				.setHeader(BusAction.ACTION_HEADER_NAME, BusAction.FIND.name())
				.setHeader(BusMessageUtils.HEADER_TARGET_KEY, member.getId())
				.build();

		Message<?> response = gateway.sendSyncMessage(request);
		return parseConfigurations(response.getPayload());
	}

	private FrankInstanceDTO toFrankInstance(OutboundGateway.ClusterMember member, List<HazelcastConfigurationDTO> configurations) {
		List<String> directories = configurations.stream()
				.map(HazelcastConfigurationDTO::directory)
				.filter(directory -> directory != null && !directory.isBlank())
				.toList();

		return new FrankInstanceDTO(member.getName(), member.getId().toString(), directories, false);
	}

	private List<HazelcastConfigurationDTO> parseConfigurations(Object payload) {
		try {
			String json = payload instanceof String jsonString ? jsonString : objectMapper.writeValueAsString(payload);
			return List.of(objectMapper.readValue(json, HazelcastConfigurationDTO[].class));
		} catch (Exception e) {
			log.debug("Failed to parse configuration payload: {}", e.getMessage());
			return List.of();
		}
	}
}
