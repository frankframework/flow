package org.frankframework.flow.project;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Stream;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;
import lombok.extern.slf4j.Slf4j;
import org.eclipse.jgit.api.CloneCommand;
import org.eclipse.jgit.api.Git;
import org.eclipse.jgit.api.errors.GitAPIException;
import org.eclipse.jgit.transport.CredentialsProvider;
import org.frankframework.flow.adapter.AdapterNotFoundException;
import org.frankframework.flow.configuration.Configuration;
import org.frankframework.flow.configuration.ConfigurationNotFoundException;
import org.frankframework.flow.filesystem.FileSystemStorage;
import org.frankframework.flow.filesystem.FilesystemEntry;
import org.frankframework.flow.git.GitCredentialHelper;
import org.frankframework.flow.projectsettings.FilterType;
import org.frankframework.flow.projectsettings.InvalidFilterTypeException;
import org.frankframework.flow.recentproject.RecentProject;
import org.frankframework.flow.recentproject.RecentProjectsService;
import org.frankframework.flow.utility.XmlAdapterUtils;
import org.frankframework.flow.utility.XmlSecurityUtils;
import org.springframework.context.annotation.Lazy;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.w3c.dom.Document;
import org.w3c.dom.Node;
import org.xml.sax.SAXParseException;

@Slf4j
@Service
public class ProjectService {
    private static final String CONFIGURATIONS_DIR = "src/main/configurations";

    private final FileSystemStorage fileSystemStorage;
    private final RecentProjectsService recentProjectsService;

    private final Map<String, Project> projectCache = new ConcurrentHashMap<>();

    public ProjectService(FileSystemStorage fileSystemStorage, @Lazy RecentProjectsService recentProjectsService) {
        this.fileSystemStorage = fileSystemStorage;
        this.recentProjectsService = recentProjectsService;
    }

    public List<Project> getProjects() {
        if (fileSystemStorage.isLocalEnvironment()) {
            return getProjectsFromRecentList();
        }
        return getProjectsFromWorkspaceScan();
    }

    private List<Project> getProjectsFromRecentList() {
        List<Project> foundProjects = new ArrayList<>();
        List<RecentProject> recentProjects = recentProjectsService.getRecentProjects();

        for (RecentProject recent : recentProjects) {
            try {
                Project p = loadProjectCached(recent.rootPath());
                foundProjects.add(p);
            } catch (Exception e) {
                log.debug("Recent project no longer valid: {}", recent.rootPath());
            }
        }
        return foundProjects;
    }

    private List<Project> getProjectsFromWorkspaceScan() {
        List<Project> foundProjects = new ArrayList<>();
        List<FilesystemEntry> entries = fileSystemStorage.listRoots();

        for (FilesystemEntry entry : entries) {
            try {
                Project p = loadProjectCached(entry.path());
                foundProjects.add(p);
            } catch (Exception e) {
                // Not a valid project, skip
            }
        }
        return foundProjects;
    }

    public Project getProject(String name) throws ProjectNotFoundException {
        for (Project cached : projectCache.values()) {
            if (cached.getName().equals(name)) {
                return cached;
            }
        }

        return getProjects().stream()
                .filter(p -> p.getName().equals(name))
                .findFirst()
                .orElseThrow(() -> new ProjectNotFoundException("Project not found: " + name));
    }

    public Project createProjectOnDisk(String path) throws IOException {
        Path projectPath = fileSystemStorage.createProjectDirectory(path);

        Files.createDirectories(projectPath.resolve(CONFIGURATIONS_DIR));

        String defaultXml = new String(
                new ClassPathResource("templates/default-configuration.xml")
                        .getInputStream()
                        .readAllBytes(),
                StandardCharsets.UTF_8);
        fileSystemStorage.writeFile(
                projectPath
                        .resolve(CONFIGURATIONS_DIR)
                        .resolve("Configuration.xml")
                        .toString(),
                defaultXml);

        return loadProjectAndCache(projectPath.toString());
    }

    public Project openProjectFromDisk(String path) throws IOException, ProjectNotFoundException {
        Path absPath = fileSystemStorage.toAbsolutePath(path);
        if (!Files.exists(absPath) || !Files.isDirectory(absPath)) {
            throw new ProjectNotFoundException("Project not found at: " + path);
        }
        return loadProjectAndCache(path);
    }

