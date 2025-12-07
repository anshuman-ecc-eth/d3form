# Interaction and Boundary Hit-Test Fixes

## Issues Fixed

### 1. **"Can't Extend" / Resize vs Drag Conflict** ✅
**Problem**: When trying to resize a Triangle or Diamond by clicking its edge, the shape's fill/stroke was capturing the click event and triggering a "Drag" operation instead of a "Resize" operation.
**Fix**: Modified `setupElementInteractions` to explicitly check for resize handles at the beginning of the `mousedown` event. If a handle is clicked, it forces a Resize operation and stops the Drag logic.
**Technical Detail**: Used `d3.pointer(event, svg.node())` to ensure mouse coordinates are relative to the SVG canvas, as `getResizeHandle` expects SVG-relative coordinates.

### 2. **"Cursor Changes Inside" / Empty Corner Issue** ✅
**Problem**: The "Move" cursor (hand) was appearing in the empty corners of the Triangle and Diamond bounding boxes, because the hit detection was using a simple rectangle check. This created confusing feedback where the user appeared to be "inside" the object when visually "outside".
**Fix**: Updated `isPointOverElement` to use precise mathematical hit testing:
- **Triangle**: Uses barycentric coordinate system to check if point is strictly inside the 3 vertices.
- **Diamond**: Uses Manhattan distance formula (`|dx|/w + |dy|/h <= 1`) to check if point is inside the rhombus.
- **Result**: The "Move" cursor now ONLY appears when hovering the actual visible shape. Hovering the empty corners correctly shows the default tool cursor.

## How to Test

**Refresh your browser** (F5) and try:

### Test Extending (Resize Priority)
1. Draw a Triangle (Q) or Diamond (D).
2. Select it (V).
3. Move your mouse to any edge/boundary until the resize cursor appears (e.g., `↔`, `↕`).
4. **Click and Drag**: The shape should now **RESIZE/EXTEND**.
   - *Previous Behavior*: It would often just move the whole shape while keeping the resize cursor graphic.

### Test Cursor Boundaries
1. Select a Triangle.
2. Hover your mouse around the empty top-left or top-right corners of its bounding box (outside the triangle slope).
3. **Observation**: The cursor should remain as the **Default Pointer/Crosshair** (indicating "Outside").
4. Move your mouse strictly **Inside** the purple triangle fill.
5. **Observation**: The cursor changes to **Move (Hand)** (indicating "Inside").
6. Move to the **Edge**.
7. **Observation**: The cursor changes to **Resize Arrows**.

These changes align the Triangle and Diamond behavior with precise, expected vector drawing tool standards.
