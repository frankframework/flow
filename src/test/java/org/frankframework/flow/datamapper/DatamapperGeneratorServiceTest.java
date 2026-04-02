package org.frankframework.flow.datamapper;

import static org.junit.Assert.assertEquals;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.when;

import java.io.File;
import java.io.IOException;
import java.io.StringReader;
import java.io.StringWriter;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.Comparator;
import javax.xml.parsers.DocumentBuilder;
import javax.xml.parsers.DocumentBuilderFactory;
import javax.xml.parsers.ParserConfigurationException;
import javax.xml.transform.*;
import javax.xml.transform.dom.DOMSource;
import javax.xml.transform.stream.StreamResult;
import javax.xml.transform.stream.StreamSource;
import net.sf.saxon.s9api.*;
import org.frankframework.flow.exception.ApiException;
import org.frankframework.flow.file.FileTreeNode;
import org.frankframework.flow.file.FileTreeService;
import org.frankframework.flow.filesystem.FileOperations;
import org.frankframework.flow.filesystem.FileSystemStorage;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.w3c.dom.Document;
import org.xml.sax.SAXException;

@ExtendWith(MockitoExtension.class)
public class DatamapperGeneratorServiceTest {
	@Mock
	private FileSystemStorage fileSystemStorage;

	@Mock
	private FileTreeService fileTreeService;

	private DatamapperGeneratorService service;
	private Processor processor;
	private XsltCompiler compiler;

	private static final String TEST_PROJECT_NAME = "FrankFlowTestProject";

	private Path tempProjectRoot;

	private void stubToAbsolutePath() {
		when(fileSystemStorage.toAbsolutePath(anyString())).thenAnswer(invocation -> {
			String path = invocation.getArgument(0);
			return Paths.get(path);
		});
	}

	private void stubDeleteFile() throws IOException {
		doAnswer(invocation -> {
			String path = invocation.getArgument(0);
			FileOperations.deleteRecursively(Paths.get(path));
			return null;
		})
				.when(fileSystemStorage)
				.delete(anyString());
	}

	private void stubWriteFile() throws IOException {
		doAnswer(invocation -> {
			String path = invocation.getArgument(0);
			String content = invocation.getArgument(1);
			Files.writeString(Paths.get(path), content);
			return null;
		})
				.when(fileSystemStorage)
				.writeFile(anyString(), anyString());
	}

	private void stubGetConfigurationsDirectoryTree() throws IOException {
		when(fileTreeService.getConfigurationsDirectoryTree(anyString())).thenAnswer(invocation -> {
			FileTreeNode fileTreeNode = new FileTreeNode();
			fileTreeNode.setPath(tempProjectRoot.toString());
			return fileTreeNode;
		});
	}

	@BeforeEach
	void setUp() throws IOException {
		tempProjectRoot = Files.createTempDirectory("flow_unit_test");
		Files.copy(
				Paths.get("src/test/resources/datamapper/productSchema.xml"),
				tempProjectRoot.resolve("productSchema.xml"),
				StandardCopyOption.REPLACE_EXISTING
		);
		Files.copy(
				Paths.get("src/test/resources/datamapper/userSchema.xml"),
				tempProjectRoot.resolve("userSchema.xml"),
				StandardCopyOption.REPLACE_EXISTING
		);
		Files.copy(
				Paths.get("src/test/resources/datamapper/productSchema.json"),
				tempProjectRoot.resolve("productSchema.json"),
				StandardCopyOption.REPLACE_EXISTING
		);
		Files.copy(
				Paths.get("src/test/resources/datamapper/userSchema.json"),
				tempProjectRoot.resolve("userSchema.json"),
				StandardCopyOption.REPLACE_EXISTING
		);

		service = new DatamapperGeneratorService(fileSystemStorage, fileTreeService);
		processor = new Processor(false);
		compiler = processor.newXsltCompiler();
	}

	@AfterEach
	public void tearDown() throws IOException {
		if (tempProjectRoot != null && Files.exists(tempProjectRoot)) {
			Files.walk(tempProjectRoot)
					.sorted(Comparator.reverseOrder())
					.map(Path::toFile)
					.forEach(File::delete);
		}
	}

