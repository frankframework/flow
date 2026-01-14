package org.frankframework.flow.project;

import java.io.IOException;
import java.nio.file.NoSuchFileException;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import org.frankframework.flow.configuration.AdapterUpdateDTO;
import org.frankframework.flow.configuration.Configuration;
import org.frankframework.flow.configuration.ConfigurationDTO;
import org.frankframework.flow.configuration.ConfigurationNotFoundException;
import org.frankframework.flow.filetree.FileTreeNode;
import org.frankframework.flow.filetree.FileTreeService;
import org.frankframework.flow.projectsettings.FilterType;
import org.frankframework.flow.projectsettings.InvalidFilterTypeException;
import org.frankframework.flow.utility.XmlValidator;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController()
@RequestMapping("/projects")
public class ProjectController {
    private final ProjectService projectService;
    private final FileTreeService fileTreeService;

    public ProjectController(ProjectService projectService, FileTreeService fileTreeService) {
        this.projectService = projectService;
        this.fileTreeService = fileTreeService;
    }

    @GetMapping
    public ResponseEntity<List<ProjectDTO>> getAllProjects() {
        List<ProjectDTO> projectDTOList = new ArrayList<>();
        List<Project> projects = projectService.getProjects();

        for (Project project : projects) {
            ProjectDTO dto = ProjectDTO.from(project);
            projectDTOList.add(dto);
        }
        return ResponseEntity.ok(projectDTOList);
    }

    @GetMapping("/backend-folders")
    public List<String> getBackendFolders() throws IOException {
        return fileTreeService.listProjectFolders();
    }

    @GetMapping("/root")
    public ResponseEntity<Map<String, String>> getProjectsRoot() {
        return ResponseEntity.ok(
                Map.of("rootPath", fileTreeService.getProjectsRoot().toString()));
    }

    @GetMapping("/{name}/tree")
    public FileTreeNode getProjectTree(@PathVariable String name) throws IOException {
        return fileTreeService.getProjectTree(name);
    }

    @GetMapping("/{name}/tree/configurations")
    public FileTreeNode getConfigurationTree(
            @PathVariable String name, @RequestParam(required = false, defaultValue = "false") boolean shallow)
            throws IOException {

        if (shallow) {
            return fileTreeService.getShallowConfigurationsDirectoryTree(name);
        } else {
            return fileTreeService.getConfigurationsDirectoryTree(name);
        }
    }

    @GetMapping("/{projectName}")
    public ResponseEntity<ProjectDTO> getProject(@PathVariable String projectName) throws ProjectNotFoundException {

        Project project = projectService.getProject(projectName);

        ProjectDTO dto = ProjectDTO.from(project);

        return ResponseEntity.ok(dto);
    }

    @GetMapping(value = "/{projectname}", params = "path")
    public FileTreeNode getDirectoryContent(@PathVariable String projectname, @RequestParam String path)
            throws IOException {

        return fileTreeService.getShallowDirectoryTree(projectname, path);
    }

