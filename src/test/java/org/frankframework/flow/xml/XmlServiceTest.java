package org.frankframework.flow.xml;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

import org.frankframework.flow.project.InvalidXmlContentException;
import org.frankframework.flow.utility.XmlAdapterUtils;
import org.frankframework.flow.utility.XmlValidator;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.MockedStatic;
import org.mockito.junit.jupiter.MockitoExtension;
import org.junit.jupiter.api.extension.ExtendWith;

@ExtendWith(MockitoExtension.class)
class XmlServiceTest {

    private XmlService xmlService;

    @BeforeEach
    void setUp() {
        xmlService = new XmlService();
    }

    @Test
    void validateXmlShouldSucceedWhenXmlIsValid() {
        String xml = "<root></root>";

        // Mock static validator
        try (MockedStatic<XmlValidator> validatorMock = mockStatic(XmlValidator.class)) {
            assertDoesNotThrow(() -> xmlService.validateXml(xml));

            validatorMock.verify(() -> XmlValidator.validateXml(xml));
        }
    }

    @Test
    void validateXmlShouldThrowWhenXmlIsInvalid() {
        String xml = "<invalid>";

        try (MockedStatic<XmlValidator> validatorMock = mockStatic(XmlValidator.class)) {
            validatorMock
                    .when(() -> XmlValidator.validateXml(xml))
                    .thenThrow(new InvalidXmlContentException("Invalid XML"));

            InvalidXmlContentException ex = assertThrows(InvalidXmlContentException.class,
                    () -> xmlService.validateXml(xml));

            assertEquals("Invalid XML", ex.getMessage());
        }
    }

    @Test
    void normalizeElementsInXmlShouldReturnNormalizedXmlWhenValid() throws Exception {
        String xml = "<adapter/>";
        String normalizedXml = "<Adapter/>";

        try (MockedStatic<XmlValidator> validatorMock = mockStatic(XmlValidator.class);
                MockedStatic<XmlAdapterUtils> adapterMock = mockStatic(XmlAdapterUtils.class)) {

            adapterMock.when(() -> XmlAdapterUtils.normalizeFrankElements(xml)).thenReturn(normalizedXml);

            String result = xmlService.normalizeElementsInXml(xml);

            assertEquals(normalizedXml, result);

            validatorMock.verify(() -> XmlValidator.validateXml(xml));
            adapterMock.verify(() -> XmlAdapterUtils.normalizeFrankElements(xml));
        }
    }

    @Test
    void normalizeElementsInXmlShouldThrowWhenXmlIsInvalid() {
        String xml = "<invalid>";

        try (MockedStatic<XmlValidator> validatorMock = mockStatic(XmlValidator.class)) {
            validatorMock
                    .when(() -> XmlValidator.validateXml(xml))
                    .thenThrow(new InvalidXmlContentException("Invalid XML"));

            InvalidXmlContentException ex = assertThrows(InvalidXmlContentException.class,
                    () -> xmlService.normalizeElementsInXml(xml));

            assertEquals("Invalid XML", ex.getMessage());
        }
    }

    @Test
    void normalizeElementsInXmlShouldThrowWhenAdapterThrowsException() throws Exception {
        String xml = "<adapter/>";

        try (MockedStatic<XmlValidator> validatorMock = mockStatic(XmlValidator.class);
                MockedStatic<XmlAdapterUtils> adapterMock = mockStatic(XmlAdapterUtils.class)) {

            adapterMock
                    .when(() -> XmlAdapterUtils.normalizeFrankElements(xml))
                    .thenThrow(new RuntimeException("Adapter failed"));

            RuntimeException ex = assertThrows(RuntimeException.class, () -> xmlService.normalizeElementsInXml(xml));

            assertEquals("Adapter failed", ex.getMessage());

            validatorMock.verify(() -> XmlValidator.validateXml(xml));
            adapterMock.verify(() -> XmlAdapterUtils.normalizeFrankElements(xml));
        }
    }
}