	@Test
	@DisplayName("Test XSLT generation")
	public void generateMapping() throws IOException, ParserConfigurationException, SAXException, ApiException {
		stubToAbsolutePath();

		service.generate(
				"src/test/resources/datamapper/inputJsonToXml.json", tempProjectRoot.toAbsolutePath() + "/output.xslt");
		Document expectedResult = parse("src/test/resources/datamapper/outputData.xml");
		Document actualResult = parse(tempProjectRoot.toAbsolutePath() + "/output.xslt");

		Assertions.assertEquals(
				expectedResult.toString().trim(), actualResult.toString().trim());
	}

	@Test
	@DisplayName("Test XML to XML mapping")
	public void testXMLtoXMLGeneratedMapping()
			throws SaxonApiException, IOException, ParserConfigurationException, SAXException, TransformerException,
			ApiException {
		stubToAbsolutePath();
		service.generate(
				"src/test/resources/datamapper/inputXmlToXml.json", tempProjectRoot.toAbsolutePath() + "/output.xslt");

		XsltExecutable executable =
				compiler.compile(new StreamSource(new File(tempProjectRoot.toAbsolutePath() + "/output.xslt")));
		XsltTransformer transformer = executable.load();

		transformer.setSource(new StreamSource(new File("src/test/resources/datamapper/inputData.xml")));

		StringWriter writer = new StringWriter();
		Serializer out = processor.newSerializer(writer);
		transformer.setDestination(out);

		transformer.transform();

		Document expectedResult = parse("src/test/resources/datamapper/outputData.xml");
		Assertions.assertEquals(
				toString(expectedResult).trim(), writer.toString().trim());
	}

	@Test
	@DisplayName("Test XML to XML mapping with arrays")
	public void testXMLtoXMLWithArraysGeneratedMapping()
			throws SaxonApiException, IOException, ParserConfigurationException, SAXException, TransformerException,
			ApiException {
		stubToAbsolutePath();
		service.generate(
				"src/test/resources/datamapper/inputXmlToXmlWithArray.json",
				tempProjectRoot.toAbsolutePath() + "/output.xslt"
		);

		XsltExecutable executable =
				compiler.compile(new StreamSource(new File(tempProjectRoot.toAbsolutePath() + "/output.xslt")));
		XsltTransformer transformer = executable.load();

		transformer.setSource(new StreamSource(new File("src/test/resources/datamapper/inputDataWithArray.xml")));

		StringWriter writer = new StringWriter();
		Serializer out = processor.newSerializer(writer);
		transformer.setDestination(out);

		transformer.transform();

		Document expectedResult = parse("src/test/resources/datamapper/outputDataWithArray.xml");
		Assertions.assertEquals(
				toString(expectedResult).trim(), writer.toString().trim());
	}

	@Test
	@DisplayName("Test XML to XML mapping with attributes")
	public void testXMLtoXMLWithAttributesGeneratedMapping()
			throws SaxonApiException, IOException, ParserConfigurationException, SAXException, TransformerException,
			ApiException {
		stubToAbsolutePath();
		service.generate(
				"src/test/resources/datamapper/inputXmlToXmlWithArrayWithAttributes.json",
				tempProjectRoot.toAbsolutePath() + "/output.xslt"
		);

		XsltExecutable executable =
				compiler.compile(new StreamSource(new File(tempProjectRoot.toAbsolutePath() + "/output.xslt")));
		XsltTransformer transformer = executable.load();

		transformer.setSource(new StreamSource(new File("src/test/resources/datamapper/inputDataWithArray.xml")));

		StringWriter writer = new StringWriter();
		Serializer out = processor.newSerializer(writer);
		transformer.setDestination(out);

		transformer.transform();

		Document expectedResult = parse("src/test/resources/datamapper/outputDataWithAttributes.xml");
		Assertions.assertEquals(
				toString(expectedResult).trim(), writer.toString().trim());
	}

	@Test
	@DisplayName("Test All functions")
	public void testAllFunctionsGeneratedMapping()
			throws SaxonApiException, IOException, ParserConfigurationException, SAXException, TransformerException,
			ApiException {
		stubToAbsolutePath();
		service.generate(
				"src/test/resources/datamapper/generationFileTestAllFunctions.json",
				tempProjectRoot.toAbsolutePath() + "/output.xslt"
		);

		XsltExecutable executable =
				compiler.compile(new StreamSource(new File(tempProjectRoot.toAbsolutePath() + "/output.xslt")));
		XsltTransformer transformer = executable.load();

		transformer.setSource(new StreamSource(new File("src/test/resources/datamapper/inputDataFunctions.xml")));

		StringWriter writer = new StringWriter();
		Serializer out = processor.newSerializer(writer);
		transformer.setDestination(out);

		transformer.transform();

		Document expectedResult = parse("src/test/resources/datamapper/outputFunctions.xml");
		Assertions.assertEquals(
				toString(expectedResult).trim(), writer.toString().trim());
	}

