package org.frankframework.flow.hazelcast;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.concurrent.atomic.AtomicReference;
import org.frankframework.management.bus.BusAction;
import org.frankframework.management.bus.BusTopic;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.api.io.TempDir;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.SubscribableChannel;
import org.springframework.messaging.support.MessageBuilder;
import org.springframework.test.util.ReflectionTestUtils;

@ExtendWith(MockitoExtension.class)
public class ConfigurationsDirectoryTest {

	@Mock
	private SubscribableChannel managementBusChannel;

	@TempDir
	Path tempDir;

	private ConfigurationsDirectory configurationsDirectory;

	@BeforeEach
	public void setUp() {
		configurationsDirectory = new ConfigurationsDirectory(managementBusChannel);
	}

	@Test
	public void handleMessage_nonConfigurationFindRequest_isIgnored() {
		setDirectory(tempDir.toString());
		Message<?> message = MessageBuilder.withPayload("NONE")
				.setHeader(BusTopic.TOPIC_HEADER_NAME, "ADAPTER")
				.setHeader(BusAction.ACTION_HEADER_NAME, BusAction.FIND.name())
				.build();

		configurationsDirectory.handleMessage(message);

		verify(managementBusChannel, never()).subscribe(any());
	}

	@Test
	public void handleMessage_noReplyChannel_doesNotThrow() {
		setDirectory(tempDir.toString());
		Message<?> message = MessageBuilder.withPayload("NONE")
				.setHeader(BusTopic.TOPIC_HEADER_NAME, BusTopic.CONFIGURATION.name())
				.setHeader(BusAction.ACTION_HEADER_NAME, BusAction.FIND.name())
				.build();

		configurationsDirectory.handleMessage(message);
	}

	@Test
	public void handleMessage_configurationFindRequest_sendsResponseOnReplyChannel() throws IOException {
		Path configurationsDir = tempDir.resolve("configurations");
		Files.createDirectory(configurationsDir);
		Files.createDirectory(configurationsDir.resolve("Config1"));
		Files.createDirectory(configurationsDir.resolve("Config2"));
		setDirectory(tempDir.toString());

		AtomicReference<Message<?>> sentMessage = new AtomicReference<>();
		MessageChannel replyChannel = (message, timeout) -> {
			sentMessage.set(message);
			return true;
		};

		Message<?> request = MessageBuilder.withPayload("NONE")
				.setHeader(BusTopic.TOPIC_HEADER_NAME, BusTopic.CONFIGURATION.name())
				.setHeader(BusAction.ACTION_HEADER_NAME, BusAction.FIND.name())
				.setReplyChannel(replyChannel)
				.build();

		configurationsDirectory.handleMessage(request);

		String payload = (String) sentMessage.get().getPayload();
		assertTrue(payload.contains("Config1"));
		assertTrue(payload.contains("Config2"));
	}

	@Test
	public void resolveConfigurationsDirectory_withConfigurationsSubfolder_usesSubfolder() throws IOException {
		Path configurationsDir = tempDir.resolve("configurations");
		Files.createDirectory(configurationsDir);
		Files.createDirectory(configurationsDir.resolve("Config1"));
		setDirectory(tempDir.toString());

		AtomicReference<Message<?>> sentMessage = new AtomicReference<>();
		MessageChannel replyChannel = (message, timeout) -> {
			sentMessage.set(message);
			return true;
		};

		Message<?> request = configurationFindRequest(replyChannel);
		configurationsDirectory.handleMessage(request);

		String payload = (String) sentMessage.get().getPayload();
		assertTrue(payload.contains("Config1"));
	}

	@Test
	public void resolveConfigurationsDirectory_withoutConfigurationsSubfolder_usesDirectoryItself() throws IOException {
		Files.createDirectory(tempDir.resolve("Config1"));
		setDirectory(tempDir.toString());

		AtomicReference<Message<?>> sentMessage = new AtomicReference<>();
		MessageChannel replyChannel = (message, timeout) -> {
			sentMessage.set(message);
			return true;
		};

		Message<?> request = configurationFindRequest(replyChannel);
		configurationsDirectory.handleMessage(request);

		String payload = (String) sentMessage.get().getPayload();
		assertTrue(payload.contains("Config1"));
	}

	@Test
	public void resolveConfigurationsDirectory_filesAreExcluded() throws IOException {
		Path configurationsDir = tempDir.resolve("configurations");
		Files.createDirectory(configurationsDir);
		Files.createDirectory(configurationsDir.resolve("Config1"));
		Files.createFile(configurationsDir.resolve(".gitignore"));
		Files.createFile(configurationsDir.resolve("FrankConfig.xsd"));
		setDirectory(tempDir.toString());

		AtomicReference<Message<?>> sentMessage = new AtomicReference<>();
		MessageChannel replyChannel = (message, timeout) -> {
			sentMessage.set(message);
			return true;
		};

		Message<?> request = configurationFindRequest(replyChannel);
		configurationsDirectory.handleMessage(request);

		String payload = (String) sentMessage.get().getPayload();
		assertTrue(payload.contains("Config1"));
		assertFalse(payload.contains(".gitignore"));
		assertFalse(payload.contains("FrankConfig.xsd"));
	}

	@Test
	public void resolveConfigurationsDirectory_nonExistentPath_throwsIllegalState() {
		setDirectory("/non/existent/path");
		MessageChannel replyChannel = (message, timeout) -> true;
		Message<?> request = configurationFindRequest(replyChannel);

		assertThrows(IllegalStateException.class, () -> configurationsDirectory.handleMessage(request));
	}

	private void setDirectory(String path) {
		ReflectionTestUtils.setField(configurationsDirectory, "configurationsDirectory", path);
	}

	private Message<?> configurationFindRequest(MessageChannel replyChannel) {
		return MessageBuilder.withPayload("NONE")
				.setHeader(BusTopic.TOPIC_HEADER_NAME, BusTopic.CONFIGURATION.name())
				.setHeader(BusAction.ACTION_HEADER_NAME, BusAction.FIND.name())
				.setReplyChannel(replyChannel)
				.build();
	}
}
