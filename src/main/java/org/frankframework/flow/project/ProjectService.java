package org.frankframework.flow.project;

import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

@Service
public class ProjectService {

	private ArrayList<Project> projects;
	private static final String BASE_PATH = "project/";

	public ProjectService(){
		projects = new ArrayList<>();
		initiateProjects();
	}

	public Project createProject(String name){
		projects.add(new Project(name));
		return new Project(name);
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
		projects.add(testProject2);
	}
}
