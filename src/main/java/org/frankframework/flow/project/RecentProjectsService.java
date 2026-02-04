package org.frankframework.flow.project;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import org.springframework.stereotype.Service;

import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.ObjectMapper;

@Service
public class RecentProjectsService {

    private static final int MAX_RECENT_PROJECTS = 10;
    private static final Path RECENT_PROJECTS_FILE =
            Paths.get(System.getProperty("user.home"), ".flow", "recent-projects.json");

    private final ObjectMapper objectMapper = new ObjectMapper();

    public List<RecentProject> getRecentProjects() {
        if (!Files.exists(RECENT_PROJECTS_FILE)) {
            return new ArrayList<>();
        }
        try {
            String json = Files.readString(RECENT_PROJECTS_FILE);
            return objectMapper.readValue(json, new TypeReference<List<RecentProject>>() {});
        } catch (IOException e) {
            System.err.println("Error reading recent projects: " + e.getMessage());
            return new ArrayList<>();
        }
    }

    public void addRecentProject(String name, String rootPath) {
        List<RecentProject> projects = new ArrayList<>(getRecentProjects());

        // Remove existing entry with same rootPath
        projects.removeIf(p -> p.rootPath().equals(rootPath));

        // Add to the top
        projects.addFirst(new RecentProject(name, rootPath, Instant.now().toString()));

        // Cap at max
        if (projects.size() > MAX_RECENT_PROJECTS) {
            projects = new ArrayList<>(projects.subList(0, MAX_RECENT_PROJECTS));
        }

        saveRecentProjects(projects);
    }

    public void removeRecentProject(String rootPath) {
        List<RecentProject> projects = new ArrayList<>(getRecentProjects());
        projects.removeIf(p -> p.rootPath().equals(rootPath));
        saveRecentProjects(projects);
    }

    private void saveRecentProjects(List<RecentProject> projects) {
        try {
            Files.createDirectories(RECENT_PROJECTS_FILE.getParent());
            String json = objectMapper.writerWithDefaultPrettyPrinter().writeValueAsString(projects);
            Files.writeString(RECENT_PROJECTS_FILE, json);
        } catch (IOException e) {
            System.err.println("Error saving recent projects: " + e.getMessage());
        }
    }
}
