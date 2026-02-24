package org.frankframework.flow.xml;

import org.frankframework.flow.project.InvalidXmlContentException;
import org.frankframework.flow.utility.XmlAdapterUtils;
import org.frankframework.flow.utility.XmlValidator;
import org.springframework.stereotype.Service;

@Service
public class XmlService {

    public XmlService() {}

    public void validateXml(String xmlContent) throws InvalidXmlContentException {
        XmlValidator.validateXml(xmlContent);
    }

    public String normalizeElementsInXml(String xmlContent) throws InvalidXmlContentException, Exception {
        validateXml(xmlContent);
        String normalizedXml = XmlAdapterUtils.normalizeFrankElements(xmlContent);
        return normalizedXml;
    }
}
