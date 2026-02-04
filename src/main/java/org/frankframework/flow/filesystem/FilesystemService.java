package org.frankframework.flow.filesystem;

import java.awt.EventQueue;
import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.stream.Stream;
import org.springframework.stereotype.Service;

import javax.swing.JFileChooser;
import javax.swing.UIManager;

@Service
public class FilesystemService {

	public Optional<String> selectDirectoryNative() {
		final String[] result = new String[1];
		try {
			System.setProperty("java.awt.headless", "false");

			EventQueue.invokeAndWait(() -> {
				try {
					UIManager.setLookAndFeel(UIManager.getSystemLookAndFeelClassName());
					JFileChooser chooser = new JFileChooser();
					chooser.setFileSelectionMode(JFileChooser.DIRECTORIES_ONLY);
					chooser.setDialogTitle("Selecteer Project Map");

					if (chooser.showOpenDialog(null) == JFileChooser.APPROVE_OPTION) {
						result[0] = chooser.getSelectedFile().getAbsolutePath();
					}
				} catch (Exception e) { e.printStackTrace(); }
			});
		} catch (Exception e) {
			Thread.currentThread().interrupt();
		}
		return Optional.ofNullable(result[0]);
	}

    public List<FilesystemEntry> listRoots() {
        List<FilesystemEntry> entries = new ArrayList<>();
        for (File root : File.listRoots()) {
            String absolutePath = root.getAbsolutePath();
            entries.add(new FilesystemEntry(absolutePath, absolutePath, "DIRECTORY"));
        }
        return entries;
    }

    public List<FilesystemEntry> listDirectories(String path) throws IOException {
        Path dir = Paths.get(path).toAbsolutePath().normalize();
        if (!Files.exists(dir) || !Files.isDirectory(dir)) {
            throw new IllegalArgumentException("Path does not exist or is not a directory: " + path);
        }

        List<FilesystemEntry> entries = new ArrayList<>();
        try (Stream<Path> stream = Files.list(dir)) {
            stream.filter(Files::isDirectory)
                    .sorted()
                    .forEach(p -> {
                        String name = p.getFileName().toString();
                        String absolutePath = p.toAbsolutePath().normalize().toString();
                        entries.add(new FilesystemEntry(name, absolutePath, "DIRECTORY"));
                    });
        }
        return entries;
    }
}
