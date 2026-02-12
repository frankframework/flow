package org.frankframework.flow.filesystem;

import java.io.IOException;
import java.nio.file.Path;
import java.util.List;

public interface FileSystemStorage {
    boolean isLocalEnvironment();

    /**
     * Geeft de root-mappen terug.
     * Lokaal: C:\, D:\, /Users
     * Cloud: /opt/frankflow/workspace
     */
    List<FilesystemEntry> listRoots();

    /**
     * Geeft de inhoud van een map.
     */
    List<FilesystemEntry> listDirectory(String path) throws IOException;

    /**
     * Leest een bestand.
     * Het path kan een absoluut lokaal pad zijn OF een relatief pad in de cloud workspace.
     */
    String readFile(String path) throws IOException;

    /**
     * Schrijft een bestand.
     */
    void writeFile(String path, String content) throws IOException;

    /**
     * Maakt een map aan voor een nieuw project.
     */
    Path createProjectDirectory(String path) throws IOException;

    Path toAbsolutePath(String path);

    /**
     * Strips the workspace root prefix from a path.
     * Local: returns the path unchanged.
     * Cloud: returns the path relative to the user's workspace root.
     */
    default String toRelativePath(String absolutePath) {
        return absolutePath;
    }
}
