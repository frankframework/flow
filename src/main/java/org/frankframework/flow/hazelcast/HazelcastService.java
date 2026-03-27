package org.frankframework.flow.hazelcast;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.nio.file.Path;
import java.nio.file.Paths;
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
		log.info("Hazelcast cluster members: {}", members.size());

		if (members.isEmpty()) {
			return collectLocalInstance(gateway);
		}

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
				result.add(toFrankInstance(member.getName(), member.getId().toString(), configurations));
			} catch (Exception e) {
				log.warn("Member [{}] did not respond ({}), skipping", member.getName(), e.getMessage());
			}
		}
		return result;
	}

	private List<FrankInstanceDTO> collectLocalInstance(OutboundGateway gateway) {
		try {
			List<HazelcastConfigurationDTO> configurations = fetchConfigurations(gateway, null);
			if (configurations.isEmpty()) {
				return List.of();
			}

			String projectPath = configurations.stream()
					.map(HazelcastConfigurationDTO::directory)
					.filter(directory -> directory != null && !directory.isBlank())
					.map(HazelcastService::deriveProjectPath)
					.findFirst()
					.orElse(null);
			String name = projectPath != null ? Paths.get(projectPath).getFileName().toString() : "local";
			return List.of(new FrankInstanceDTO(name, "local", projectPath));
		} catch (Exception e) {
			log.warn("Local gateway did not respond ({}), skipping", e.getMessage());
			return List.of();
		}
	}

	private List<HazelcastConfigurationDTO> fetchConfigurations(OutboundGateway gateway, OutboundGateway.ClusterMember member) {
		log.info("Fetching configurations from member name=[{}]", member != null ? member.getName() : "local");
		MessageBuilder<String> builder = MessageBuilder.withPayload("NONE")
				.setHeader(BusTopic.TOPIC_HEADER_NAME, BusTopic.CONFIGURATION.name())
				.setHeader(BusAction.ACTION_HEADER_NAME, BusAction.FIND.name());

		if (member != null) {
			builder.setHeader(BusMessageUtils.HEADER_TARGET_KEY, member.getId());
		}

		Message<?> response = gateway.sendSyncMessage(builder.build());
		return parseConfigurations(response.getPayload());
	}

	private FrankInstanceDTO toFrankInstance(String name, String id, List<HazelcastConfigurationDTO> configurations) {
		String projectPath = configurations.stream()
				.map(HazelcastConfigurationDTO::directory)
				.filter(directory -> directory != null && !directory.isBlank())
				.map(HazelcastService::deriveProjectPath)
				.findFirst()
				.orElse(null);

		return new FrankInstanceDTO(name, id, projectPath);
	}

	private List<HazelcastConfigurationDTO> parseConfigurations(Object payload) {
		try {
			String json = payload instanceof String jsonString ? jsonString : objectMapper.writeValueAsString(payload);
			return List.of(objectMapper.readValue(json, HazelcastConfigurationDTO[].class));
		} catch (Exception e) {
			log.warn("Failed to parse configuration payload: {}", e.getMessage());
			return List.of();
		}
	}

	// TODO: remove when flow becomes configuration-based instead of project-based
	private static String deriveProjectPath(String configDirectory) {
		Path path = Paths.get(configDirectory);
		int projectRootIndex = findProjectRootIndex(path);
		if (projectRootIndex < 0) {
			return configDirectory;
		}
		return buildPathUpTo(path, projectRootIndex);
	}

	private static int findProjectRootIndex(Path path) {
		for (int i = 0; i < path.getNameCount(); i++) {
			if ("configurations".equalsIgnoreCase(path.getName(i).toString())) {
				return isMavenStructure(path, i) ? i - getMavenPrefixLength() : i;
			}
		}
		return -1;
	}

	private static boolean isMavenStructure(Path path, int configurationsIndex) {
		int srcIndex = configurationsIndex - getMavenPrefixLength();
		int mainIndex = configurationsIndex - 1;
		return srcIndex >= 0
				&& "src".equalsIgnoreCase(path.getName(srcIndex).toString())
				&& "main".equalsIgnoreCase(path.getName(mainIndex).toString());
	}

	private static int getMavenPrefixLength() {
		return "src/main".split("/").length;
	}

	private static String buildPathUpTo(Path path, int index) {
		return index == 0
				? path.getRoot().toString()
				: path.getRoot().resolve(path.subpath(0, index)).toString();
	}
}
