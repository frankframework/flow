package org.frankframework.flow.common.config;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.cookie;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import jakarta.servlet.http.Cookie;
import org.frankframework.lifecycle.servlets.IAuthenticator;
import org.frankframework.lifecycle.servlets.ServletConfiguration;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.ApplicationContext;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Import;
import org.springframework.context.annotation.Primary;
import org.springframework.core.env.Environment;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@WebMvcTest(SecurityChainConfigurerCsrfTest.CsrfTestController.class)
@AutoConfigureMockMvc()
@Import({SecurityChainConfigurerCsrfTest.SecurityTestConfig.class, SecurityChainConfigurerCsrfTest.CsrfTestController.class})
@TestPropertySource(properties = "csrf.enabled=true")
class SecurityChainConfigurerCsrfTest {

	@Autowired
	private MockMvc mockMvc;

	@Test
	void getRequestExposesCsrfTokenAndWritesXsrfCookie() throws Exception {
		MvcResult result = mockMvc.perform(get("/test/csrf"))
				.andExpect(status().isOk())
				.andExpect(cookie().exists("XSRF-TOKEN"))
				.andReturn();

		Cookie xsrfCookie = result.getResponse().getCookie("XSRF-TOKEN");
		assertNotNull(xsrfCookie);
		assertFalse(xsrfCookie.getValue().isEmpty());
		assertFalse(result.getResponse().getContentAsString().isEmpty());
	}

	@Test
	void postWithoutCsrfHeaderIsForbidden() throws Exception {
		mockMvc.perform(post("/test/submit"))
				.andExpect(status().isForbidden());
	}

	@Test
	void postWithCsrfHeaderAndCookieIsAllowed() throws Exception {
		MvcResult csrfResult = mockMvc.perform(get("/test/csrf"))
				.andExpect(status().isOk())
				.andExpect(cookie().exists("XSRF-TOKEN"))
				.andReturn();

		Cookie xsrfCookie = csrfResult.getResponse().getCookie("XSRF-TOKEN");
		assertNotNull(xsrfCookie);

		mockMvc.perform(post("/test/submit")
						.cookie(xsrfCookie)
						.header("X-XSRF-TOKEN", xsrfCookie.getValue()))
				.andExpect(status().isOk());
	}

	@RestController
	@RequestMapping("/test")
	public static class CsrfTestController {
		@GetMapping("/csrf")
		public String csrfToken(CsrfToken csrfToken) {
			return csrfToken.getToken();
		}

		@PostMapping("/submit")
		public String submit() {
			return "ok";
		}
	}

	@Configuration
	@EnableWebSecurity
	static class SecurityTestConfig {

		@Bean
		SecurityFilterChain securityFilterChain(
				ApplicationContext applicationContext,
				Environment environment,
				IAuthenticator authenticator,
				HttpSecurity http
		) throws Exception {
			SecurityChainConfigurer configurer = new SecurityChainConfigurer();
			configurer.setApplicationContext(applicationContext);
			configurer.setEnvironment(environment);
			return configurer.configureChain(authenticator, http);
		}

		@Bean
		@Primary
		IAuthenticator testAuthenticator() {
			return new IAuthenticator() {
				@Override
				public void registerServlet(ServletConfiguration servletConfiguration) {
					// noop
				}

				@Override
				public void build() {
					// noop
				}

				@Override
				public SecurityFilterChain configureHttpSecurity(HttpSecurity http) throws Exception {
					http.authorizeHttpRequests(authz -> authz.anyRequest().permitAll());
					return http.build();
				}
			};
		}
	}
}
