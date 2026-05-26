package org.frankframework.flow.frankconfig;

import lombok.extern.log4j.Log4j2;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Log4j2
@RestController
@RequestMapping("/xsd/frankconfig")
public class FrankConfigXsdController {

	private final FrankConfigXsdService frankConfigXsdService;

	public FrankConfigXsdController(FrankConfigXsdService frankConfigXsdService) {
		this.frankConfigXsdService = frankConfigXsdService;
	}

	@GetMapping(produces = MediaType.TEXT_XML_VALUE)
	public ResponseEntity<String> getFrankConfigXsd() {
		String xsd = frankConfigXsdService.getFrankConfigXsd();
		log.info("Fetched FrankConfig XSD");
		return ResponseEntity.ok(xsd);
	}
}
