package org.frankframework.flow.noncanvascomponent;

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
@RequestMapping("/projects/{projectName}/non-canvas-components")
public class NonCanvasComponentController {

	private final NonCanvasComponentService nonCanvasComponentService;

	public NonCanvasComponentController(NonCanvasComponentService nonCanvasComponentService) {
		this.nonCanvasComponentService = nonCanvasComponentService;
	}

	@GetMapping
	public ResponseEntity<List<NonCanvasComponentDTO>> getNonCanvasComponents(@RequestParam String configurationPath) {
		return ResponseEntity.ok(nonCanvasComponentService.getNonCanvasComponents(configurationPath));
	}

	@PostMapping
	public ResponseEntity<List<NonCanvasComponentDTO>> addNonCanvasComponent(@RequestBody NonCanvasComponentCreateDTO request) {
		List<NonCanvasComponentDTO> components =
				nonCanvasComponentService.addNonCanvasComponent(request.configurationPath(), request.tagName(), request.attributes());
		return ResponseEntity.ok(components);
	}

	@PutMapping
	public ResponseEntity<List<NonCanvasComponentDTO>> updateNonCanvasComponent(@RequestBody NonCanvasComponentUpdateDTO request) {
		List<NonCanvasComponentDTO> components = nonCanvasComponentService.updateNonCanvasComponent(
				request.configurationPath(), request.tagName(), request.index(), request.attributes());
		return ResponseEntity.ok(components);
	}

	@DeleteMapping
	public ResponseEntity<List<NonCanvasComponentDTO>> deleteNonCanvasComponent(
			@RequestParam String configurationPath,
			@RequestParam String tagName,
			@RequestParam int index) {
		List<NonCanvasComponentDTO> components = nonCanvasComponentService.deleteNonCanvasComponent(configurationPath, tagName, index);
		return ResponseEntity.ok(components);
	}
}
