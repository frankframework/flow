package org.frankframework.flow.filesystem;

import java.io.IOException;
import java.nio.file.Path;
import java.util.List;

public interface FileSystemStorage {
    boolean isLocalEnvironment();

    /**
     * Returns root folders of environment.
     */
    List<FilesystemEntry> listRoots();

    /**
     * Returns what directory entails
     */
    List<FilesystemEntry> listDirectory(String path) throws IOException;

    String readFile(String path) throws IOException;

    void writeFile(String path, String content) throws IOException;

    /**
     * Makes new folder in directory
     */
    Path createProjectDirectory(String path) throws IOException;

    Path toAbsolutePath(String path) throws IOException;

    /**
     * Strips the workspace root prefix from a path.
     * Local: returns the path unchanged.
     * Cloud: returns the path relative to the user's workspace root.
     */
    default String toRelativePath(String absolutePath) {
        return absolutePath;
    }
}