	@Test
	@DisplayName("Test XML to Json mapping")
	public void testXMLtoJSONGeneratedMapping() throws SaxonApiException, IOException, ApiException {
		stubToAbsolutePath();

		service.generate(
				"src/test/resources/datamapper/inputXmlToJson.json", tempProjectRoot.toAbsolutePath() + "/output.xslt");

		XsltExecutable executable =
				compiler.compile(new StreamSource(new File(tempProjectRoot.toAbsolutePath() + "/output.xslt")));
		Xslt30Transformer transformer = executable.load30();

		StreamSource xmlSource = new StreamSource(new File("src/test/resources/datamapper/inputData.xml"));
		StringWriter writer = new StringWriter();
		Serializer out = processor.newSerializer(writer);

		transformer.transform(xmlSource, out);

		Path path = Paths.get("src/test/resources/datamapper/outputData.json");
		String expectedResult = Files.readString(path);

		Assertions.assertEquals(expectedResult.trim(), writer.toString().trim());
	}

	@Test
	@DisplayName("Test XML to Json with arrays mapping")
	public void testManualXMLtoJSONWithArraysGeneratedMapping() throws SaxonApiException, IOException, ApiException {
		stubToAbsolutePath();

		service.generate(
				"src/test/resources/datamapper/inputXmlToJsonWithArray.json",
				tempProjectRoot.toAbsolutePath() + "/output.xslt"
		);

		XsltExecutable executable =
				compiler.compile(new StreamSource(new File(tempProjectRoot.toAbsolutePath() + "/output.xslt")));
		Xslt30Transformer transformer = executable.load30();

		StreamSource xmlSource = new StreamSource(new File("src/test/resources/datamapper/inputDataWithArray.xml"));

		StringWriter writer = new StringWriter();
		Serializer out = processor.newSerializer(writer);

		transformer.transform(xmlSource, out);

		Path path = Paths.get("src/test/resources/datamapper/outputDataWithArray.json");
		String expectedResult = Files.readString(path);

		Assertions.assertEquals(expectedResult.trim(), writer.toString().trim());
	}

	@Test
	@DisplayName("Test Json to XML mapping")
	public void testJSONtoXMLGeneratedMapping()
			throws IOException, SaxonApiException, ParserConfigurationException, SAXException, TransformerException,
			ApiException {
		stubToAbsolutePath();

		service.generate(
				"src/test/resources/datamapper/inputJsonToXml.json", tempProjectRoot.toAbsolutePath() + "/output.xslt");

		XsltExecutable executable =
				compiler.compile(new StreamSource(new File(tempProjectRoot.toAbsolutePath() + "/output.xslt")));
		Xslt30Transformer transformer = executable.load30();

		StringWriter writer = new StringWriter();
		Serializer out = processor.newSerializer(writer);

		Path absolutePath = Paths.get("").toAbsolutePath().resolve("src/test/resources/datamapper/inputData.json");
		StreamSource paramsSource = new StreamSource(
				new StringReader("<params><jsonPath>" + absolutePath.toUri() + "</jsonPath></params>"));

		transformer.transform(paramsSource, out);

		Document expectedResult = parse("src/test/resources/datamapper/outputData.xml");
		Assertions.assertEquals(
				toString(expectedResult).trim(), writer.toString().trim());
	}

	@Test
	@DisplayName("Test Json to Json mapping")
	public void testJSONtoJSONGeneratedMapping() throws SaxonApiException, IOException, ApiException {
		stubToAbsolutePath();

		service.generate(
				"src/test/resources/datamapper/inputJsonToJson.json",
				tempProjectRoot.toAbsolutePath() + "/output.xslt"
		);

		XsltExecutable executable =
				compiler.compile(new StreamSource(new File(tempProjectRoot.toAbsolutePath() + "/output.xslt")));
		Xslt30Transformer transformer = executable.load30();

		StringWriter writer = new StringWriter();
		Serializer out = processor.newSerializer(writer);

		Path absolutePath = Paths.get("").toAbsolutePath().resolve("src/test/resources/datamapper/inputData.json");
		StreamSource paramsSource = new StreamSource(
				new StringReader("<params><jsonPath>" + absolutePath.toUri() + "</jsonPath></params>"),
				absolutePath.getParent().toUri().toString()
		);

		transformer.transform(paramsSource, out);

		Path path = Paths.get("src/test/resources/datamapper/outputData.json");
		String expectedResult = Files.readString(path);

		Assertions.assertEquals(expectedResult.trim(), writer.toString().trim());
	}

