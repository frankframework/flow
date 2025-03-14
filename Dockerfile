FROM eclipse-temurin:17-jre-alpine

COPY webapp/target/flow-webapp-*.war /app/flow-webapp.war

EXPOSE 8080

CMD ["java", \
	"--add-modules", "java.se", \
	"--add-exports", "java.base/jdk.internal.ref=ALL-UNNAMED", \
	"--add-opens", "java.base/java.lang=ALL-UNNAMED", \
	"--add-opens", "java.base/sun.nio.ch=ALL-UNNAMED", \
	"--add-opens", "java.management/sun.management=ALL-UNNAMED", \
	"--add-opens", "jdk.management/com.sun.management.internal=ALL-UNNAMED", \
	"-jar", "/app/flow-webapp.war"]
