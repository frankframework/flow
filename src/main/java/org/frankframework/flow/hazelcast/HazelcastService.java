package org.frankframework.flow.hazelcast;

import com.fasterxml.jackson.databind.JsonNode;
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
		members.forEach(m -> log.debug("  member: name={} address={} type={} attributes={}", m.getName(), m.getAddress(), m.getType(), m.getAttributes()));

		List<FrankInstanceDTO> result = new ArrayList<>();
		for (OutboundGateway.ClusterMember member : members) {
			if (!WORKER_TYPE.equalsIgnoreCase(member.getType())) {
				continue;
			}
			try {
				List<String> projectPaths = fetchProjectPaths(gateway, member);
				if (!projectPaths.isEmpty()) {
					result.add(new FrankInstanceDTO(member.getName(), member.getId().toString(), projectPaths, false));
				}
			} catch (Exception e) {
				log.debug("Member [{}] did not respond ({}), skipping", member.getName(), e.getMessage());
			}
		}

		// No WORKER members responded — fall back to frank.base.url-based discovery
		if (result.isEmpty()) {
			result.addAll(fetchLocalInstance(gateway));
		}
		return result;
	}

	private List<FrankInstanceDTO> fetchLocalInstance(OutboundGateway outboundGateway) {
		if (frankBaseUrl == null || frankBaseUrl.isBlank()) {
			return List.of();
		}
		if (!isFrankAlive()) {
			log.debug("Frank at [{}] did not respond", frankBaseUrl);
			return List.of();
		}

		// If configurations.directory is set, query the local management bus for project paths
		if (configurationsDirectory != null && !configurationsDirectory.isBlank()
				&& Files.isDirectory(Path.of(configurationsDirectory))) {
			try {
				Message<String> request = MessageBuilder.withPayload("NONE")
						.setHeader(BusTopic.TOPIC_HEADER_NAME, BusTopic.CONFIGURATION.name())
						.setHeader(BusAction.ACTION_HEADER_NAME, BusAction.FIND.name())
						.build();
				Message<?> response = outboundGateway.sendSyncMessage(request);
				List<String> projectPaths = parseProjectPaths(response.getPayload());
				String name = projectPaths.isEmpty() ? fetchInstanceName() : Path.of(projectPaths.getFirst()).getFileName().toString();
				return List.of(new FrankInstanceDTO(name, null, projectPaths, true));
			} catch (Exception e) {
				log.debug("Failed to fetch local configurations via bus: {}", e.getMessage());
			}
		}

		// Fall back: query Frank HTTP API directly for name and configuration paths
		return fetchInstanceViaHttp();
	}

	private List<FrankInstanceDTO> fetchInstanceViaHttp() {
		String name = fetchInstanceName();
		List<String> projectPaths = fetchProjectPathsViaHttp();
		if (projectPaths.isEmpty()) {
			log.debug("No project paths found for Frank at [{}]", frankBaseUrl);
		}
		return List.of(new FrankInstanceDTO(name, null, projectPaths, true));
	}

	private String fetchInstanceName() {
		try {
			HttpRequest request = HttpRequest.newBuilder()
					.uri(URI.create(frankBaseUrl + "/iaf/api/server/info"))
					.timeout(Duration.ofSeconds(2))
					.GET()
					.build();
			HttpResponse<String> response = HTTP_CLIENT.send(request, HttpResponse.BodyHandlers.ofString());
			if (response.statusCode() == 200) {
				JsonNode root = objectMapper.readTree(response.body());
				// Try multiple possible response structures
				for (String path : new String[]{"instance/name", "instanceName", "name"}) {
					String[] parts = path.split("/");
					JsonNode node = root;
					for (String part : parts) {
						node = node.path(part);
					}
					String text = node.asText(null);
					if (text != null && !text.isBlank() && !"null".equals(text)) {
						return text;
					}
				}
			}
		} catch (Exception e) {
			log.debug("Failed to fetch instance name from [{}]: {}", frankBaseUrl, e.getMessage());
		}
		return deriveName(frankBaseUrl);
	}

	private List<String> fetchProjectPathsViaHttp() {
		try {
			HttpRequest request = HttpRequest.newBuilder()
					.uri(URI.create(frankBaseUrl + "/iaf/api/server/configurations"))
					.timeout(Duration.ofSeconds(2))
					.header("Accept", "application/json")
					.GET()
					.build();
			HttpResponse<String> response = HTTP_CLIENT.send(request, HttpResponse.BodyHandlers.ofString());
			if (response.statusCode() == 200 && response.body().trim().startsWith("[")) {
				return parseProjectPaths(response.body());
			}
		} catch (Exception e) {
			log.debug("Failed to fetch configurations: {}", e.getMessage());
		}
		return List.of();
	}


	private String deriveName(String url) {
		try {
			URI uri = URI.create(url);
			String host = uri.getHost();
			int port = uri.getPort();
			if (port > 0 && port != 80 && port != 443) {
				return host + ":" + port;
			}
			return host != null ? host : url;
		} catch (Exception e) {
			return url;
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
