package org.frankframework.flow.test;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/test")
public class TestController {
	private final TestService testService;

	public TestController(TestService testService) {
		this.testService = testService;
	}

	@GetMapping
	public ResponseEntity<TestDTO> GetTestString() {
		return ResponseEntity.ok(new TestDTO(testService.GetTestString()));
	}
}
