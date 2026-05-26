package org.frankframework.flow.sse;

import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNotSame;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

class SseChannelServiceTest {

	private SseChannelService service;

	@BeforeEach
	void setUp() {
		service = new SseChannelService();
	}

	@Test
	void subscribe_returnsEmitter() {
		assertNotNull(service.subscribe("channel"));
	}

	@Test
	void subscribe_multipleSubscribers_eachGetDistinctEmitter() {
		SseEmitter first = service.subscribe("channel");
		SseEmitter second = service.subscribe("channel");

		assertNotSame(first, second);
	}

	@Test
	void broadcast_emptyChannel_doesNotThrow() {
		service.broadcast("unknown", SseEmitter.event().name("test").data("data"));
	}

	@Test
	void broadcast_afterEmitterCompletes_doesNotThrow() {
		SseEmitter emitter = service.subscribe("channel");
		emitter.complete();

		service.broadcast("channel", SseEmitter.event().name("test").data("data"));
	}
}
