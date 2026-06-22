package org.frankframework.flow.configuration;

/**
 * Identifies a single adapter inside a configuration file so the frontend can open it in the studio.
 * Returned when creating an adapter or a configuration file; the studio loads the actual content lazily.
 *
 * @param adapterName     the name of the adapter to open, or {@code null} when the file contains no adapter
 * @param adapterPosition the zero-based index of the adapter in document order
 */
public record AdapterLocationDTO(String adapterName, int adapterPosition) {}