    public Project cloneAndOpenProject(String repoUrl, String localPath, String token) throws IOException {
        Path targetDir = fileSystemStorage.toAbsolutePath(localPath);

        if (Files.exists(targetDir)) {
            throw new IllegalArgumentException("Project already exists at: " + localPath);
        }

        try {
            CloneCommand cloneCommand = Git.cloneRepository().setURI(repoUrl).setDirectory(targetDir.toFile());

            CredentialsProvider credentials =
                    GitCredentialHelper.resolveForUrl(repoUrl, token, fileSystemStorage.isLocalEnvironment());
            if (credentials != null) {
                cloneCommand.setCredentialsProvider(credentials);
            }

            try (Git git = cloneCommand.call()) {
                log.info("Cloned repository {} to {}", repoUrl, targetDir);
            }
        } catch (GitAPIException e) {
            String msg = e.getMessage() != null ? e.getMessage().toLowerCase() : "";
            if (msg.contains("auth") || msg.contains("not permitted") || msg.contains("403") || msg.contains("401")) {
                throw new IllegalArgumentException(
                        "Clone failed — authentication error. Please provide a valid Personal Access Token (PAT)", e);
            }
            throw new IllegalArgumentException("Clone failed: " + e.getMessage(), e);
        }

        Project project = loadProjectAndCache(targetDir.toString());
        if (token != null && !token.isBlank()) {
            project.setGitToken(token);
        }
        return project;
    }

    public void invalidateCache() {
        projectCache.clear();
    }

    public void invalidateProject(String projectName) {
        projectCache.entrySet().removeIf(e -> e.getValue().getName().equals(projectName));
    }

    private Project loadProjectCached(String path) throws IOException {
        String cacheKey = fileSystemStorage.toAbsolutePath(path).toString();
        Project cached = projectCache.get(cacheKey);
        if (cached != null) {
            return cached;
        }
        return loadProjectAndCache(path);
    }

    private Project loadProjectAndCache(String path) throws IOException {
        Project project = loadProjectFromStorage(path);
        String cacheKey = fileSystemStorage.toAbsolutePath(path).toString();
        projectCache.put(cacheKey, project);
        return project;
    }

    private Project loadProjectFromStorage(String path) throws IOException {
        Path absPath = fileSystemStorage.toAbsolutePath(path);

        validatePathSafety(absPath);

        if (!Files.exists(absPath) || !Files.isDirectory(absPath)) {
            throw new IOException("Invalid project path: " + absPath);
        }

        Project project = new Project(absPath.getFileName().toString(), absPath.toString());

        Path configDir = absPath.resolve(CONFIGURATIONS_DIR).normalize();

        validatePathSafety(configDir);

        if (!Files.exists(configDir)) {
            return project;
        }

        try (Stream<Path> s = Files.walk(configDir)) {
            s.filter(p -> p.toString().endsWith(".xml")).forEach(p -> {
                try {
                    String content = fileSystemStorage.readFile(p.toString());
                    Configuration c = new Configuration(p.toString());
                    c.setXmlContent(content);
                    project.addConfiguration(c);
                } catch (IOException e) {
                    log.error("Error reading config file {}: {}", p, e.getMessage(), e);
                }
            });
        }
        return project;
    }

    private static void validatePathSafety(Path path) {
        String pathStr = path.toString();
        if (pathStr.contains("..")) {
            throw new SecurityException("Path traversal is not allowed: " + pathStr);
        }
    }

    public void exportProjectAsZip(String projectName, OutputStream outputStream)
            throws IOException, ProjectNotFoundException {
        Project project = getProject(projectName);
        Path projectPath = fileSystemStorage.toAbsolutePath(project.getRootPath());

        if (!Files.exists(projectPath) || !Files.isDirectory(projectPath)) {
            throw new ProjectNotFoundException("Project directory not found: " + projectName);
        }

        try (ZipOutputStream zos = new ZipOutputStream(outputStream);
                Stream<Path> paths = Files.walk(projectPath)) {
            paths.filter(Files::isRegularFile).forEach(filePath -> {
                try {
                    String entryName =
                            projectPath.relativize(filePath).toString().replace("\\", "/");
                    zos.putNextEntry(new ZipEntry(entryName));
                    Files.copy(filePath, zos);
                    zos.closeEntry();
                } catch (IOException e) {
                    throw new RuntimeException("Error zipping file: " + filePath, e);
                }
            });
        }
    }

