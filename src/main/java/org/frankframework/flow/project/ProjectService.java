package org.frankframework.flow.project;

import org.frankframework.flow.projectsettings.FilterType;
import org.springframework.stereotype.Service;

import java.util.ArrayList;

@Service
public class ProjectService {

	private ArrayList<Project> projects;

	public ProjectService(){
		projects = new ArrayList<>();
		initiateProjects();
	}

	public Project createProject(String name){
		Project project = new Project(name);
		projects.add(project);
		return project;
	}

	public Project getProject(String name){
		for(Project project : projects){
			if(project.getName().equals(name)){
				return project;
			}
		}
		return null;
	}

	public ArrayList<Project> getProjects(){
		return projects;
	}

	private void initiateProjects(){
		Project testProject = new Project("testproject");
		for (int i = 0; i < 3; i++){
			testProject.addFilenames(String.format("Configuration%d.xml", i+1));
		}
		projects.add(testProject);

		Project testProject2 = new Project("testproject_2");
		testProject2.addFilenames("Configuration3.xml");
		testProject2.toggleFilter(FilterType.JDBC);
		testProject2.toggleFilter(FilterType.ADAPTER);
		testProject2.toggleFilter(FilterType.CMIS);
		projects.add(testProject2);
	}
}
