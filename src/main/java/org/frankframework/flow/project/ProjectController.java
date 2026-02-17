package org.frankframework.flow.project;

import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.nio.file.NoSuchFileException;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;
import org.frankframework.flow.adapter.AdapterNotFoundException;
import org.frankframework.flow.adapter.AdapterUpdateDTO;
import org.frankframework.flow.configuration.Configuration;
import org.frankframework.flow.configuration.ConfigurationDTO;
import org.frankframework.flow.configuration.ConfigurationNotFoundException;
import org.frankframework.flow.filesystem.FileSystemStorage;
import org.frankframework.flow.filetree.FileTreeNode;
import org.frankframework.flow.filetree.FileTreeService;
import org.frankframework.flow.projectsettings.InvalidFilterTypeException;
import org.frankframework.flow.recentproject.RecentProjectsService;
import org.frankframework.flow.utility.XmlValidator;
import org.springframework.http.HttpHeaders;
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
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/projects")
public class ProjectController {

    private final ProjectService projectService;
    private final FileTreeService fileTreeService;
    private final RecentProjectsService recentProjectsService;
    private final FileSystemStorage fileSystemStorage;

    public ProjectController(
            ProjectService projectService,
            FileTreeService fileTreeService,
            RecentProjectsService recentProjectsService,
            FileSystemStorage fileSystemStorage) {
        this.projectService = projectService;
        this.fileTreeService = fileTreeService;
        this.recentProjectsService = recentProjectsService;
        this.fileSystemStorage = fileSystemStorage;
    }

    @GetMapping
    public ResponseEntity<List<ProjectDTO>> getAllProjects() {
        List<Project> projects = projectService.getProjects();
        List<ProjectDTO> dtos = projects.stream().map(this::toDto).toList();
        return ResponseEntity.ok(dtos);
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
        return ResponseEntity.ok(toDto(project));
    }

    @GetMapping(value = "/{projectname}", params = "path")
    public FileTreeNode getDirectoryContent(@PathVariable String projectname, @RequestParam String path)
            throws IOException {

        return fileTreeService.getShallowDirectoryTree(projectname, path);
    }

    @PostMapping
    public ResponseEntity<ProjectDTO> createProject(@RequestBody ProjectCreateDTO projectCreateDTO) throws IOException {
        Project project = projectService.createProjectOnDisk(projectCreateDTO.rootPath());
        recentProjectsService.addRecentProject(project.getName(), project.getRootPath());
        return ResponseEntity.ok(toDto(project));
    }

    @PostMapping("/clone")
    public ResponseEntity<ProjectDTO> cloneProject(@RequestBody ProjectCloneDTO projectCloneDTO) throws IOException {
        Project project = projectService.cloneAndOpenProject(projectCloneDTO.repoUrl(), projectCloneDTO.localPath());
        recentProjectsService.addRecentProject(project.getName(), project.getRootPath());
        return ResponseEntity.ok(toDto(project));
    }

    @PostMapping("/open")
    public ResponseEntity<ProjectDTO> openProject(@RequestBody ProjectCreateDTO projectCreateDTO) throws IOException {
        Project project = projectService.openProjectFromDisk(projectCreateDTO.rootPath());
        recentProjectsService.addRecentProject(project.getName(), project.getRootPath());
        return ResponseEntity.ok(toDto(project));
    }

    @PostMapping("/{projectname}/configurations/{configname}")
    public ResponseEntity<ProjectDTO> addConfiguration(
            @PathVariable String projectname, @PathVariable String configname) throws ProjectNotFoundException {
        Project project = projectService.addConfiguration(projectname, configname);
        return ResponseEntity.ok(toDto(project));
    }

    @PatchMapping("/{projectname}/filters/{type}/enable")
    public ResponseEntity<ProjectDTO> enableFilter(@PathVariable String projectname, @PathVariable String type)
            throws ProjectNotFoundException, InvalidFilterTypeException {
        Project project = projectService.enableFilter(projectname, type);
        return ResponseEntity.ok(toDto(project));
    }

