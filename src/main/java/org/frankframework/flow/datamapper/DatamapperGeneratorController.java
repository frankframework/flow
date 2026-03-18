package org.frankframework.flow.datamapper;

import org.frankframework.flow.exception.ApiException;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/datamapper")
public class DatamapperGeneratorController {
	private final DatamapperGeneratorService datamapperGeneratorService;

	public DatamapperGeneratorController(DatamapperGeneratorService datamapperGeneratorService) {
		this.datamapperGeneratorService = datamapperGeneratorService;
	}

	@PutMapping("/{projectName}/generate")
	public ResponseEntity<Void> updateConfiguration(@PathVariable String projectName, @RequestBody String content)
			throws ApiException {

		datamapperGeneratorService.generateFromProject(projectName, content);
		return ResponseEntity.ok().build();
	}
}
