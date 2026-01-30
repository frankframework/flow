package org.frankframework.flow.project;

import java.io.ByteArrayInputStream;
import java.io.StringWriter;
import java.util.ArrayList;
import java.util.Objects;
import javax.xml.parsers.DocumentBuilder;
import javax.xml.parsers.DocumentBuilderFactory;
import javax.xml.transform.OutputKeys;
import javax.xml.transform.Transformer;
import javax.xml.transform.dom.DOMSource;
import javax.xml.transform.stream.StreamResult;
import lombok.Getter;
import lombok.Setter;
import org.frankframework.flow.configuration.Configuration;
import org.frankframework.flow.projectsettings.FilterType;
import org.frankframework.flow.projectsettings.ProjectSettings;
import org.frankframework.flow.utility.XmlSecurityUtils;
import org.w3c.dom.*;

@Getter
@Setter
public class Project {
    private String name;
    private String rootPath;
    private final ArrayList<Configuration> configurations;
    private final ProjectSettings projectSettings;

    public Project(String name, String rootPath) {
        this.name = name;
        this.rootPath = rootPath;
        this.configurations = new ArrayList<>();
        this.projectSettings = new ProjectSettings();
    }

    public void addConfiguration(Configuration configuration) {
        this.configurations.add(configuration);
    }

    public void setConfigurationXml(String filepath, String xmlContent) {
        for (Configuration c : this.configurations) {
            if (c.getFilepath().equals(filepath)) {
                c.setXmlContent(xmlContent);
                return;
            }
        }
    }

    public boolean isFilterEnabled(FilterType type) {
        return projectSettings.isEnabled(type);
    }

    public void enableFilter(FilterType type) {
        projectSettings.setEnabled(type, true);
    }

    public void disableFilter(FilterType type) {
        projectSettings.setEnabled(type, false);
    }

    public void clearConfigurations() {
        configurations.clear();
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true; // same reference
        if (o == null || getClass() != o.getClass()) return false; // different class
        Project project = (Project) o;
        return Objects.equals(name, project.name) && Objects.equals(rootPath, project.rootPath);
    }

    @Override
    public int hashCode() {
        return Objects.hash(name, rootPath);
    }

    public boolean updateAdapter(String configurationName, String adapterName, String newAdapterXml) {
        for (Configuration config : configurations) {
            if (!config.getFilepath().equals(configurationName)) continue;

            try {
                // Parse the existing config XML and the new adapter XML
                Document configDoc = parseXml(config.getXmlContent());
                Node newAdapterNode = parseNewAdapter(configDoc, newAdapterXml);

                // Find and replace the existing adapter
                boolean replaced = replaceAdapter(configDoc, adapterName, newAdapterNode);

                if (replaced) {
                    // Convert back to string and update configuration
                    String updatedXml = convertDocumentToString(configDoc);
                    config.setXmlContent(updatedXml);
                    return true;
                }
            } catch (Exception e) {
                e.printStackTrace();
                return false;
            }
        }
        return false;
    }

    private Document parseXml(String xmlContent) throws Exception {
        DocumentBuilderFactory factory = XmlSecurityUtils.createSecureDocumentBuilderFactory();
        factory.setIgnoringComments(true);
        factory.setNamespaceAware(true);
        DocumentBuilder builder = factory.newDocumentBuilder();
        return builder.parse(new ByteArrayInputStream(xmlContent.getBytes()));
    }

    private Node parseNewAdapter(Document configDoc, String newAdapterXml) throws Exception {
        DocumentBuilderFactory factory = XmlSecurityUtils.createSecureDocumentBuilderFactory();
        factory.setIgnoringComments(true);
        factory.setNamespaceAware(true);
        DocumentBuilder builder = factory.newDocumentBuilder();
        Document newAdapterDoc = builder.parse(new ByteArrayInputStream(newAdapterXml.getBytes()));
        return configDoc.importNode(newAdapterDoc.getDocumentElement(), true);
    }

    private boolean replaceAdapter(Document configDoc, String adapterName, Node newAdapterNode) {
        NodeList adapters = configDoc.getElementsByTagName("Adapter");
        for (int i = 0; i < adapters.getLength(); i++) {
            Element adapterElement = (Element) adapters.item(i);
            if (adapterElement.getAttribute("name").equals(adapterName)) {
                Node parent = adapterElement.getParentNode();
                parent.replaceChild(newAdapterNode, adapterElement);
                return true;
            }
        }
        return false;
    }

    private String convertDocumentToString(Document doc) throws Exception {
        Transformer transformer =
                XmlSecurityUtils.createSecureTransformerFactory().newTransformer();
        transformer.setOutputProperty(OutputKeys.INDENT, "yes");
        transformer.setOutputProperty(OutputKeys.OMIT_XML_DECLARATION, "yes");
        StringWriter writer = new StringWriter();
        transformer.transform(new DOMSource(doc), new StreamResult(writer));
        return writer.toString();
    }
}
