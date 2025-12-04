package org.frankframework.flow.project;

import org.frankframework.flow.configuration.Configuration;

import java.io.ByteArrayInputStream;
import java.io.StringWriter;
import java.util.ArrayList;

import javax.xml.parsers.DocumentBuilder;
import javax.xml.parsers.DocumentBuilderFactory;
import javax.xml.transform.OutputKeys;
import javax.xml.transform.Transformer;
import javax.xml.transform.TransformerFactory;
import javax.xml.transform.dom.DOMSource;
import javax.xml.transform.stream.StreamResult;

import org.frankframework.flow.projectsettings.FilterType;
import org.frankframework.flow.projectsettings.ProjectSettings;
import org.w3c.dom.*;

public class Project {
	private String name;
	private ArrayList<Configuration> configurations;
	private ProjectSettings projectSettings;

	public Project(String name) {
		this.name = name;
		this.configurations = new ArrayList<>();
		this.projectSettings = new ProjectSettings();
	}

	public String getName() {
		return name;
	}
	public void setName(String name) {
		this.name = name;
	}

	public ArrayList<Configuration> getConfigurations() {
		return configurations;
	}

	public void addConfiguration(Configuration configuration) {
		this.configurations.add(configuration);
	}

	public void setConfigurationXml(String filename, String xmlContent) {
		for (Configuration c : this.configurations) {
			if (c.getFilename().equals(filename)) {
				c.setXmlContent(xmlContent);
				return;
			}
		}
	}

	public ProjectSettings getProjectSettings(){
		return this.projectSettings;
	}

	public boolean isFilterEnabled(FilterType type) {
		return projectSettings.isEnabled(type);
	}

	public void enableFilter(FilterType type){
		projectSettings.setEnabled(type, true);
	}

	public void disableFilter(FilterType type){
		projectSettings.setEnabled(type, false);
	}

	public boolean updateAdapter(String configurationName, String adapterName, String newAdapterXml) {
		for (Configuration config : configurations) {
			if (!config.getFilename().equals(configurationName)) continue;

			try {
				// Parse the existing XML
				DocumentBuilderFactory factory = DocumentBuilderFactory.newInstance();
				factory.setIgnoringComments(true);
				factory.setNamespaceAware(true);
				DocumentBuilder builder = factory.newDocumentBuilder();

				Document configDoc = builder.parse(new ByteArrayInputStream(config.getXmlContent().getBytes()));

				// Parse the new adapter XML
				Document newAdapterDoc = builder.parse(new ByteArrayInputStream(newAdapterXml.getBytes()));
				Node newAdapterNode = configDoc.importNode(newAdapterDoc.getDocumentElement(), true);

				// Find the existing adapter by name
				NodeList adapters = configDoc.getElementsByTagName("Adapter");
				boolean found = false;

				for (int i = 0; i < adapters.getLength(); i++) {
					Element adapterEl = (Element) adapters.item(i);
					if (adapterEl.getAttribute("name").equals(adapterName)) {
						// Replace it
						Node parent = adapterEl.getParentNode();
						parent.replaceChild(newAdapterNode, adapterEl);
						found = true;
						break;
					}
				}

				if (found) {
					// Convert back to string
					TransformerFactory tf = TransformerFactory.newInstance();
					Transformer transformer = tf.newTransformer();
					transformer.setOutputProperty(OutputKeys.INDENT, "yes");
					transformer.setOutputProperty(OutputKeys.OMIT_XML_DECLARATION, "yes");
					StringWriter writer = new StringWriter();
					transformer.transform(new DOMSource(configDoc), new StreamResult(writer));

					config.setXmlContent(writer.toString());
					return true;
				}
			} catch (Exception e) {
				e.printStackTrace();
				return false;
			}
		}
		return false;
	}
}
