package org.frankframework.flow.common.config;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertSame;

import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

class CspFilterTest {

	private static final String CONTENT_SECURITY_POLICY = "Content-Security-Policy";
	private static final String EXPECTED_POLICY =
			"default-src 'self'; "
					+ "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
					+ "font-src 'self' data: https://fonts.googleapis.com https://fonts.gstatic.com; "
					+ "script-src 'self' 'unsafe-eval'; "
					+ "connect-src 'self' ws: wss:; "
					+ "img-src 'self' data:; "
					+ "frame-ancestors 'self'; "
					+ "form-action 'none'; "
					+ "worker-src 'self' blob:;";

	private final CspFilter cspFilter = new CspFilter();

	@Test
	void doFilterAddsExpectedContentSecurityPolicyHeader() throws Exception {
		MockHttpServletRequest request = new MockHttpServletRequest();
		MockHttpServletResponse response = new MockHttpServletResponse();
		MockFilterChain filterChain = new MockFilterChain();

		cspFilter.doFilter(request, response, filterChain);

		assertEquals(EXPECTED_POLICY, response.getHeader(CONTENT_SECURITY_POLICY));
	}

	@Test
	void doFilterContinuesTheFilterChain() throws Exception {
		MockHttpServletRequest request = new MockHttpServletRequest();
		MockHttpServletResponse response = new MockHttpServletResponse();
		MockFilterChain filterChain = new MockFilterChain();

		cspFilter.doFilter(request, response, filterChain);

		assertSame(request, filterChain.getRequest());
		assertSame(response, filterChain.getResponse());
	}
}