    public Project importProjectFromFiles(String projectName, List<MultipartFile> files, List<String> paths)
            throws IOException {
        Path projectDir = fileSystemStorage.createProjectDirectory(projectName);

        for (int i = 0; i < files.size(); i++) {
            String relativePath = paths.get(i).replace("\\", "/");

            if (relativePath.contains("..") || relativePath.startsWith("/")) {
                throw new SecurityException("Invalid file path: " + relativePath);
            }

            Path targetPath = projectDir.resolve(relativePath).normalize();
            if (!targetPath.startsWith(projectDir)) {
                throw new SecurityException("File path escapes project directory: " + relativePath);
            }

            Files.createDirectories(targetPath.getParent());
            files.get(i).transferTo(targetPath);
        }

        return loadProjectAndCache(projectDir.toString());
    }

    public boolean updateConfigurationXml(String projectName, String filepath, String xmlContent)
            throws ProjectNotFoundException, ConfigurationNotFoundException, IOException {

        Project project = getProject(projectName);

        Configuration targetConfig = project.getConfigurations().stream()
                .filter(c -> c.getFilepath().equals(filepath))
                .findFirst()
                .orElseThrow(() -> new ConfigurationNotFoundException(
                        String.format("Configuration with filepath: %s not found", filepath)));

        fileSystemStorage.writeFile(filepath, xmlContent);
        targetConfig.setXmlContent(xmlContent);
        return true;
    }

    public Project enableFilter(String projectName, String type)
            throws ProjectNotFoundException, InvalidFilterTypeException {
        Project project = getProject(projectName);
        project.enableFilter(parseFilterType(type));
        return project;
    }

    public Project disableFilter(String projectName, String type)
            throws ProjectNotFoundException, InvalidFilterTypeException {
        Project project = getProject(projectName);
        project.disableFilter(parseFilterType(type));
        return project;
    }

    private FilterType parseFilterType(String type) throws InvalidFilterTypeException {
        try {
            return FilterType.valueOf(type.toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new InvalidFilterTypeException("Invalid filter type: " + type);
        }
    }

    public boolean updateAdapter(String projectName, String configurationPath, String adapterName, String newAdapterXml)
            throws ProjectNotFoundException, ConfigurationNotFoundException, AdapterNotFoundException {
        Project project = getProject(projectName);
        Optional<Configuration> configOptional = project.getConfigurations().stream()
                .filter(configuration -> configuration.getFilepath().equals(configurationPath))
                .findFirst();

        if (configOptional.isEmpty()) {
            throw new ConfigurationNotFoundException("Configuration not found: " + configurationPath);
        }

        Configuration config = configOptional.get();

        try {
            Document configDoc = XmlSecurityUtils.createSecureDocumentBuilder()
                    .parse(new ByteArrayInputStream(config.getXmlContent().getBytes(StandardCharsets.UTF_8)));

            Document newAdapterDoc = XmlSecurityUtils.createSecureDocumentBuilder()
                    .parse(new ByteArrayInputStream(newAdapterXml.getBytes(StandardCharsets.UTF_8)));

            Node newAdapterNode = configDoc.importNode(newAdapterDoc.getDocumentElement(), true);

            if (!XmlAdapterUtils.replaceAdapterInDocument(configDoc, adapterName, newAdapterNode)) {
                throw new AdapterNotFoundException("Adapter not found: " + adapterName);
            }

            String xmlOutput = XmlAdapterUtils.convertDocumentToString(configDoc);
            config.setXmlContent(xmlOutput);
            return true;
        } catch (AdapterNotFoundException | ConfigurationNotFoundException | ProjectNotFoundException e) {
            throw e;
        } catch (SAXParseException e) {
            log.warn("Invalid XML for adapter {}: {}", adapterName, e.getMessage());
            return false;
        } catch (Exception e) {
            log.error("Unexpected error updating adapter: {}", e.getMessage(), e);
            return false;
        }
    }

    public Project addConfiguration(String projectName, String configurationName) throws ProjectNotFoundException {
        Project project = getProject(projectName);
        Configuration configuration = new Configuration(configurationName);
        project.addConfiguration(configuration);
        return project;
    }
}
