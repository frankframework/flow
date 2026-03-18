package org.frankframework.flow.adapter;

import java.io.IOException;
import java.nio.file.Paths;
import javax.xml.parsers.ParserConfigurationException;
import javax.xml.transform.TransformerException;
import org.frankframework.flow.configuration.ConfigurationNotFoundException;
import org.frankframework.flow.exception.ApiException;
import org.frankframework.flow.xml.XmlDTO;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.xml.sax.SAXException;

@RestController
@RequestMapping("/projects")
public class AdapterController {

    private final AdapterService adapterService;

    public AdapterController(AdapterService adapterService) {
        this.adapterService = adapterService;
    }

    @GetMapping(
            value = "/{projectName}/adapters/{adapterName}",
            params = {"configurationPath"})
    public XmlDTO getAdapter(
            @PathVariable String projectName, @PathVariable String adapterName, @RequestParam String configurationPath)
            throws IOException, ApiException, SAXException, ParserConfigurationException, TransformerException {
        return adapterService.getAdapter(projectName, configurationPath, adapterName);
    }

    @PutMapping("/{projectName}/adapters")
    public ResponseEntity<Void> updateAdapter(@RequestBody AdapterUpdateDTO dto)
            throws AdapterNotFoundException, ConfigurationNotFoundException, IOException {
        boolean updated =
                adapterService.updateAdapter(Paths.get(dto.configurationPath()), dto.adapterName(), dto.adapterXml());
        return updated ? ResponseEntity.ok().build() : ResponseEntity.notFound().build();
    }

    @PostMapping("/{projectName}/adapters")
    public ResponseEntity<Void> createAdapter(@PathVariable String projectName, @RequestBody AdapterCreateDTO dto)
            throws ConfigurationNotFoundException, IOException {
        adapterService.createAdapter(dto.configurationPath(), dto.adapterName());
        return ResponseEntity.ok().build();
    }

    @PatchMapping("/{projectName}/adapters/rename")
    public ResponseEntity<Void> renameAdapter(@PathVariable String projectName, @RequestBody AdapterRenameDTO dto)
            throws AdapterNotFoundException, ConfigurationNotFoundException, IOException {
        adapterService.renameAdapter(dto.configurationPath(), dto.oldName(), dto.newName());
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/{projectName}/adapters")
    public ResponseEntity<Void> deleteAdapter(
            @PathVariable String projectName, @RequestParam String adapterName, @RequestParam String configurationPath)
            throws AdapterNotFoundException, ConfigurationNotFoundException, IOException {
        adapterService.deleteAdapter(configurationPath, adapterName);
        return ResponseEntity.ok().build();
    }
}
