package org.frankframework.flow.utility;

import javax.xml.XMLConstants;
import javax.xml.parsers.DocumentBuilder;
import javax.xml.parsers.DocumentBuilderFactory;
import javax.xml.parsers.ParserConfigurationException;
import javax.xml.transform.TransformerFactory;
import lombok.experimental.UtilityClass;
import lombok.extern.log4j.Log4j2;
import org.xml.sax.ErrorHandler;
import org.xml.sax.SAXException;
import org.xml.sax.SAXParseException;

/**
 * Utility class for creating secure XML parsers and transformers that prevent XXE vulnerabilities.
 */
@Log4j2
@UtilityClass
public class XmlSecurityUtils {

	private static final ErrorHandler QUIET_ERROR_HANDLER = new ErrorHandler() {
		@Override
		public void warning(SAXParseException exception) {
			log.debug("XML parse warning: {}", exception.getMessage());
		}

		@Override
		public void error(SAXParseException exception) throws SAXException {
			throw exception;
		}

		@Override
		public void fatalError(SAXParseException exception) throws SAXException {
			throw exception;
		}
	};

	/**
	 * Creates a secure DocumentBuilderFactory configured to prevent XXE attacks.
	 *
	 * @return A DocumentBuilderFactory with security features enabled
	 * @throws ParserConfigurationException if security features cannot be set
	 */
	public static DocumentBuilderFactory createSecureDocumentBuilderFactory() throws ParserConfigurationException {
		DocumentBuilderFactory factory = DocumentBuilderFactory.newInstance();
		factory.setNamespaceAware(true);
		factory.setIgnoringComments(true);
		factory.setFeature(XMLConstants.FEATURE_SECURE_PROCESSING, true);
		factory.setFeature("http://apache.org/xml/features/disallow-doctype-decl", false);
		factory.setFeature("http://xml.org/sax/features/external-general-entities", false);
		factory.setFeature("http://xml.org/sax/features/external-parameter-entities", false);
		factory.setFeature("http://apache.org/xml/features/nonvalidating/load-external-dtd", false);
		factory.setXIncludeAware(false);
		factory.setExpandEntityReferences(false);

		return factory;
	}

	/**
	 * Creates a secure DocumentBuilder configured to prevent XXE attacks.
	 *
	 * @return A DocumentBuilder with security features enabled
	 * @throws ParserConfigurationException if the parser cannot be created
	 */
	public static DocumentBuilder createSecureDocumentBuilder() throws ParserConfigurationException {
		DocumentBuilder builder = createSecureDocumentBuilderFactory().newDocumentBuilder();
		builder.setErrorHandler(QUIET_ERROR_HANDLER);
		return builder;
	}

	/**
	 * Creates a secure TransformerFactory configured to prevent XXE attacks.
	 *
	 * @return A TransformerFactory with security features enabled
	 * @throws IllegalStateException if security features cannot be set
	 */
	public static TransformerFactory createSecureTransformerFactory() {
		TransformerFactory factory = TransformerFactory.newInstance();
		try {
			factory.setFeature(XMLConstants.FEATURE_SECURE_PROCESSING, true);
			factory.setAttribute(XMLConstants.ACCESS_EXTERNAL_DTD, "");
			factory.setAttribute(XMLConstants.ACCESS_EXTERNAL_STYLESHEET, "");
		} catch (Exception e) {
			throw new IllegalStateException("Could not create secure TransformerFactory: " + e.getMessage());
		}
		return factory;
	}
}
