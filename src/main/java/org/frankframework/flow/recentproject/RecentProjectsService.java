package org.frankframework.flow.recentproject;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
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
import org.frankframework.flow.filesystem.FileSystemStorage;
import org.springframework.stereotype.Service;

@Slf4j
@Service
public class RecentProjectsService {

    private static final int MAX_RECENT_PROJECTS = 10;
    private static final String RECENT_FILENAME = "recent-projects.json";

    private static final Path LOCAL_USER_FILE = Paths.get(System.getProperty("user.home"), ".flow", RECENT_FILENAME);
    private final ReadWriteLock lock = new ReentrantReadWriteLock();

    private final ObjectMapper objectMapper;
    private final FileSystemStorage fileSystemStorage;

    public RecentProjectsService(FileSystemStorage fileSystemStorage, ObjectMapper objectMapper) {
        this.fileSystemStorage = fileSystemStorage;
        this.objectMapper = objectMapper;
    }

    public List<RecentProject> getRecentProjects() {
        lock.readLock().lock();
        try {
            if (fileSystemStorage.isLocalEnvironment()) {
                if (!Files.exists(LOCAL_USER_FILE)) return new ArrayList<>();
                return objectMapper.readValue(Files.readString(LOCAL_USER_FILE), new TypeReference<>() {});
            }

            try {
                String json = fileSystemStorage.readFile(RECENT_FILENAME);
                return objectMapper.readValue(json, new TypeReference<>() {});
            } catch (Exception e) {
                return new ArrayList<>();
            }
        } catch (IOException e) {
            log.warn("Error reading recent projects: {}", e.getMessage());
            return new ArrayList<>();
        } finally {
            lock.readLock().unlock();
        }
    }

    public void addRecentProject(String name, String rootPath) {
        if (name == null || name.isBlank() || rootPath == null || rootPath.isBlank()) return;

        String normalizedPath = Paths.get(rootPath).normalize().toString();

        lock.writeLock().lock();
        try {
            List<RecentProject> projects = new ArrayList<>(getRecentProjects());

            projects.removeIf(p -> {
                String pPath = Paths.get(p.rootPath()).normalize().toString();
                return pPath.equals(normalizedPath);
            });

            projects.addFirst(
                    new RecentProject(name, normalizedPath, Instant.now().toString()));

            if (projects.size() > MAX_RECENT_PROJECTS) {
                projects = new ArrayList<>(projects.subList(0, MAX_RECENT_PROJECTS));
            }

            saveProjects(projects);
        } finally {
            lock.writeLock().unlock();
        }
    }

    public void removeRecentProject(String rootPath) {
        if (rootPath == null || rootPath.isBlank()) return;

        String normalizedPath = Paths.get(rootPath).normalize().toString();

        lock.writeLock().lock();
        try {
            List<RecentProject> projects = new ArrayList<>(getRecentProjects());
            projects.removeIf(p -> {
                String pPath = Paths.get(p.rootPath()).normalize().toString();
                return pPath.equals(normalizedPath);
            });
            saveProjects(projects);
        } finally {
            lock.writeLock().unlock();
        }
    }

    private void saveProjects(List<RecentProject> projects) {
        try {
            String json = objectMapper.writerWithDefaultPrettyPrinter().writeValueAsString(projects);

            if (fileSystemStorage.isLocalEnvironment()) {
                Files.createDirectories(LOCAL_USER_FILE.getParent());
                Files.writeString(LOCAL_USER_FILE, json);
            } else {
                fileSystemStorage.writeFile(RECENT_FILENAME, json);
            }
        } catch (IOException e) {
            log.error("Error saving recent projects: {}", e.getMessage());
        }
    }
}
