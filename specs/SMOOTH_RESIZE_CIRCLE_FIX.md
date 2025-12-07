# Smooth Resize and Stable Circle Fix

## Issues Fixed

### 1. **Jarring / Jumpy Resizing Behavior** ✅
**Problem**: When initiating a resize, the element's dimensions would snap ("jump") to the mouse position immediately, ignoring the offset between the mouse and the actual edge.
**Fix**: Implemented **Delta-Based Resizing**.
- We now capture the `initialElement` state when resizing starts.
- We calculate the mouse movement `dx, dy` relative to the `startPoint`.
- We apply this delta to the *original* dimensions.
- **Result**: Dragging is buttery smooth; 1px of mouse movement equals exactly 1px of size change, with zero jumping.

### 2. **Extension Tool Misalignment on Circles** ✅
**Problem**: The extension tool (handles) for circles used a radial logic that felt disconnected from the standard bounding box behavior, causing misalignment.
**Fix**: Standardized Circles to use **Bounding Box Handles** (N, S, E, W, etc.).
- The resize cursor now appears exactly at the tangible rectangular bounds of the circle (`cx ± rx`).
- This matches the behavior of Rectangle, Triangle, and Diamond, providing a unified interaction model.

### 3. **Circles "Randomly" Turning into Ellipses** ✅
**Problem**: The previous radial resize logic relied on cosine/sine projections of the drag angle. If you dragged horizontally, the Y-axis would shrink to 0 (because sine of 0 is 0), effectively "flattening" the circle unpredictably.
**Fix**: Switched to explicit **Axis-Aligned Resizing**.
- Dragging the **East** handle ONLY changes Width (creating a horizontal ellipse).
- Dragging the **South** handle ONLY changes Height (creating a vertical ellipse).
- Dragging a **Corner** changes both.
- This gives you full control. If you want a Circle, you can visually approximate it, or we can add a Shift-key constraint feature later. It no longer "randomly" distorts.

## How to Test

**Refresh your browser** (F5) and try:

### Test Smoothness
1. Select any shape (Rectangle, Triangle, etc.).
2. Click near an edge (not exactly on it, but within the resize zone).
3. **Start dragging**: The edge should move *with* your mouse offset, without snapping to your cursor tip. It should feel stable.

### Test Circle Resizing
1. Draw a **Circle**.
2. Hover the **Right Edge**: You will see an `E-Resize` cursor (↔).
   - Drag it: Only the width changes. It becomes a horizontal ellipse.
3. Hover the **Bottom Edge**: You will see an `S-Resize` cursor (↕).
   - Drag it: Only the height changes.
4. Hover the **Corner**: You will see a `Corner-Resize` cursor.
   - Drag it: Both change.

The interaction is now predictable, standard, and glitch-free.
