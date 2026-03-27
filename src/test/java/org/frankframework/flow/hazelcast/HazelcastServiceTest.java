package org.frankframework.flow.hazelcast;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doReturn;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.nio.file.Path;
import java.util.List;
import java.util.UUID;
import org.frankframework.management.bus.OutboundGateway;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.messaging.support.MessageBuilder;

@ExtendWith(MockitoExtension.class)
public class HazelcastServiceTest {

	@Mock
	private ObjectProvider<OutboundGateway> outboundGatewayProvider;

	@Mock
	private OutboundGateway outboundGateway;

	private HazelcastService hazelcastService;

	@BeforeEach
	public void setUp() {
		hazelcastService = new HazelcastService(outboundGatewayProvider, new ObjectMapper());
	}

	@Test
	public void getRemoteInstances_gatewayUnavailable_returnsEmpty() {
		when(outboundGatewayProvider.getIfAvailable()).thenReturn(null);

		assertTrue(hazelcastService.getRemoteInstances().isEmpty());
	}

	@Test
	public void getRemoteInstances_noMembers_returnsLocalInstance() {
		when(outboundGatewayProvider.getIfAvailable()).thenReturn(outboundGateway);
		when(outboundGateway.getMembers()).thenReturn(List.of());
		doReturn(MessageBuilder.withPayload(
				"[{\"name\":\"Config1\",\"directory\":\"/projects/MyProject/configurations/Config1\"}]"
		).build()).when(outboundGateway).sendSyncMessage(any());

		List<FrankInstanceDTO> result = hazelcastService.getRemoteInstances();

		assertEquals(1, result.size());
		assertEquals("MyProject", result.getFirst().name());
		assertEquals("local", result.getFirst().id());
		assertEquals(Path.of("/projects/MyProject").toString(), result.getFirst().projectPath());
	}

	@Test
	public void getRemoteInstances_localMode_emptyConfigurations_returnsEmpty() {
		when(outboundGatewayProvider.getIfAvailable()).thenReturn(outboundGateway);
		when(outboundGateway.getMembers()).thenReturn(List.of());
		doReturn(MessageBuilder.withPayload("[]").build()).when(outboundGateway).sendSyncMessage(any());

		assertTrue(hazelcastService.getRemoteInstances().isEmpty());
	}

	@Test
	public void getRemoteInstances_workerMember_returnsInstance() {
		UUID memberId = UUID.randomUUID();
		OutboundGateway.ClusterMember worker = mockMember(memberId);

		when(outboundGatewayProvider.getIfAvailable()).thenReturn(outboundGateway);
		when(outboundGateway.getMembers()).thenReturn(List.of(worker));
		doReturn(MessageBuilder.withPayload(
				"[{\"name\":\"Config1\",\"directory\":\"/projects/Frank2Example1/configurations/Config1\"}]"
		).build()).when(outboundGateway).sendSyncMessage(any());

		List<FrankInstanceDTO> result = hazelcastService.getRemoteInstances();

		assertEquals(1, result.size());
		assertEquals("Frank2Example1", result.getFirst().name());
		assertEquals(memberId.toString(), result.getFirst().id());
		assertEquals(Path.of("/projects/Frank2Example1").toString(), result.getFirst().projectPath());
	}

	@Test
	public void getRemoteInstances_nonWorkerMember_isSkipped() {
		OutboundGateway.ClusterMember controller = mock(OutboundGateway.ClusterMember.class);
		when(controller.getType()).thenReturn("CONTROLLER");

		when(outboundGatewayProvider.getIfAvailable()).thenReturn(outboundGateway);
		when(outboundGateway.getMembers()).thenReturn(List.of(controller));

		assertTrue(hazelcastService.getRemoteInstances().isEmpty());
	}

	@Test
	public void getRemoteInstances_memberDoesNotRespond_isSkipped() {
		OutboundGateway.ClusterMember worker = mock(OutboundGateway.ClusterMember.class);
		when(worker.getType()).thenReturn("WORKER");
		when(worker.getName()).thenReturn("Frank2Example1");

		when(outboundGatewayProvider.getIfAvailable()).thenReturn(outboundGateway);
		when(outboundGateway.getMembers()).thenReturn(List.of(worker));
		when(outboundGateway.sendSyncMessage(any())).thenThrow(new RuntimeException("timeout"));

		assertTrue(hazelcastService.getRemoteInstances().isEmpty());
	}

	@Test
	public void getRemoteInstances_mavenProjectStructure_derivesProjectRoot() {
		when(outboundGatewayProvider.getIfAvailable()).thenReturn(outboundGateway);
		when(outboundGateway.getMembers()).thenReturn(List.of());
		doReturn(MessageBuilder.withPayload(
				"[{\"name\":\"Config1\",\"directory\":\"/projects/MyProject/src/main/configurations/Config1\"}]"
		).build()).when(outboundGateway).sendSyncMessage(any());

		List<FrankInstanceDTO> result = hazelcastService.getRemoteInstances();

		assertEquals(Path.of("/projects/MyProject").toString(), result.getFirst().projectPath());
	}

	@Test
	public void getRemoteInstances_noConfigurationsInPath_returnsDirectoryAsIs() {
		when(outboundGatewayProvider.getIfAvailable()).thenReturn(outboundGateway);
		when(outboundGateway.getMembers()).thenReturn(List.of());
		doReturn(MessageBuilder.withPayload(
				"[{\"name\":\"Config1\",\"directory\":\"/projects/MyProject/unknown/Config1\"}]"
		).build()).when(outboundGateway).sendSyncMessage(any());

		List<FrankInstanceDTO> result = hazelcastService.getRemoteInstances();

		assertEquals("/projects/MyProject/unknown/Config1", result.getFirst().projectPath());
	}

	@Test
	public void getRemoteInstances_nullDirectory_projectPathIsNull() {
		when(outboundGatewayProvider.getIfAvailable()).thenReturn(outboundGateway);
		when(outboundGateway.getMembers()).thenReturn(List.of());
		doReturn(MessageBuilder.withPayload(
				"[{\"name\":\"Config1\",\"directory\":null}]"
		).build()).when(outboundGateway).sendSyncMessage(any());

		List<FrankInstanceDTO> result = hazelcastService.getRemoteInstances();

		assertEquals(1, result.size());
		assertNull(result.getFirst().projectPath());
	}

	private OutboundGateway.ClusterMember mockMember(UUID id) {
		OutboundGateway.ClusterMember member = mock(OutboundGateway.ClusterMember.class);
		when(member.getName()).thenReturn("Frank2Example1");
		when(member.getId()).thenReturn(id);
		when(member.getType()).thenReturn("WORKER");
		return member;
	}
}
