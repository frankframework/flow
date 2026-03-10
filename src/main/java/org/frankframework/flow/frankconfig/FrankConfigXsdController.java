package org.frankframework.flow.frankconfig;

import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Slf4j
@RestController
@RequestMapping("/xsd/frankconfig")
public class FrankConfigXsdController {

    private final FrankConfigXsdService frankConfigXsdService;

    public FrankConfigXsdController(FrankConfigXsdService frankConfigXsdService) {
        this.frankConfigXsdService = frankConfigXsdService;
    }

    @GetMapping(produces = MediaType.TEXT_XML_VALUE)
    public ResponseEntity<String> getFrankConfigXsd() throws FrankConfigXsdNotFoundException {
        String xsd = frankConfigXsdService.getFrankConfigXsd();
        log.info("Fetched FrankConfig XSD");
        return ResponseEntity.ok(xsd);
    }
}
