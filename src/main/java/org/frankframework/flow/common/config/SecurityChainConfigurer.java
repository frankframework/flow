package org.frankframework.flow.common.config;

import org.frankframework.lifecycle.servlets.AuthenticatorUtils;
import org.frankframework.lifecycle.servlets.IAuthenticator;
import org.frankframework.lifecycle.servlets.SecuritySettings;
import org.frankframework.lifecycle.servlets.ServletConfiguration;
import org.frankframework.lifecycle.servlets.SpaCsrfTokenRequestHandler;
import org.springframework.beans.BeansException;
import org.springframework.context.ApplicationContext;
import org.springframework.context.ApplicationContextAware;
import org.springframework.context.EnvironmentAware;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.core.env.Environment;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.FormLoginConfigurer;
import org.springframework.security.config.annotation.web.configurers.HeadersConfigurer;
import org.springframework.security.config.annotation.web.configurers.LogoutConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.csrf.CookieCsrfTokenRepository;
import org.springframework.security.web.csrf.CsrfFilter;
import org.springframework.security.web.util.matcher.AnyRequestMatcher;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity(jsr250Enabled = true, prePostEnabled = false)
@Order(Ordered.HIGHEST_PRECEDENCE)
public class SecurityChainConfigurer implements ApplicationContextAware, EnvironmentAware {

	private ApplicationContext applicationContext;
	private boolean csrfEnabled = true;

	@Override
	public void setApplicationContext(ApplicationContext applicationContext) throws BeansException {
		this.applicationContext = applicationContext;
		SecuritySettings.setupDefaultSecuritySettings(applicationContext.getEnvironment());
	}

	@Override
	public void setEnvironment(Environment environment) {
		csrfEnabled = environment.getProperty("csrf.enabled", boolean.class, true);
	}

	@Bean
	public SecurityFilterChain configureChain(IAuthenticator authenticator, HttpSecurity http) throws Exception {
		configureAuthenticator(authenticator);
		http.headers(headers -> headers.frameOptions(HeadersConfigurer.FrameOptionsConfig::sameOrigin));
		http.csrf(csrf -> {
			if (csrfEnabled) {
				csrf.csrfTokenRepository(CookieCsrfTokenRepository.withHttpOnlyFalse());
				csrf.csrfTokenRequestHandler(new SpaCsrfTokenRequestHandler());
				return;
			}
			csrf.disable();
		});
		http.securityMatcher(AnyRequestMatcher.INSTANCE);
		http.formLogin(FormLoginConfigurer::disable);
		http.logout(LogoutConfigurer::disable);
		http.sessionManagement(management -> management.sessionCreationPolicy(SessionCreationPolicy.IF_REQUIRED));

		if (csrfEnabled) {
			http.addFilterAfter(new CsrfCookieFilter(), CsrfFilter.class);
		}

		return authenticator.configureHttpSecurity(http);
	}

	@Bean
	public IAuthenticator flowAuthenticator() {
		String propertyPrefix = "application.security.flow.authentication.";
		return AuthenticatorUtils.createAuthenticator(applicationContext, propertyPrefix);
	}

	private void configureAuthenticator(IAuthenticator authenticator) {
		ServletConfiguration servletConfig = new ServletConfiguration();
		servletConfig.setUrlMapping("/*");
		authenticator.registerServlet(servletConfig);
	}
}
