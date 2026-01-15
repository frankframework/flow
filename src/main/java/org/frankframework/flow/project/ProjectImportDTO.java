package org.frankframework.flow.project;

import java.util.List;

public record ProjectImportDTO(String projectName, List<ImportConfigurationDTO> configurations) {}
