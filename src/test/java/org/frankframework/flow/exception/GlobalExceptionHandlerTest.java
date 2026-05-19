package org.frankframework.flow.exception;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.io.IOException;
import java.nio.file.FileAlreadyExistsException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
import org.xml.sax.SAXException;

class GlobalExceptionHandlerTest {

	private MockMvc mockMvc;
	private RuntimeException runtimeException;
	private Exception checkedException;

	@BeforeEach
	void setUp() {
		runtimeException = null;
		checkedException = null;
		mockMvc = MockMvcBuilders
				.standaloneSetup(new ThrowingController())
				.setControllerAdvice(new GlobalExceptionHandler())
				.build();
	}

	@RestController
	class ThrowingController {
		@GetMapping("/test")
		public String test() throws Exception {
			if (runtimeException != null) throw runtimeException;
			if (checkedException != null) throw checkedException;
			return "ok";
		}
	}

	@Test
	void handleIllegalArgumentException_returnsBadRequest() throws Exception {
		runtimeException = new IllegalArgumentException("invalid input");
		mockMvc.perform(get("/test"))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.status").value(HttpStatus.BAD_REQUEST.getReasonPhrase()))
				.andExpect(jsonPath("$.error").value("invalid input"));
	}

	@Test
	void handleFileAlreadyExistsException_returnsConflict() throws Exception {
		checkedException = new FileAlreadyExistsException("file.xml");
		mockMvc.perform(get("/test"))
				.andExpect(status().isConflict())
				.andExpect(jsonPath("$.status").value(HttpStatus.CONFLICT.getReasonPhrase()))
				.andExpect(jsonPath("$.error").value("A file or folder with that name already exists"));
	}

	@Test
	void handleIOException_returnsInternalServerError() throws Exception {
		checkedException = new IOException("disk read error");
		mockMvc.perform(get("/test"))
				.andExpect(status().isInternalServerError())
				.andExpect(jsonPath("$.status").value(HttpStatus.INTERNAL_SERVER_ERROR.getReasonPhrase()))
				.andExpect(jsonPath("$.error").value("A filesystem error occurred: disk read error"));
	}

	@Test
	void handleSAXException_returnsInternalServerError() throws Exception {
		checkedException = new SAXException("unexpected element");
		mockMvc.perform(get("/test"))
				.andExpect(status().isInternalServerError())
				.andExpect(jsonPath("$.status").value(HttpStatus.INTERNAL_SERVER_ERROR.getReasonPhrase()))
				.andExpect(jsonPath("$.error").value("Invalid XML content: unexpected element"));
	}

	@Test
	void handleIllegalArgumentException_withNewlineInMessage_replacesNewline() throws Exception {
		runtimeException = new IllegalArgumentException("line1" + System.lineSeparator() + "line2");
		mockMvc.perform(get("/test"))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.error").value("line1 line2"));
	}

	@Test
	void handleIllegalArgumentException_withNullMessage_returnsNullError() throws Exception {
		runtimeException = new IllegalArgumentException((String) null);
		mockMvc.perform(get("/test"))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.status").value(HttpStatus.BAD_REQUEST.getReasonPhrase()));
	}

	@Test
	void handleIOException_withNullMessage_returnsNullSuffix() throws Exception {
		checkedException = new IOException((String) null);
		mockMvc.perform(get("/test"))
				.andExpect(status().isInternalServerError())
				.andExpect(jsonPath("$.error").value("A filesystem error occurred: null"));
	}
}
