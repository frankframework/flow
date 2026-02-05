# Flow

Easily create configurations for the Frank!Framework with the Flow Studio and Editor! 

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


## Using the Flow

To use the Flow application correctly, a small amount of local configuration is required.

## 1. Configure the project root

In `src/main/resources`, create a file named `application-local.properties` and define the root directory where your Frank!Framework projects are stored:

```properties
app.project.root=/path/to/your/projects
```

This directory is used by Flow to discover and load available projects.
## 2. Ensure correct project structure

Within the project you want to work on, all Frank!Framework configurations must be located in: `src/main/configurations`

Flow only scans this directory for configurations. If your adapter configurations are stored elsewhere, they will not be detected or loaded by the application.
Once these steps are completed, Flow will be able to locate your projects and display their adapters in the studio.