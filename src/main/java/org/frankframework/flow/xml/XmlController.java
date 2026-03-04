package org.frankframework.flow.xml;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/xml")
public class XmlController {

    private final XmlService xmlService;

    public XmlController(XmlService xmlService) {
        this.xmlService = xmlService;
    }

    @PostMapping("/normalize")
    public ResponseEntity<XmlDTO> normalizeXml(@RequestBody XmlDTO xmlValidateDTO) throws Exception {

        String normalizedXml = xmlService.normalizeElementsInXml(xmlValidateDTO.xmlContent());
        return ResponseEntity.ok(new XmlDTO(normalizedXml));
    }
}
