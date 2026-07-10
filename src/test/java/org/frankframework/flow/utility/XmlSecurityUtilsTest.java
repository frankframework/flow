package org.frankframework.flow.utility;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;

import java.io.ByteArrayInputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import org.junit.jupiter.api.Test;
import org.w3c.dom.Document;

class XmlSecurityUtilsTest {

	private Document parse(String xml) throws Exception {
		return XmlSecurityUtils.createSecureDocumentBuilder()
				.parse(new ByteArrayInputStream(xml.getBytes(StandardCharsets.UTF_8)));
	}

	@Test
	void createSecureDocumentBuilder_acceptsConfigurationWithDoctype() {
		String xml = """
				<?xml version="1.0" encoding="UTF-8"?>
				<!DOCTYPE Configuration>
				<Configuration name="Main"/>
				""";

		Document document = assertDoesNotThrow(() -> parse(xml));

		assertEquals("Configuration", document.getDocumentElement().getTagName());
		assertEquals("Main", document.getDocumentElement().getAttribute("name"));
	}

	@Test
	void createSecureDocumentBuilder_acceptsInternalDtdSubsetWithEntities() {
		String xml = """
				<?xml version="1.0" encoding="UTF-8"?>
				<!DOCTYPE Configuration [ <!ENTITY copy "&#169;"> ]>
				<Configuration name="Main"/>
				""";

		Document document = assertDoesNotThrow(() -> parse(xml));

		assertEquals("Configuration", document.getDocumentElement().getTagName());
	}

	@Test
	void createSecureDocumentBuilder_doesNotResolveExternalEntities() throws Exception {
		Path secretFile = Files.createTempFile("xxe-secret", ".txt");
		try {
			Files.writeString(secretFile, "TOP_SECRET_CONTENT");
			String systemId = secretFile.toUri().toString();

			String xml = "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n"
					+ "<!DOCTYPE Configuration [ <!ENTITY xxe SYSTEM \"" + systemId + "\"> ]>\n"
					+ "<Configuration>&xxe;</Configuration>";

			Document document = assertDoesNotThrow(() -> parse(xml));

			assertFalse(document.getDocumentElement().getTextContent().contains("TOP_SECRET_CONTENT"));
		} finally {
			Files.deleteIfExists(secretFile);
		}
	}
}
