package org.frankframework.flow.project;

import java.io.ByteArrayInputStream;
import java.io.StringWriter;
import java.util.ArrayList;
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
    private final String name;
    private final ArrayList<Configuration> configurations;
    private final ProjectSettings projectSettings;

    public Project(String name) {
        this.name = name;
        this.configurations = new ArrayList<>();
        this.projectSettings = new ProjectSettings();
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

    public boolean isFilterEnabled(FilterType type) {
        return projectSettings.isEnabled(type);
    }

    public void enableFilter(FilterType type) {
        projectSettings.setEnabled(type, true);
    }

    public void disableFilter(FilterType type) {
        projectSettings.setEnabled(type, false);
    }

    public boolean updateAdapter(String configurationName, String adapterName, String newAdapterXml) {
        for (Configuration config : configurations) {
            if (!config.getFilename().equals(configurationName)) {
                continue;
            }

            try {
                Document configDoc = XmlSecurityUtils.createSecureDocumentBuilder()
                        .parse(new ByteArrayInputStream(config.getXmlContent().getBytes()));

                Document newAdapterDoc = XmlSecurityUtils.createSecureDocumentBuilder()
                        .parse(new ByteArrayInputStream(newAdapterXml.getBytes()));

                Node newAdapterNode = configDoc.importNode(newAdapterDoc.getDocumentElement(), true);

                if (XmlSecurityUtils.replaceElementByAttribute(
                        configDoc, "Adapter", "name", adapterName, newAdapterNode)) {
                    config.setXmlContent(convertDocumentToString(configDoc));
                    return true;
                }
            } catch (Exception e) {
                e.printStackTrace();
                return false;
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
