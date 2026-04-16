package org.frankframework.flow.common.config;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

import jakarta.servlet.http.HttpServletRequest;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.HexFormat;
import java.util.List;
import java.util.UUID;
import org.frankframework.management.bus.OutboundGateway;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class ClientSessionTest {

	@Mock
	private OutboundGateway outboundGateway;

	@Mock
	private HttpServletRequest request;

	private ClientSession session;

	@BeforeEach
	void setUp() {
		when(request.getHeader("X-Session-ID")).thenReturn(null);
		session = new ClientSession(outboundGateway, request);
	}

	@Test
	void constructorWithSessionHeaderCreatesHashedWorkspaceId() throws Exception {
		when(request.getHeader("X-Session-ID")).thenReturn("my-session-id");

		// Recreate to test constructor behavior with overridden header
		session = new ClientSession(outboundGateway, request);

		assertEquals("anon-" + sha256First16("my-session-id"), session.getWorkspaceId());
	}

	@Test
	void constructorWithoutSessionHeaderUsesAnonymousWorkspaceId() {
		assertEquals("anonymous", session.getWorkspaceId());
	}

	@Test
	void constructorWithBlankSessionHeaderUsesAnonymousWorkspaceId() {
		when(request.getHeader("X-Session-ID")).thenReturn("   ");

		// Recreate to test constructor behavior with overridden header
		session = new ClientSession(outboundGateway, request);

		assertEquals("anonymous", session.getWorkspaceId());
	}

	@Test
	void afterPropertiesSetSelectsFirstWorkerAndSetsMemberTarget() throws Exception {
		OutboundGateway.ClusterMember nonWorker = mock(OutboundGateway.ClusterMember.class);
		when(nonWorker.getType()).thenReturn("console");

		UUID workerId = UUID.randomUUID();
		OutboundGateway.ClusterMember worker = mock(OutboundGateway.ClusterMember.class);
		when(worker.getType()).thenReturn("worker");
		when(worker.getId()).thenReturn(workerId);

		OutboundGateway.ClusterMember secondWorker = mock(OutboundGateway.ClusterMember.class);
		when(outboundGateway.getMembers()).thenReturn(List.of(nonWorker, worker, secondWorker));

		session.afterPropertiesSet();

		assertEquals(workerId, session.getMemberTarget());
		verify(worker).setSelectedMember(true);
		verify(secondWorker, never()).setSelectedMember(true);
	}

	@Test
	void afterPropertiesSetWithNoWorkerLeavesMemberTargetNull() throws Exception {
		OutboundGateway.ClusterMember member = mock(OutboundGateway.ClusterMember.class);
		when(member.getType()).thenReturn("console");

		when(outboundGateway.getMembers()).thenReturn(List.of(member));

		session.afterPropertiesSet();

		assertNull(session.getMemberTarget());
		verify(member, never()).setSelectedMember(true);
	}

	@Test
	void setMemberTargetStringParsesAndStoresUuid() {
		UUID id = UUID.randomUUID();

		session.setMemberTarget(id.toString());

		assertEquals(id, session.getMemberTarget());
	}

	private static String sha256First16(String input) throws Exception {
		MessageDigest digest = MessageDigest.getInstance("SHA-256");
		byte[] hash = digest.digest(input.getBytes(StandardCharsets.UTF_8));
		return HexFormat.of().formatHex(hash).substring(0, 16);
	}
}
