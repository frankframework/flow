export const FlowConfig = {
  NODE_DEFAULT_WIDTH: 300,
  NODE_MAX_WIDTH: 450,
  NODE_MIN_HEIGHT: 80,
  NODE_ZOOMED_OUT_HEIGHT: 380,
  EXIT_DEFAULT_WIDTH: 150,
  EXIT_DEFAULT_HEIGHT: 100,
  STICKY_NOTE_DEFAULT_WIDTH: 200,
  STICKY_NOTE_DEFAULT_HEIGHT: 200,
  STICKY_NOTE_MAX_HEIGHT: 500,
  STICKY_NOTE_BALLOON_WIDTH: 160,
  STICKY_NOTE_BALLOON_HEIGHT: 58,
  COPY_PASTE_OFFSET: 40,
  MAX_HISTORY: 20, // Adjust this value as needed to limit the number of undo steps
  LAYOUT_HORIZONTAL_OFFSET: 300,
  LAYOUT_VERTICAL_OFFSET: 200,
  ZOOM_THRESHOLD: 0.6,
}

/**
 * Counter-scale factor for compact-mode labels so they stay readable when zoomed out.
 *
 * The React Flow viewport scales all node content by `zoom`, so a fixed font size shrinks on
 * screen as you zoom out. Multiplying a label's font size by this factor keeps its on-screen
 * size roughly constant. Only called in compact mode (zoom < {@link FlowConfig.ZOOM_THRESHOLD}),
 * so the result is always >= 1, and the canvas `minZoom` bounds how large it can get.
 */
export function getCompactLabelScale(zoom: number): number {
  return FlowConfig.ZOOM_THRESHOLD / zoom
}
