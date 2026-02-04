package org.frankframework.flow.project;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.locks.ReadWriteLock;
import java.util.concurrent.locks.ReentrantReadWriteLock;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.ObjectMapper;

@Slf4j
@Service
public class RecentProjectsService {

    private static final int MAX_RECENT_PROJECTS = 10;
    private static final Path RECENT_PROJECTS_FILE =
            Paths.get(System.getProperty("user.home"), ".flow", "recent-projects.json");

    private final ObjectMapper objectMapper = new ObjectMapper();
    private final ReadWriteLock lock = new ReentrantReadWriteLock();

    public List<RecentProject> getRecentProjects() {
        lock.readLock().lock();
        try {
            if (!Files.exists(RECENT_PROJECTS_FILE)) {
                return new ArrayList<>();
            }
            String json = Files.readString(RECENT_PROJECTS_FILE);
            return objectMapper.readValue(json, new TypeReference<List<RecentProject>>() {});
        } catch (IOException e) {
            log.warn("Error reading recent projects: {}", e.getMessage());
            return new ArrayList<>();
        } finally {
            lock.readLock().unlock();
        }
    }

    public void addRecentProject(String name, String rootPath) {
        if (name == null || name.isBlank() || rootPath == null || rootPath.isBlank()) {
            log.warn("Cannot add recent project with blank name or rootPath");
            return;
        }

        String normalizedPath = Paths.get(rootPath).toAbsolutePath().normalize().toString();

        lock.writeLock().lock();
        try {
            List<RecentProject> projects = new ArrayList<>(readProjectsFromDisk());

            projects.removeIf(p -> Paths.get(p.rootPath())
                    .toAbsolutePath()
                    .normalize()
                    .toString()
                    .equals(normalizedPath));

            projects.addFirst(
                    new RecentProject(name, normalizedPath, Instant.now().toString()));

            if (projects.size() > MAX_RECENT_PROJECTS) {
                projects = new ArrayList<>(projects.subList(0, MAX_RECENT_PROJECTS));
            }

            saveProjectsToDisk(projects);
        } finally {
            lock.writeLock().unlock();
        }
    }

    public void removeRecentProject(String rootPath) {
        if (rootPath == null || rootPath.isBlank()) {
            return;
        }

        String normalizedPath = Paths.get(rootPath).toAbsolutePath().normalize().toString();

        lock.writeLock().lock();
        try {
            List<RecentProject> projects = new ArrayList<>(readProjectsFromDisk());
            projects.removeIf(p -> Paths.get(p.rootPath())
                    .toAbsolutePath()
                    .normalize()
                    .toString()
                    .equals(normalizedPath));
            saveProjectsToDisk(projects);
        } finally {
            lock.writeLock().unlock();
        }
    }

    private List<RecentProject> readProjectsFromDisk() {
        if (!Files.exists(RECENT_PROJECTS_FILE)) {
            return new ArrayList<>();
        }
        try {
            String json = Files.readString(RECENT_PROJECTS_FILE);
            return objectMapper.readValue(json, new TypeReference<List<RecentProject>>() {});
        } catch (IOException e) {
            log.warn("Error reading recent projects file: {}", e.getMessage());
            return new ArrayList<>();
        }
    }

    private void saveProjectsToDisk(List<RecentProject> projects) {
        try {
            Files.createDirectories(RECENT_PROJECTS_FILE.getParent());
            String json = objectMapper.writerWithDefaultPrettyPrinter().writeValueAsString(projects);
            Files.writeString(RECENT_PROJECTS_FILE, json);
        } catch (IOException e) {
            log.error("Error saving recent projects: {}", e.getMessage());
        }
    }
}
