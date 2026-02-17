# Flow

Easily create configurations for the Frank!Framework with the Flow Studio and Editor! 

Please use profile on locally:
-Dspring.profiles.active=local
or with docker
-Dspring.profiles.active=cloud

## Build from source

Building the project requires Java, Maven, NodeJS, PNPM and Docker installed on your system.

To build the project from source, run this command:

```bash
mvn clean install
```

## Development

To run the application in development mode, you can use the following commands:

1. Start the backend server:
   ```bash
   mvn spring-boot:run
   ```
2. Start the frontend server:
   ```bash
   cd src/main/frontend
   pnpm install
   pnpm start
   ```
