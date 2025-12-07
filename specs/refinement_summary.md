# Refined Element Interactions and Connectors

## Changes Implemented

### 1. Conflict Resolution (Glitch Fix)
- **Problem:** Heavy glitching occurred because interaction zones for "Resize Edge" and "Connector Handle" were spatially overlapping (e.g., the Middle-East edge was both a resize handle and a connector point).
- **Solution:** Permanently disabled **Center-Edge Resizing** (N, S, E, W) for standard shapes (Rectangle, Circle, Text).
- **Result:**
    - **Resize:** Now strictly happens from the **Corners** (NW, NE, SE, SW), indicated by white square handles.
    - **Connect:** Strictly happens from the **Edge Centers** (Top, Right, Bottom, Left), indicated by purple circle handles.
    - **No Overlap:** The zones are spatially distinct, eliminating cursor flickering and accidental interactions.

### 2. Element Interaction Logic
- **Visuals:** Updated `showResizeHandles` to ensure visual cues match the interaction zones (only showing corner handles).
- **Connectors:** Connector handles remain prioritizing `crosshair` cursor.
- **Resizing:** Corner resizing remains standard `nw-resize`, `se-resize`, etc.

### 3. Smart Link System
- **Snapping:** Links snap to shape boundaries.
- **Types:** New `link` type separate from `arrow`.

The user interface should now be perfectly stable with distinct, non-conflicting zones for resizing and connecting.
