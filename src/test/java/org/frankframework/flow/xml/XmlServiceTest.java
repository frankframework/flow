package org.frankframework.flow.xml;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

import org.frankframework.flow.project.InvalidXmlContentException;
import org.frankframework.flow.utility.XmlConfigurationUtils;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.MockedStatic;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class XmlServiceTest {

	private XmlService xmlService;

	@BeforeEach
	void setUp() {
		xmlService = new XmlService();
	}

	@Test
	void normalizeElementsInXmlShouldReturnNormalizedXmlWhenValid() throws Exception {
		String xml = "<adapter/>";
		String normalizedXml = "<Adapter/>";

		try (MockedStatic<XmlConfigurationUtils> adapterMock = mockStatic(XmlConfigurationUtils.class)) {
			adapterMock
					.when(() -> XmlConfigurationUtils.normalizeFrankElements(xml))
					.thenReturn(normalizedXml);

			String result = xmlService.normalizeElementsInXml(xml);

			assertEquals(normalizedXml, result);

			adapterMock.verify(() -> XmlConfigurationUtils.normalizeFrankElements(xml));
		}
	}

	@Test
	void normalizeElementsInXmlShouldThrowWhenXmlIsInvalid() {
		String xml = "<invalid>";

		InvalidXmlContentException ex =
				assertThrows(InvalidXmlContentException.class, () -> xmlService.normalizeElementsInXml(xml));

		assertEquals("Invalid XML", ex.getMessage());
	}

	@Test
	void normalizeElementsInXmlShouldThrowWhenAdapterThrowsException() {
		String xml = "<adapter/>";

		try (MockedStatic<XmlConfigurationUtils> adapterMock = mockStatic(XmlConfigurationUtils.class)) {
			adapterMock
					.when(() -> XmlConfigurationUtils.normalizeFrankElements(xml))
					.thenThrow(new RuntimeException("Adapter failed"));

			RuntimeException ex = assertThrows(RuntimeException.class, () -> xmlService.normalizeElementsInXml(xml));

			assertEquals("Adapter failed", ex.getMessage());

			adapterMock.verify(() -> XmlConfigurationUtils.normalizeFrankElements(xml));
		}
	}
}
