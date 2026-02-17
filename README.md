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


## Using the Flow

To use the Flow application correctly, a small amount of local configuration is required.

## 1. Select or upload a project

Use the folder browser to select your existing project on your machine.  
Alternatively, you can clone a repository directly from GitHub to start working immediately.

## 2. Ensure correct project structure

Within the project you want to work on, all Frank!Framework configurations must be located in: `src/main/configurations`

Flow only scans this directory for configurations. If your adapter configurations are stored elsewhere, they will not be detected or loaded by the application.
Once these steps are completed, Flow will be able to locate your projects and display their adapters in the studio.