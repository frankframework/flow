package org.frankframework.flow.filesystem;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.Comparator;
import java.util.stream.Stream;

public final class FileOperations {

	private FileOperations() {}

	public static Path createFile(Path filePath) throws IOException {
		Files.createDirectories(filePath.getParent());
		Files.createFile(filePath);
		return filePath;
	}

	public static void deleteRecursively(Path target) throws IOException {
		if (Files.isDirectory(target)) {
			try (Stream<Path> walk = Files.walk(target)) {
				walk.sorted(Comparator.reverseOrder()).forEach(p -> {
					try {
						Files.delete(p);
					} catch (IOException e) {
						throw new UncheckedIOException("Failed to delete: " + p, e);
					}
				});
			}
		} else {
			Files.delete(target);
		}
	}

	public static Path rename(Path source, Path target) throws IOException {
		return Files.move(source, target, StandardCopyOption.ATOMIC_MOVE);
	}
}
