package org.frankframework.flow.common.config;

import java.util.Arrays;
import java.util.List;

import lombok.Setter;

import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;

import org.frankframework.lifecycle.DynamicRegistration.Servlet;

import org.frankframework.lifecycle.servlets.AuthenticatorUtils;
import org.frankframework.lifecycle.servlets.IAuthenticator;

import org.frankframework.security.config.ServletRegistration;
import org.frankframework.util.ClassUtils;

import org.springframework.beans.BeansException;
import org.springframework.context.ApplicationContext;
import org.springframework.context.ApplicationContextAware;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.CsrfConfigurer;
import org.springframework.security.config.annotation.web.configurers.FormLoginConfigurer;
import org.springframework.security.config.annotation.web.configurers.HeadersConfigurer;
import org.springframework.security.config.annotation.web.configurers.LogoutConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.util.matcher.AnyRequestMatcher;

/**
 * Enable security, although it's anonymous on all endpoints, but at least sets the
 * SecurityContextHolder.getContext().getAuthentication() object.
 */
@Configuration
@EnableWebSecurity
@EnableMethodSecurity(jsr250Enabled = true, prePostEnabled = false)
@Order(Ordered.HIGHEST_PRECEDENCE)
public class SecurityChainConfigurer implements ApplicationContextAware {

	private @Setter ApplicationContext applicationContext;

	@Bean
	public SecurityFilterChain configureChain(IAuthenticator authenticator, HttpSecurity http) throws Exception {
		http.headers(headers -> headers.frameOptions(HeadersConfigurer.FrameOptionsConfig::sameOrigin));
		http.csrf(CsrfConfigurer::disable);
		http.securityMatcher(AnyRequestMatcher.INSTANCE);
		http.formLogin(FormLoginConfigurer::disable);
		http.logout(LogoutConfigurer::disable);
//		http.anonymous(anonymous -> anonymous.authorities(getAuthorities()));
//		http.authorizeHttpRequests(requests -> requests.requestMatchers(AnyRequestMatcher.INSTANCE).permitAll());
		http.sessionManagement(management -> management.sessionCreationPolicy(SessionCreationPolicy.IF_REQUIRED));

		return authenticator.configureHttpSecurity(http);
	}

	/*private List<GrantedAuthority> getAuthorities() {
		return Arrays.stream(Servlet.ALL_IBIS_USER_ROLES)
				.map(role -> (GrantedAuthority) new SimpleGrantedAuthority("ROLE_" + role))
				.toList();
	}*/

	@Bean
	public IAuthenticator flowAuthenticator() {
		String propertyPrefix = "application.security.flow.authentication.";
		return AuthenticatorUtils.createAuthenticator(applicationContext, propertyPrefix);
	}
}
