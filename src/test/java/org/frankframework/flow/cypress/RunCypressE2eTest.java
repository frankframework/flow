package org.frankframework.flow.cypress;

import static org.awaitility.Awaitility.await;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import io.github.wimdeblauwe.testcontainers.cypress.CypressContainer;
import io.github.wimdeblauwe.testcontainers.cypress.CypressTestResults;
import io.github.wimdeblauwe.testcontainers.cypress.CypressTestSuite;
import jakarta.annotation.Nonnull;
import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.Duration;
import java.util.Map;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;
import java.util.stream.Stream;
import org.frankframework.flow.FlowApplication;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.DynamicContainer;
import org.junit.jupiter.api.DynamicTest;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.TestFactory;
import org.springframework.boot.SpringApplication;
import org.springframework.context.ConfigurableApplicationContext;
import org.testcontainers.junit.jupiter.Testcontainers;

/**
 * Runs e2e tests with Cypress in a Testcontainer.
 * Requires Docker, else the test will be skipped.
 * <p>
 * Exclude with '-DexcludedGroups=integration'
 *
 * @author Sergi Philipsen
 * @see "https://github.com/wimdeblauwe/testcontainers-cypress"
 */
@Testcontainers(disabledWithoutDocker = true)
@Tag("integration")
public class RunCypressE2eTest {
    private static final String SPRING_BASE_URL = "http://localhost:8080";
    private static final String TEST_CONTAINER_BASE_URL = "http://host.testcontainers.internal:8080";
    private static final Path MOCHAWESOME_REPORTS_DIR =
            Paths.get("target/test-classes/e2e/cypress/test-results/reports/mochawesome");

    private static CypressContainer container;
    private static ConfigurableApplicationContext run;

    @BeforeAll
    static void setUp() {
        startApplication();
        startTestContainer();
    }

    private static void startApplication() {
        SpringApplication springApplication = FlowApplication.configureApplication();

        springApplication.setDefaultProperties(Map.of("app.project.root", "/tmp/flow-projects"));
        run = springApplication.run();

        assertTrue(run.isRunning());
        await().pollInterval(5, TimeUnit.SECONDS)
                .atMost(Duration.ofMinutes(5))
                .until(RunCypressE2eTest::isApplicationHealthy);
    }

    private static boolean isApplicationHealthy() {
        try {
            String url = SPRING_BASE_URL + "/actuator/health";
            HttpRequest req = HttpRequest.newBuilder(URI.create(url)).GET().build();
            HttpResponse<String> resp = HttpClient.newHttpClient().send(req, HttpResponse.BodyHandlers.ofString());
            return resp.statusCode() == 200 && resp.body().contains("UP");
        } catch (Exception e) {
            return false;
        }
    }

    public static void startTestContainer() {
        org.testcontainers.Testcontainers.exposeHostPorts(8080);

        container = new CypressContainer("cypress/included:15.0.0");

        container.withBaseUrl(TEST_CONTAINER_BASE_URL);
        container.withMochawesomeReportsAt(MOCHAWESOME_REPORTS_DIR);
        container.withClasspathResourcePath("e2e");
        container.withWorkingDirectory("/e2e/cypress");
        container.withLogConsumer(new Log4j2LogConsumer("CypressContainer", "CYPRESS"));

        container.start();
        assertTrue(container.isRunning());
    }

    @AfterAll
    static void tearDown() {
        if (run == null) return;

        run.stop();
        container.stop();

        assertFalse(run.isRunning());
        assertFalse(container.isRunning());

        run.close();
    }

    @TestFactory
    @Nonnull
    Stream<DynamicContainer> runCypressTests() throws InterruptedException, IOException, TimeoutException {
        CypressTestResults testResults = container.getTestResults();

        if (testResults.getNumberOfFailingTests() > 0) {
            throw new AssertionError("Cypress tests failed! " + testResults.getNumberOfFailingTests()
                    + " test(s) failed.\n\n" + testResults);
        }

        return testResults.getSuites().stream().map(this::createContainerFromSuite);
    }

    private DynamicContainer createContainerFromSuite(CypressTestSuite suite) {
        Stream<DynamicTest> dynamicTests = suite.getTests().stream()
                .map(test -> DynamicTest.dynamicTest(test.getDescription(), () -> {
                    if (!test.isSuccess()) {
                        assertTrue(isApplicationHealthy(), "!! application not reachable !!");
                    }
                    assertTrue(test.isSuccess(), test::getErrorMessage);
                }));

        return DynamicContainer.dynamicContainer(suite.getTitle(), dynamicTests);
    }
}
