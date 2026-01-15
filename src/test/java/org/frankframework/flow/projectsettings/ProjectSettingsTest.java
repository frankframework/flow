package org.frankframework.flow.projectsettings;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.EnumMap;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;

class ProjectSettingsTest {
    private ProjectSettings projectSettings;

    @BeforeEach
    void init() {
        projectSettings = new ProjectSettings();
    }

    @Test
    void testGetFiltersShouldReturnInternalMap() {
        Map<FilterType, Boolean> filters = projectSettings.getFilters();

        assertNotNull(filters, "getFilters() should never return null");
        assertEquals(
                FilterType.values().length,
                filters.size(),
                "getFilters() should contain an entry for every FilterType");
        for (FilterType type : FilterType.values()) {
            assertFalse(filters.get(type), "Default value should be false for: " + type);
        }
    }

    @Test
    void testSetFiltersShouldReplaceInternalMap() {
        // Verify all values start as fakse
        for (FilterType type : FilterType.values()) {
            assertFalse(
                    projectSettings.getFilters().get(type),
                    "Filter should be false in a new ProjectSettings object: " + type);
        }

        EnumMap<FilterType, Boolean> newFilters = new EnumMap<>(FilterType.class);

        // Initialize all filters to true
        for (FilterType type : FilterType.values()) {
            newFilters.put(type, true);
        }

        projectSettings.setFilters(newFilters);

        Map<FilterType, Boolean> returnedFilters = projectSettings.getFilters();
        assertSame(newFilters, returnedFilters, "setFilters() should replace the internal map");

        // Verify all values are now true
        for (FilterType type : FilterType.values()) {
            assertTrue(returnedFilters.get(type), "Filter should be true after setFilters: " + type);
        }
    }

    @ParameterizedTest
    @EnumSource(FilterType.class)
    void testConstructorShouldInitializeAllFiltersToFalse(FilterType type) {
        assertFalse(projectSettings.isEnabled(type), "Each filter should default to false: " + type);
    }

    @Test
    void testToggleShouldFlipValue() {
        assertFalse(projectSettings.isEnabled(FilterType.ADAPTER));

        projectSettings.toggleEnabled(FilterType.ADAPTER);
        assertTrue(projectSettings.isEnabled(FilterType.ADAPTER));

        projectSettings.toggleEnabled(FilterType.ADAPTER);
        assertFalse(projectSettings.isEnabled(FilterType.ADAPTER));
    }

    @Test
    void testSetEnableShouldUpdateIndividualFilter() {
        projectSettings.setEnabled(FilterType.ADAPTER, true);
        assertTrue(projectSettings.isEnabled(FilterType.ADAPTER));

        projectSettings.setEnabled(FilterType.ADAPTER, false);
        assertFalse(projectSettings.isEnabled(FilterType.ADAPTER));
    }
}
