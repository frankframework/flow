package org.frankframework.flow.common.config;

import org.frankframework.lifecycle.servlets.AuthenticatorUtils;
import org.frankframework.lifecycle.servlets.IAuthenticator;

import org.frankframework.lifecycle.servlets.SecuritySettings;

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
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.util.matcher.AnyRequestMatcher;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity(jsr250Enabled = true, prePostEnabled = false)
@Order(Ordered.HIGHEST_PRECEDENCE)
public class SecurityChainConfigurer implements ApplicationContextAware {

	private ApplicationContext applicationContext;

	@Override
	public void setApplicationContext(ApplicationContext applicationContext) throws BeansException {
		this.applicationContext = applicationContext;
		SecuritySettings.setupDefaultSecuritySettings(applicationContext.getEnvironment());
	}

	@Bean
	public SecurityFilterChain configureChain(/*IAuthenticator authenticator,*/ HttpSecurity http) throws Exception {
		http.headers(headers -> headers.frameOptions(HeadersConfigurer.FrameOptionsConfig::sameOrigin));
		http.csrf(CsrfConfigurer::disable);
		http.securityMatcher(AnyRequestMatcher.INSTANCE);
		http.formLogin(FormLoginConfigurer::disable);
		http.logout(LogoutConfigurer::disable);
		http.sessionManagement(management -> management.sessionCreationPolicy(SessionCreationPolicy.IF_REQUIRED));

		// Doesn't work because it requires endpoints to be defined, WebConfiguration sets up te endpoints and I don't know how to get those here yet.
		// return authenticator.configureHttpSecurity(http);
		return http.build();
	}

	@Bean
	public IAuthenticator flowAuthenticator() {
		String propertyPrefix = "application.security.flow.authentication.";
		return AuthenticatorUtils.createAuthenticator(applicationContext, propertyPrefix);
	}
}
