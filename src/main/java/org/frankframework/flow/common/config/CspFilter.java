package org.frankframework.flow.common.config;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import org.apache.commons.lang3.StringUtils;
import org.jspecify.annotations.NonNull;
import org.springframework.security.web.header.writers.ContentSecurityPolicyHeaderWriter;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

@Component
public class CspFilter extends OncePerRequestFilter {

	@Override
	protected void doFilterInternal(
			@NonNull HttpServletRequest request,
			@NonNull HttpServletResponse response,
			FilterChain filterChain
	) throws ServletException, IOException {
		ContentSecurityPolicyHeaderWriter cspWriter = new ContentSecurityPolicyHeaderWriter();

		List<String> policyDirectives = new ArrayList<>();
		policyDirectives.add("default-src 'self';");
		policyDirectives.add("style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;");
		policyDirectives.add("font-src 'self' data: https://fonts.googleapis.com https://fonts.gstatic.com;");
		policyDirectives.add("script-src 'self' 'unsafe-eval';");
		policyDirectives.add("connect-src 'self' ws: wss:;");
		policyDirectives.add("img-src 'self' data:;");
		policyDirectives.add("frame-ancestors 'self';");
		policyDirectives.add("form-action 'none';");
		policyDirectives.add("worker-src 'self' blob:;");

		cspWriter.setPolicyDirectives(StringUtils.join(policyDirectives, " "));
		cspWriter.writeHeaders(request, response);
		filterChain.doFilter(request, response);
	}
}
