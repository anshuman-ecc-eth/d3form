# Shape-Specific Resize Detection Fix

## Issues Fixed

### 1. **Erratic Extension Behavior for Triangle/Diamond** ✅
**Problem**: The user could not extend/resize Triangles and Diamonds reliably because the resize handles were defined on the invisible bounding box, not the visible shape edges. Hovering the visual edge (slanted line) showed no resize cursor and allowed no interaction.
**Fix**: Completely rewrote `getResizeHandle` for Triangle and Diamond shapes to use explicit edge distance checking.
- **Triangle**: Hovering the slanted sides now detects `Right` (East) or `Left` (West) resize handles. Hovering vertices detects Corner handles.
- **Diamond**: Hovering the slanted sides now detects `Diagonal` (NE/SE/SW/NW) resize handles. Hovering vertices detects Cardinal (N/E/S/W) handles.

### 2. **Cursor Showing in Empty Space** ✅
**Problem**: The user complained that the resize cursor appeared "when the cursor is not on an object boundary" (i.e., in the empty corners of the bounding box).
**Fix**: Since `getResizeHandle` is now shape-aware, it only returns a handle if the cursor is near the *actual* visible edge of the Triangle or Diamond. Hovering the empty bounding box corners (far from the shape) now returns `null`, so the cursor remains Default.

## Implementation Details

### Triangle Logic
- **Top Vertex**: Maps to 'n' handle (Adjusts Height/Top).
- **Bottom Edges/Vertices**: Map to 's', 'se', 'sw' handles.
- **Slanted Edges**: Map to 'e' and 'w' handles (Adjusts Width).

### Diamond Logic
- **Vertices (Top, Right, Bottom, Left)**: Map to 'n', 'e', 's', 'w' handles.
- **Edges (Top-Right, Bot-Right, etc.)**: Map to 'ne', 'se', 'sw', 'nw' handles (Simulating corner drags).

## How to Test

**Refresh your browser** (F5) and try:

### Test Visual Accuracy
1. Draw a **Diamond**.
2. Hover the **Empty Corners** of its bounding box.
   - *Observation*: Cursor should be Default (Pointer). No Resize cursor.
3. Hover the **Slanted Edge**.
   - *Observation*: Cursor should change to Resize Arrow (e.g., `⤡` or `⤢`).

### Test Extension
1. Click and drag that **Slanted Edge**.
   - *Observation*: The diamond should extend/scale in that direction.
2. Select a **Triangle**.
3. Drag the **Right Slanted Edge**.
   - *Observation*: The triangle should get wider.

This provides a "what you see is what you get" interaction model, consistent with the user's request for behavior "like circles" (interacting with the shape boundary).