    @PatchMapping("/{projectname}")
    public ResponseEntity<ProjectDTO> patchProject(
            @PathVariable String projectname, @RequestBody ProjectDTO projectDTO) {

        try {
            Project project = projectService.getProject(projectname);
            if (project == null) {
                return ResponseEntity.notFound().build();
            }

            // 1. Update project name (only if present)
            if (projectDTO.name() != null && !projectDTO.name().equals(project.getName())) {
                project.setName(projectDTO.name());
            }

            // 2. Update configuration list (only if present)
            if (projectDTO.filepaths() != null) {
                // Replace entire configuration list
                project.clearConfigurations();
                for (String filepath : projectDTO.filepaths()) {
                    project.addConfiguration(new Configuration(filepath));
                }
            }

            // 3. Merge filter map (only update provided filters)
            if (projectDTO.filters() != null) {
                for (var entry : projectDTO.filters().entrySet()) {
                    FilterType type = entry.getKey();
                    Boolean enabled = entry.getValue();

                    if (enabled == null) continue;

                    if (enabled) {
                        project.enableFilter(type);
                    } else {
                        project.disableFilter(type);
                    }
                }
            }

            // Build updated DTO
            ProjectDTO dto = ProjectDTO.from(project);

            return ResponseEntity.ok(dto);

        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @PostMapping("/{projectName}/configuration")
    public ResponseEntity<ConfigurationDTO> getConfigurationByPath(
            @PathVariable String projectName, @RequestBody ConfigurationPathDTO requestBody)
            throws ProjectNotFoundException, ConfigurationNotFoundException, IOException {

        String filepath = requestBody.filepath();

        // Find configuration by filepath
        String content;
        try {
            content = fileTreeService.readFileContent(filepath);
        } catch (NoSuchFileException e) {
            throw new ConfigurationNotFoundException("Configuration file not found: " + filepath);
        } catch (IllegalArgumentException e) {
            throw new ConfigurationNotFoundException("Invalid configuration path: " + filepath);
        }

        ConfigurationDTO dto = new ConfigurationDTO(filepath, content);
        return ResponseEntity.ok(dto);
    }

    @PostMapping("/{projectname}/import-configurations")
    public ResponseEntity<ProjectDTO> importConfigurations(
            @PathVariable String projectname, @RequestBody ProjectImportDTO importDTO) {

        Project project = projectService.getProject(projectname);
        if (project == null) return ResponseEntity.notFound().build();

        for (ImportConfigurationDTO conf : importDTO.configurations()) {
            Configuration c = new Configuration(conf.filepath());
            c.setXmlContent(conf.xmlContent());
            project.addConfiguration(c);
        }

        ProjectDTO dto = ProjectDTO.from(project);

        return ResponseEntity.ok(dto);
    }

    @PutMapping("/{projectName}/configuration")
    public ResponseEntity<Void> updateConfiguration(
            @PathVariable String projectName, @RequestBody ConfigurationDTO configurationDTO)
            throws ProjectNotFoundException, ConfigurationNotFoundException, InvalidXmlContentException, IOException {

        // Validate XML
        if (configurationDTO.filepath().toLowerCase().endsWith(".xml")) {
            XmlValidator.validateXml(configurationDTO.content());
        }

        try {
            fileTreeService.updateFileContent(configurationDTO.filepath(), configurationDTO.content());
        } catch (IllegalArgumentException e) {
            throw new ConfigurationNotFoundException("Invalid file path: " + configurationDTO.filepath());
        }

        return ResponseEntity.ok().build();
    }

    @PutMapping("/{projectName}/adapters")
    public ResponseEntity<Void> updateAdapterFromFile(
            @PathVariable String projectName, @RequestBody AdapterUpdateDTO dto) {
        Path configPath = Paths.get(dto.configurationPath());

        boolean updated =
                fileTreeService.updateAdapterFromFile(projectName, configPath, dto.adapterName(), dto.adapterXml());

        if (!updated) {
            return ResponseEntity.notFound().build();
        }

        return ResponseEntity.ok().build();
    }

    @PostMapping
    public ResponseEntity<ProjectDTO> createProject(@RequestBody ProjectCreateDTO projectCreateDTO) {
        Project project = projectService.createProject(projectCreateDTO.name(), projectCreateDTO.rootPath());

        ProjectDTO dto = ProjectDTO.from(project);

        return ResponseEntity.ok(dto);
    }

    @PostMapping("/{projectname}/configurations/{configname}")
    public ResponseEntity<ProjectDTO> addConfiguration(
            @PathVariable String projectname, @PathVariable String configname) throws ProjectNotFoundException {
        Project project = projectService.addConfiguration(projectname, configname);

        ProjectDTO projectDTO = ProjectDTO.from(project);
        return ResponseEntity.ok(projectDTO);
    }

    @PatchMapping("/{projectname}/filters/{type}/enable")
    public ResponseEntity<ProjectDTO> enableFilter(@PathVariable String projectname, @PathVariable String type)
            throws ProjectNotFoundException, InvalidFilterTypeException {

        Project project = projectService.enableFilter(projectname, type);
        ProjectDTO dto = ProjectDTO.from(project);
        return ResponseEntity.ok(dto);
    }

    @PatchMapping("/{projectname}/filters/{type}/disable")
    public ResponseEntity<ProjectDTO> disableFilter(@PathVariable String projectname, @PathVariable String type)
            throws ProjectNotFoundException, InvalidFilterTypeException {

        Project project = projectService.disableFilter(projectname, type);
        ProjectDTO dto = ProjectDTO.from(project);
        return ResponseEntity.ok(dto);
    }
}
