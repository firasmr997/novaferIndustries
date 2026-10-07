# syntax=docker/dockerfile:1

# ---- Build ----
FROM eclipse-temurin:21-jdk AS build
WORKDIR /workspace
COPY .mvn/ .mvn/
COPY mvnw pom.xml ./
RUN chmod +x mvnw && ./mvnw -B -q dependency:go-offline
COPY src/ src/
RUN ./mvnw -B -q package -DskipTests && cp target/novafer-erp-api-*.jar app.jar

# ---- Run ----
FROM eclipse-temurin:21-jre
WORKDIR /app
RUN groupadd --system novafer && useradd --system --gid novafer --home /app novafer
COPY --from=build --chown=novafer:novafer /workspace/app.jar /app/app.jar
USER novafer
EXPOSE 8085
ENV JAVA_OPTS="-XX:MaxRAMPercentage=75 -XX:+ExitOnOutOfMemoryError"
ENTRYPOINT ["sh", "-c", "exec java $JAVA_OPTS -jar /app/app.jar"]
