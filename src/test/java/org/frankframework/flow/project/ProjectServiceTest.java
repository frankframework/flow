package org.frankframework.flow.project;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertNotNull;
import static org.junit.Assert.assertNull;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;

import java.io.IOException;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.core.io.Resource;
import org.springframework.core.io.support.ResourcePatternResolver;

@ExtendWith(MockitoExtension.class)
class ProjectServiceTest {

    @Mock
    private ResourcePatternResolver resolver;

    private ProjectService projectService;

    @BeforeEach
    void init() throws IOException {
        when(resolver.getResources(anyString())).thenReturn(new Resource[0]);
        projectService = new ProjectService(resolver);
    }

    @Test
    void TestAddingProjectToProjectService() {

        String projectName = "new_project";
        assertEquals(0, projectService.getProjects().size());
        assertNull(projectService.getProject(projectName));

        projectService.createProject(projectName);
        assertEquals(1, projectService.getProjects().size());
        assertNotNull(projectService.getProject(projectName));
    }
}
