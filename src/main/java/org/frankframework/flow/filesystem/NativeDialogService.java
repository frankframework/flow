package org.frankframework.flow.filesystem;

import jakarta.annotation.PostConstruct;
import java.awt.EventQueue;
import java.awt.HeadlessException;
import java.util.Optional;
import javax.swing.JFileChooser;
import javax.swing.JFrame;
import javax.swing.UIManager;
import lombok.extern.slf4j.Slf4j;
import org.frankframework.flow.exception.ApiException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

@Slf4j
@Service
public class NativeDialogService {

    @PostConstruct
    public void init() {
        try {
            UIManager.setLookAndFeel(UIManager.getSystemLookAndFeelClassName());
        } catch (Exception e) {
            log.warn("Could not set system look and feel, using default", e);
        }
    }

    public Optional<String> selectDirectory() throws ApiException {
        final String[] result = new String[1];
        try {
            EventQueue.invokeAndWait(() -> {
                JFrame frame = new JFrame();
                frame.setAlwaysOnTop(true);
                frame.setLocationRelativeTo(null);

                try {
                    JFileChooser chooser = new JFileChooser();
                    chooser.setFileSelectionMode(JFileChooser.DIRECTORIES_ONLY);
                    chooser.setDialogTitle("Select Frank!Flow Project Folder");

                    int returnVal = chooser.showOpenDialog(frame);
                    if (returnVal == JFileChooser.APPROVE_OPTION) {
                        result[0] = chooser.getSelectedFile().getAbsolutePath();
                    }
                } finally {
                    frame.dispose();
                }
            });
        } catch (HeadlessException e) {
            log.error("Cannot open native dialog in headless environment", e);
            throw new ApiException(
                    "Native file dialog is not available in headless mode", HttpStatus.SERVICE_UNAVAILABLE);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            log.warn("Native dialog selection was interrupted");
            return Optional.empty();
        } catch (Exception e) {
            log.error("Failed to open native directory dialog", e);
            throw new ApiException("Failed to open native directory dialog", HttpStatus.INTERNAL_SERVER_ERROR);
        }
        return Optional.ofNullable(result[0]);
    }
}
