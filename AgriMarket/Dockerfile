# Stage 1: Build the application
FROM maven:3.9-eclipse-temurin-21-alpine AS build
WORKDIR /app
COPY pom.xml .
COPY src ./src
RUN mvn clean package -DskipTests

# Stage 2: Run the application
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
COPY --from=build /app/target/Project-1.0-SNAPSHOT.jar app.jar
EXPOSE 8080
# Sử dụng biến PORT của Render cấp phát động (mặc định 8080 nếu không có)
CMD ["sh", "-c", "java -Dserver.port=${PORT:-8080} -jar app.jar"]
