package org.frankframework.flow.appinfo;

import java.util.Map;
import org.frankframework.flow.filesystem.FileSystemStorage;
import org.frankframework.flow.project.ImportProperties;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/app-info")
public class AppInfoController {
	private final FileSystemStorage fileSystemStorage;
	private final ImportProperties importProperties;

	public AppInfoController(FileSystemStorage fileSystemStorage, ImportProperties importProperties) {
		this.fileSystemStorage = fileSystemStorage;
		this.importProperties = importProperties;
	}

	@GetMapping
	public Map<String, Object> getInfo() {
		return Map.of(
				"isLocal", fileSystemStorage.isLocalEnvironment(),
				"maxImportSize", importProperties.maxUploadSize().toBytes()
		);
	}
}