    @PatchMapping("/{projectname}/filters/{type}/disable")
    public ResponseEntity<ProjectDTO> disableFilter(@PathVariable String projectname, @PathVariable String type)
            throws ProjectNotFoundException, InvalidFilterTypeException {
        Project project = projectService.disableFilter(projectname, type);
        return ResponseEntity.ok(toDto(project));
    }

    @GetMapping("/{name}/tree")
    public FileTreeNode getProjectTree(@PathVariable String name) throws IOException {
        return fileTreeService.getProjectTree(name);
    }

    @PostMapping("/{projectName}/configuration")
    public ResponseEntity<ConfigurationDTO> getConfigurationByPath(
            @PathVariable String projectName, @RequestBody ConfigurationPathDTO requestBody)
            throws ConfigurationNotFoundException, IOException {

        String filepath = requestBody.filepath();
        try {
            String content = fileTreeService.readFileContent(filepath);
            return ResponseEntity.ok(new ConfigurationDTO(filepath, content));
        } catch (NoSuchFileException e) {
            throw new ConfigurationNotFoundException("Configuration file not found: " + filepath);
        } catch (IllegalArgumentException e) {
            throw new ConfigurationNotFoundException("Invalid configuration path: " + filepath);
        }
    }

    @PutMapping("/{projectName}/configuration")
    public ResponseEntity<Void> updateConfiguration(
            @PathVariable String projectName, @RequestBody ConfigurationDTO configurationDTO)
            throws ConfigurationNotFoundException, InvalidXmlContentException, IOException {

        if (configurationDTO.filepath().toLowerCase().endsWith(".xml")) {
            XmlValidator.validateXml(configurationDTO.content());
        }
        try {
            fileTreeService.updateFileContent(configurationDTO.filepath(), configurationDTO.content());
            return ResponseEntity.ok().build();
        } catch (IllegalArgumentException e) {
            throw new ConfigurationNotFoundException("Invalid file path: " + configurationDTO.filepath());
        }
    }

    @PutMapping("/{projectName}/adapters")
    public ResponseEntity<Void> updateAdapterFromFile(
            @PathVariable String projectName, @RequestBody AdapterUpdateDTO dto)
            throws AdapterNotFoundException, ConfigurationNotFoundException {
        Path configPath = Paths.get(dto.configurationPath());
        boolean updated =
                fileTreeService.updateAdapterFromFile(projectName, configPath, dto.adapterName(), dto.adapterXml());
        return updated ? ResponseEntity.ok().build() : ResponseEntity.notFound().build();
    }

    @GetMapping("/{projectName}/export")
    public void exportProject(@PathVariable String projectName, HttpServletResponse response)
            throws IOException, ProjectNotFoundException {
        response.setContentType("application/zip");
        response.setHeader(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + projectName + ".zip\"");

        projectService.exportProjectAsZip(projectName, response.getOutputStream());
    }

    @PostMapping("/import")
    public ResponseEntity<ProjectDTO> importProject(
            @RequestParam("files") List<MultipartFile> files,
            @RequestParam("paths") List<String> paths,
            @RequestParam("projectName") String projectName)
            throws IOException {

        if (files.isEmpty() || files.size() != paths.size()) {
            return ResponseEntity.badRequest().build();
        }

        Project project = projectService.importProjectFromFiles(projectName, files, paths);
        recentProjectsService.addRecentProject(project.getName(), project.getRootPath());
        return ResponseEntity.ok(toDto(project));
    }

    private ProjectDTO toDto(Project project) {
        String cleanPath = fileSystemStorage.toRelativePath(project.getRootPath());
        List<String> filepaths = project.getConfigurations().stream()
                .map(Configuration::getFilepath)
                .map(fileSystemStorage::toRelativePath)
                .toList();

        return new ProjectDTO(
                project.getName(),
                cleanPath,
                filepaths,
                project.getProjectSettings().getFilters());
    }
}
