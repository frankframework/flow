package org.frankframework.flow.frankdoc;

import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Slf4j
@RestController
@RequestMapping("/json/frankdoc")
public class FrankDocController {

    private final FrankDocService frankDocService;

    public FrankDocController(FrankDocService frankDocService) {
        this.frankDocService = frankDocService;
    }

    @GetMapping(produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<String> getFrankDocJson() throws FrankDocJsonNotFoundException {
        String frankDocJson = frankDocService.getFrankDocJson();
        log.info("Fetched FrankDoc JSON");
        return ResponseEntity.ok(frankDocJson);
    }
}
