package org.frankframework.flow.xml;

import org.frankframework.flow.project.InvalidXmlContentException;
import org.frankframework.flow.utility.XmlConfigurationUtils;
import org.springframework.stereotype.Service;
import org.xml.sax.SAXException;

@Service
public class XmlService {
    public String normalizeElementsInXml(String xmlContent) throws Exception {
        try {
            return XmlAdapterUtils.normalizeFrankElements(xmlContent);
        } catch (SAXException e) {
            throw new InvalidXmlContentException("Invalid XML", e);
        }
    }
}
