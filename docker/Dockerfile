FROM eclipse-temurin:21-jre-jammy AS runner
ARG GID=2000
ARG UID=2000
WORKDIR /app

RUN addgroup --gid ${GID} spring && \
	adduser --uid ${UID} --gid ${GID} --shell /usr/sbin/nologin spring

USER spring

COPY --chown=spring ./docker/scripts/ /scripts/
COPY --chown=spring ./target/flow*.jar /app/flow.jar

EXPOSE 8080

CMD ["java","-jar","/app/flow.jar"]
