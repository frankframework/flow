package org.frankframework.flow.utility;

import lombok.NoArgsConstructor;

import org.frankframework.flow.exception.ApiException;
import org.frankframework.management.bus.BusMessageUtils;
import org.frankframework.management.bus.message.EmptyMessage;
import org.frankframework.management.bus.message.MessageBase;
import org.frankframework.util.StreamUtil;

import org.jspecify.annotations.NonNull;
import org.jspecify.annotations.Nullable;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.Message;
import org.springframework.web.servlet.mvc.method.annotation.StreamingResponseBody;

import java.io.IOException;
import java.io.InputStream;

@NoArgsConstructor(access = lombok.AccessLevel.PRIVATE)
public class ResponseUtils {

	public static ResponseEntity<?> convertToSpringResponse(Message<?> message) {
		return convertToSpringResponse(message, null);
	}

	@SuppressWarnings("unchecked")
	public static ResponseEntity<StreamingResponseBody> convertToSpringStreamingResponse(Message<InputStream> message) {
		StreamingResponseBody response = outputStream -> {
			InputStream inputStream = message.getPayload();
			int numberOfBytesToWrite;
			byte[] data = new byte[1024];
			while ((numberOfBytesToWrite = inputStream.read(data, 0, data.length)) != -1) {
				outputStream.write(data, 0, numberOfBytesToWrite);
			}
			inputStream.close();
		};
		return (ResponseEntity<StreamingResponseBody>) convertToSpringResponse(message, response);
	}

	public static ResponseEntity<?> convertToSpringResponse(Message<?> message, StreamingResponseBody response) {
		int status = BusMessageUtils.getIntHeader(message, MessageBase.STATUS_KEY, 200);
		String mimeType = BusMessageUtils.getHeader(message, MessageBase.MIMETYPE_KEY, null);
		ResponseEntity.BodyBuilder responseEntity = ResponseEntity.status(status);
		HttpHeaders httpHeaders = new HttpHeaders();

		if (mimeType != null) {
			httpHeaders.setContentType(MediaType.valueOf(mimeType));
		}

		String contentDisposition = BusMessageUtils.getHeader(message, MessageBase.CONTENT_DISPOSITION_KEY, null);
		if (contentDisposition != null) {
			httpHeaders.setContentDisposition(ContentDisposition.parse(contentDisposition));
		}

		responseEntity.headers(httpHeaders);

		if (hasPayload(status)) {
			if (response != null) {
				return responseEntity.body(response);
			}
			return responseEntity.body(message.getPayload());
		}

		return responseEntity.build();
	}

	/**
	 * Extracted method so it's in one place.
	 * See {@link EmptyMessage} for more info.
	 */
	private static boolean hasPayload(int status) {
		return (status == 200 || status > 204);
	}

	@Nullable
	public static String parseAsString(Message<?> message) throws ApiException {
		int status = BusMessageUtils.getIntHeader(message, MessageBase.STATUS_KEY, 200);
		if (!hasPayload(status)) {
			return null;
		}

		String mimeType = BusMessageUtils.getHeader(message, MessageBase.MIMETYPE_KEY, null);
		if (mimeType != null) {
			MediaType mime = MediaType.valueOf(mimeType);
			if (MediaType.APPLICATION_JSON.equalsTypeAndSubtype(mime) || MediaType.TEXT_PLAIN.equalsTypeAndSubtype(mime)) {
				return (String) message.getPayload();
			}
		}
		return convertPayload(message.getPayload());
	}

	@NonNull
	public static String convertPayload(Object payload) throws ApiException {
		if (payload instanceof String string) {
			return string;
		} else if (payload instanceof byte[] bytes) {
			return new String(bytes);
		} else if (payload instanceof InputStream stream) {
			try {
				// Convert line endings to \n to show them in the browser as real line feeds
				return StreamUtil.streamToString(stream, "\n", false);
			} catch (IOException exception) {
				throw new ApiException("unable to read response payload: " + exception.getMessage(), HttpStatus.INTERNAL_SERVER_ERROR);
			}
		}
		throw new ApiException("unexpected response payload type [" + payload.getClass().getCanonicalName() + "]", HttpStatus.INTERNAL_SERVER_ERROR);
	}
}