	@Test
	@DisplayName(("Should overwrite fill successfully"))
	public void testSaveGenerationFileOverwrite() throws IOException, ApiException {
		stubWriteFile();
		stubGetConfigurationsDirectoryTree();
		stubToAbsolutePath();

		Path datamapperDir = tempProjectRoot.resolve("datamapper");
		if (!Files.isDirectory(datamapperDir)) {
			Files.createDirectories(datamapperDir);
		}
		Path file = datamapperDir.resolve("generationFile.json");
		String content = "<test>data</test>";

		Files.writeString(file, content, StandardCharsets.UTF_8);

		String newContent = "new content";
		service.saveGenerationFile(TEST_PROJECT_NAME, newContent);

		assertEquals(newContent, Files.readString(file));
	}

	@Test
	@DisplayName("Should successfully create a new file ")
	public void testSaveGenerationFile() throws IOException, ApiException {
		stubWriteFile();
		stubGetConfigurationsDirectoryTree();
		stubToAbsolutePath();

		Path datamapperDir = tempProjectRoot.resolve("datamapper");
		if (!Files.isDirectory(datamapperDir)) {
			Files.createDirectories(datamapperDir);
		}
		Path file = datamapperDir.resolve("generationFile.json");
		String newContent = "new content";
		service.saveGenerationFile(TEST_PROJECT_NAME, newContent);

		assertEquals(newContent, Files.readString(file));
	}

	@Test
	@DisplayName("Test saving configuration and creating a mapping from it")
	public void fullGenerateMappingRun() throws IOException, ParserConfigurationException, SAXException, ApiException {
		stubGetConfigurationsDirectoryTree();
		stubWriteFile();
		stubGetConfigurationsDirectoryTree();
		stubToAbsolutePath();

		String config = Files.readString(Path.of("src/test/resources/datamapper/inputJsonToXml.json"));
		service.generateFromProject(TEST_PROJECT_NAME, config);
		Document expectedResult = parse("src/test/resources/datamapper/output.xslt");
		Document actualResult = parse(tempProjectRoot.toAbsolutePath() + "/datamapper/export.xslt");

		Assertions.assertEquals(
				expectedResult.toString().trim(), actualResult.toString().trim());
	}

	@Test
	@DisplayName("Test saving configuration deletes temporary config")
	public void fullGenerateRunDeletesTempConfig() throws IOException, ApiException {
		stubGetConfigurationsDirectoryTree();
		stubWriteFile();
		stubGetConfigurationsDirectoryTree();
		stubDeleteFile();
		stubToAbsolutePath();

		String config = Files.readString(Path.of("src/test/resources/datamapper/inputJsonToXml.json"));
		service.generateFromProject(TEST_PROJECT_NAME, config);

		Assertions.assertFalse(
				Files.exists(Path.of(tempProjectRoot.toAbsolutePath() + "/datamapper/generationFile.json")));
	}

	private Document parse(String path) throws ParserConfigurationException, IOException, SAXException {
		DocumentBuilderFactory factory = DocumentBuilderFactory.newInstance();
		factory.setIgnoringElementContentWhitespace(true);
		factory.setNamespaceAware(true);

		DocumentBuilder builder = factory.newDocumentBuilder();
		Document document = builder.parse(new File(path));
		document.normalizeDocument();
		return document;
	}

	private String toString(Document doc) throws TransformerException {
		TransformerFactory tf = TransformerFactory.newInstance();
		Transformer transformer = tf.newTransformer();
		transformer.setOutputProperty(OutputKeys.OMIT_XML_DECLARATION, "false");
		transformer.setOutputProperty(OutputKeys.INDENT, "yes");

		StringWriter writer = new StringWriter();
		transformer.transform(new DOMSource(doc), new StreamResult(writer));

		return writer.toString().trim();
	}
}
