package org.frankframework.flow.xml;

import org.frankframework.flow.project.InvalidXmlContentException;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
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

    @PostMapping("/validate")
    public ResponseEntity<Void> validateXml(@RequestBody XmlDTO xmlValidateDTO)
            throws InvalidXmlContentException {

        xmlService.validateXml(xmlValidateDTO.xmlContent());
        return ResponseEntity.ok().build();
    }

    @PostMapping("/normalize")
    public ResponseEntity<XmlDTO> normalizeXml(@RequestBody XmlDTO xmlValidateDTO)
            throws InvalidXmlContentException, Exception {

        String normalizedXml = xmlService.normalizeElementsInXml(xmlValidateDTO.xmlContent());
        return ResponseEntity.ok(new XmlDTO(normalizedXml));
    }
}
