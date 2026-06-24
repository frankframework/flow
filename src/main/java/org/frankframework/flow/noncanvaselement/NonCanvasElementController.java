package org.frankframework.flow.noncanvaselement;

import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/projects/{projectName}/non-canvas-elements")
public class NonCanvasElementController {

	private final NonCanvasElementService nonCanvasElementService;

	public NonCanvasElementController(NonCanvasElementService nonCanvasElementService) {
		this.nonCanvasElementService = nonCanvasElementService;
	}

	@GetMapping
	public ResponseEntity<List<NonCanvasElementDTO>> getNonCanvasElements(@RequestParam String configurationPath) {
		return ResponseEntity.ok(nonCanvasElementService.getNonCanvasElements(configurationPath));
	}

	@PostMapping
	public ResponseEntity<List<NonCanvasElementDTO>> addNonCanvasElement(@RequestBody NonCanvasElementCreateDTO request) {
		List<NonCanvasElementDTO> elements =
				nonCanvasElementService.addNonCanvasElement(request.configurationPath(), request.tagName(), request.attributes());
		return ResponseEntity.ok(elements);
	}

	@PutMapping
	public ResponseEntity<List<NonCanvasElementDTO>> updateNonCanvasElement(@RequestBody NonCanvasElementUpdateDTO request) {
		List<NonCanvasElementDTO> elements = nonCanvasElementService.updateNonCanvasElement(
				request.configurationPath(), request.tagName(), request.index(), request.attributes());
		return ResponseEntity.ok(elements);
	}

	@DeleteMapping
	public ResponseEntity<List<NonCanvasElementDTO>> deleteNonCanvasElement(
			@RequestParam String configurationPath,
			@RequestParam String tagName,
			@RequestParam int index) {
		List<NonCanvasElementDTO> elements = nonCanvasElementService.deleteNonCanvasElement(configurationPath, tagName, index);
		return ResponseEntity.ok(elements);
	}
}
