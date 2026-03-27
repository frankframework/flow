package org.frankframework.flow.hazelcast;

import java.util.List;
import org.springframework.boot.autoconfigure.condition.ConditionalOnBean;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/hazelcast")
@ConditionalOnBean(HazelcastService.class)
public class HazelcastController {

	private final HazelcastService hazelcastService;

	public HazelcastController(HazelcastService hazelcastService) {
		this.hazelcastService = hazelcastService;
	}

	@GetMapping("/instances")
	public ResponseEntity<List<FrankInstanceDTO>> getInstances() {
		return ResponseEntity.ok(hazelcastService.getRemoteInstances());
	}
}
