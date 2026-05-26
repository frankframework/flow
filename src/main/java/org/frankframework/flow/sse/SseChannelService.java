package org.frankframework.flow.sse;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

@Service
public class SseChannelService {

	private final Map<String, List<SseEmitter>> channelEmitters = new ConcurrentHashMap<>();

	public SseEmitter subscribe(String channelId) {
		SseEmitter emitter = new SseEmitter(0L);
		channelEmitters.computeIfAbsent(channelId, _ -> new CopyOnWriteArrayList<>()).add(emitter);
		Runnable cleanup = () -> removeFromChannel(channelId, emitter);
		emitter.onCompletion(cleanup);
		emitter.onTimeout(cleanup);
		emitter.onError(_ -> cleanup.run());
		return emitter;
	}

	public void broadcast(String channelId, SseEmitter.SseEventBuilder event) {
		List<SseEmitter> emitters = channelEmitters.get(channelId);
		if (emitters == null || emitters.isEmpty()) {
			return;
		}

		List<SseEmitter> dead = new ArrayList<>();
		for (SseEmitter emitter : emitters) {
			try {
				emitter.send(event);
			} catch (Exception exception) {
				dead.add(emitter);
			}
		}

		emitters.removeAll(dead);
	}

	private void removeFromChannel(String channelId, SseEmitter emitter) {
		List<SseEmitter> list = channelEmitters.get(channelId);
		if (list != null) {
			list.remove(emitter);
		}
	}
}
