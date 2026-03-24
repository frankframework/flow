package org.frankframework.flow.hazelcast;

import jakarta.annotation.PostConstruct;
import java.io.File;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import lombok.extern.slf4j.Slf4j;
import org.frankframework.management.bus.BusAction;
import org.frankframework.management.bus.BusTopic;
import org.frankframework.management.bus.message.JsonMessage;
import org.jspecify.annotations.NullMarked;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnExpression;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.MessageHandler;
import org.springframework.messaging.SubscribableChannel;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@ConditionalOnExpression("'${configurations.directory:}'.trim() != ''")
public class ConfigurationsDirectory implements MessageHandler {

	@Value("${configurations.directory:}")
	private String configurationsDirectory;

	private final SubscribableChannel managementBusChannel;

	public ConfigurationsDirectory(@Qualifier("frank-management-bus") SubscribableChannel managementBusChannel) {
		this.managementBusChannel = managementBusChannel;
	}

	@PostConstruct
	public void subscribe() {
		managementBusChannel.subscribe(this);
	}

	@Override
	@NullMarked
	public void handleMessage(Message<?> message) {
		if (!isConfigurationFindRequest(message)) {
			return;
		}

		Object replyChannelObject = message.getHeaders().getReplyChannel();
		if (!(replyChannelObject instanceof MessageChannel replyChannel)) {
			log.warn("No reply channel in message headers, cannot respond");
			return;
		}

		try {
			replyChannel.send(buildConfigurationsResponse());
		} catch (Exception e) {
			log.error("Error building configurations response", e);
		}
	}

	private boolean isConfigurationFindRequest(Message<?> message) {
		String topic = (String) message.getHeaders().get(BusTopic.TOPIC_HEADER_NAME);
		String action = (String) message.getHeaders().get(BusAction.ACTION_HEADER_NAME);

		return BusTopic.CONFIGURATION.name().equalsIgnoreCase(topic)
				&& BusAction.FIND.name().equalsIgnoreCase(action);
	}

	private Message<String> buildConfigurationsResponse() {
		File directory = resolveConfigurationsDirectory();
		File[] folders = directory.listFiles();

		if (folders == null) {
			log.warn("Failed to list files in configurations directory [{}]", configurationsDirectory);
			return new JsonMessage(Collections.emptyList());
		}

		List<HazelcastConfigurationDTO> configurations = Arrays.stream(folders)
				.map(folder -> new HazelcastConfigurationDTO(folder.getName(), folder.getAbsolutePath()))
				.toList();

		return new JsonMessage(configurations);
	}

	private File resolveConfigurationsDirectory() {
		File directory = new File(configurationsDirectory);

		if (!directory.exists()) {
			throw new IllegalStateException("Path [" + configurationsDirectory + "] does not exist");
		}

		if (!directory.isDirectory()) {
			throw new IllegalStateException("Path [" + configurationsDirectory + "] is not a directory");
		}

		return directory;
	}
}
