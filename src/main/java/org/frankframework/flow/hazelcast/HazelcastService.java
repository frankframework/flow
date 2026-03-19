package org.frankframework.flow.hazelcast;

import com.fasterxml.jackson.databind.ObjectMapper;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Duration;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

import lombok.extern.slf4j.Slf4j;

import org.frankframework.management.bus.BusAction;
import org.frankframework.management.bus.BusMessageUtils;
import org.frankframework.management.bus.BusTopic;
import org.frankframework.management.bus.OutboundGateway;

import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.integration.support.MessageBuilder;
import org.springframework.messaging.Message;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@ConditionalOnProperty(name = "hazelcast.enabled", havingValue = "true")
public class HazelcastService {

	private static final String WORKER_TYPE = "WORKER";
	private static final String CONFIGURATIONS_SUBPATH = "src/main/configurations";
	private static final HttpClient HTTP_CLIENT = HttpClient.newBuilder()
			.connectTimeout(Duration.ofSeconds(2))
			.build();

	@Value("${configurations.directory:}")
	private String configurationsDirectory;

	@Value("${frank.base.url:}")
	private String frankBaseUrl;

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
		members.forEach(m -> log.debug("  member: name={} address={} type={}", m.getName(), m.getAddress(), m.getType()));

		if (members.isEmpty()) {
			return fetchLocalInstance(gateway);
		}

		List<FrankInstanceDTO> result = new ArrayList<>();
		for (OutboundGateway.ClusterMember member : members) {
			try {
				List<String> projectPaths = fetchProjectPaths(gateway, member);
				if (!projectPaths.isEmpty()) {
					result.add(new FrankInstanceDTO(member.getName(), member.getId().toString(), projectPaths, false));
				}
			} catch (Exception e) {
				log.debug("Member [{}] did not respond ({}), skipping", member.getName(), e.getMessage());
			}
		}
		return result;
	}

	private List<FrankInstanceDTO> fetchLocalInstance(OutboundGateway outboundGateway) {
		if (configurationsDirectory == null || configurationsDirectory.isBlank()) {
			return List.of();
		}
		if (!Files.isDirectory(Path.of(configurationsDirectory))) {
			log.debug("Configurations directory [{}] does not exist", configurationsDirectory);
			return List.of();
		}
		if (!isFrankAlive()) {
			log.debug("Frank at [{}] did not respond", frankBaseUrl);
			return List.of();
		}
		try {
			Message<String> request = MessageBuilder.withPayload("NONE")
					.setHeader(BusTopic.TOPIC_HEADER_NAME, BusTopic.CONFIGURATION.name())
					.setHeader(BusAction.ACTION_HEADER_NAME, BusAction.FIND.name())
					.build();
			Message<?> response = outboundGateway.sendSyncMessage(request);
			List<String> projectPaths = parseProjectPaths(response.getPayload());
			String name = projectPaths.isEmpty() ? "local" : Path.of(projectPaths.getFirst()).getFileName().toString();
			return List.of(new FrankInstanceDTO(name, null, projectPaths, true));
		} catch (Exception e) {
			log.debug("Failed to fetch local configurations: {}", e.getMessage());
			return List.of();
		}
	}

	private boolean isFrankAlive() {
		if (frankBaseUrl == null || frankBaseUrl.isBlank()) {
			log.debug("frank.base.url not configured, cannot check liveness");
			return false;
		}
		try {
			HttpRequest request = HttpRequest.newBuilder()
					.uri(URI.create(frankBaseUrl + "/iaf/api/server/health"))
					.timeout(Duration.ofSeconds(2))
					.GET()
					.build();
			HttpResponse<String> response = HTTP_CLIENT.send(request, HttpResponse.BodyHandlers.ofString());
			// Verify it's actually Frank by checking for the "status" field in the JSON response body
			return response.body() != null && response.body().contains("\"status\"");
		} catch (Exception e) {
			log.debug("Frank liveness check failed for [{}]: {}", frankBaseUrl, e.getMessage());
			return false;
		}
	}

	private List<String> fetchProjectPaths(OutboundGateway outboundGateway, OutboundGateway.ClusterMember member) {
		log.debug("Fetching project paths from member name=[{}] id=[{}] type=[{}] address=[{}]",
				member.getName(), member.getId(), member.getType(), member.getAddress());
		Message<String> request = MessageBuilder.withPayload("NONE")
				.setHeader(BusTopic.TOPIC_HEADER_NAME, BusTopic.CONFIGURATION.name())
				.setHeader(BusAction.ACTION_HEADER_NAME, BusAction.FIND.name())
				.setHeader(BusMessageUtils.HEADER_TARGET_KEY, member.getId().toString())
				.build();
		Message<?> response = outboundGateway.sendSyncMessage(request);
		log.debug("Response payload from member [{}]: {}", member.getName(), response.getPayload());
		return parseProjectPaths(response.getPayload());
	}

	/**
	 * Parses the bus response payload into a list of unique project root paths.
	 * The payload is expected to be a JSON array of {@link HazelcastConfigurationDTO} objects,
	 * each containing a {@code directory} field pointing to an individual configuration folder.
	 */
	private List<String> parseProjectPaths(Object payload) {
		if (payload == null) {
			return List.of();
		}
		try {
			String json = payload instanceof String s ? s : objectMapper.writeValueAsString(payload);
			HazelcastConfigurationDTO[] configs = objectMapper.readValue(json, HazelcastConfigurationDTO[].class);
			Set<String> projectRoots = new LinkedHashSet<>();
			for (HazelcastConfigurationDTO config : configs) {
				String dir = config.getDirectory();
				if (dir != null && !dir.isBlank()) {
					String projectRoot = deriveProjectRoot(dir);
					if (projectRoot != null) {
						projectRoots.add(projectRoot);
					}
				}
			}
			return new ArrayList<>(projectRoots);
		} catch (Exception e) {
			log.debug("Failed to parse configuration payload: {}", e.getMessage());
			return List.of();
		}
	}

	/**
	 * Derives the Frank project root from a configuration subdirectory path.
	 * <ul>
	 *   <li>Maven layout: {@code /project/src/main/configurations/ConfigName} → {@code /project}</li>
	 *   <li>Standard layout: {@code /project/configurations/ConfigName} → {@code /project}</li>
	 * </ul>
	 */
	private String deriveProjectRoot(String configDirectory) {
		if (configDirectory == null || configDirectory.isBlank()) {
			return null;
		}
		String normalized = configDirectory.replace("\\", "/");
		// Maven layout: strip everything from src/main/configurations onward
		int idx = normalized.indexOf(CONFIGURATIONS_SUBPATH);
		if (idx >= 0) {
			return configDirectory.substring(0, idx).replaceAll("[/\\\\]+$", "");
		}
		// Standard layout: configDirectory is one level below the configurations folder,
		// which is one level below the project root → go up two levels
		Path path = Path.of(configDirectory);
		Path configurationsDir = path.getParent();
		if (configurationsDir != null && configurationsDir.getParent() != null) {
			return configurationsDir.getParent().toString();
		}
		return configurationsDir != null ? configurationsDir.toString() : configDirectory;
	}
}
