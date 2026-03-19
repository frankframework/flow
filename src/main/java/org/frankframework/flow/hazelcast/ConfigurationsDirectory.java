package org.frankframework.flow.hazelcast;


import java.io.File;
import java.util.ArrayList;
import java.util.List;

import jakarta.annotation.PostConstruct;

import lombok.extern.slf4j.Slf4j;

import org.frankframework.management.bus.BusAction;
import org.frankframework.management.bus.BusTopic;
import org.frankframework.management.bus.message.JsonMessage;

import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.MessageHandler;
import org.springframework.messaging.SubscribableChannel;
import org.springframework.stereotype.Component;


@Slf4j
@Component
@ConditionalOnProperty(name = "configurations.directory", matchIfMissing = false)
public class ConfigurationsDirectory implements MessageHandler {

	@Value("${configurations.directory:}")
	private String configurationsDirectory;

	private final SubscribableChannel managementBusChannel;

	public ConfigurationsDirectory(@Qualifier("frank-management-bus") MessageChannel managementBusChannel) {
		this.managementBusChannel = (SubscribableChannel) managementBusChannel;
	}

	@PostConstruct
	public void subscribe() {
		managementBusChannel.subscribe(this);
		log.debug("Subscribed to frank-management-bus for CONFIGURATION/FIND");
	}

	@Override
	public void handleMessage(Message<?> message) {
		String topic = (String) message.getHeaders().get(BusTopic.TOPIC_HEADER_NAME);
		String action = (String) message.getHeaders().get(BusAction.ACTION_HEADER_NAME);

		if (!BusTopic.CONFIGURATION.name().equalsIgnoreCase(topic)
				|| !BusAction.FIND.name().equalsIgnoreCase(action)) {
			return;
		}

		Object replyChannelObj = message.getHeaders().getReplyChannel();
		if (!(replyChannelObj instanceof MessageChannel replyChannel)) {
			log.warn("No reply channel in message headers, cannot respond");
			return;
		}

		try {
			Message<String> response = buildConfigurationsResponse();
			replyChannel.send(response);
		} catch (Exception e) {
			log.error("Error building configurations response", e);
		}
	}

	private Message<String> buildConfigurationsResponse() {
		List<HazelcastConfigurationDTO> configurations = new ArrayList<>();
		for (File folder : resolveConfigurationsDir().listFiles()) {
			HazelcastConfigurationDTO dto = new HazelcastConfigurationDTO();
			dto.setName(folder.getName());
			dto.setDirectory(folder.getAbsolutePath());
			configurations.add(dto);
		}
		return new JsonMessage(configurations);
	}

	private File resolveConfigurationsDir() {
		log.debug("using configurations.directory [{}]", configurationsDirectory);
		File dir = new File(configurationsDirectory);

		if (!dir.exists()) {
			throw new IllegalStateException("path [" + configurationsDirectory + "] doesn't not exist");
		}
		if (!dir.isDirectory()) {
			throw new IllegalStateException("path [" + configurationsDirectory + "] is not a directory");
		}
		return dir;
	}
}
