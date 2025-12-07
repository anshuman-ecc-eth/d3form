# Global Extension Tool Priority

## Issue Fixed
**Problem**: The user found it buggy/jarring that they had to switch back to the "Select Tool (V)" explicitly to resize objects. If they were holding the Circle tool, they couldn't just tweak an edge; they had to break flow, switch tools, tweak, and switch back.

**Fix**: Implemented **Global Resize Priority**.
- **Rule**: If the cursor is hovering the edge/boundary of *any* object, the "Extension Tool" (Resize) activates immediately, regardless of what tool (Circle, Rectangle, etc.) is currently active.
- **Action**: Clicking on the edge while in this state immediately starts resizing that object.
- **Visuals**: The cursor changes to the resize arrows whenever it crosses a boundary, giving clear feedback that "Interact Mode" is available.

## How it Works
1.  **Global Hit Test**: On every mouse move using `findHandleOnAnyElement`, we check if the cursor is near the edge of *any* element in the scene (z-index aware).
2.  **Cursor Override**: If an edge is found, we override the current tool's cursor (Crosshair) with the Resize cursor.
3.  **Interaction Override**: If you click while the Resize cursor is visible, we intercept the click, select that object (if not selected), and start the resize operation. The "Draw New Shape" action is canceled.

## How to Test

**Refresh your browser** (F5) and try:

### Test Seamless Switching
1. Select the **Rectangle Tool (R)**.
2. Draw a rectangle.
3. **Don't switch tools**. Keep holding the Rectangle tool (Crosshair cursor).
4. Hover the edge of the rectangle you just drew.
   - *Observation*: The cursor changes from Crosshair to Resize Arrow.
5. **Click and Drag** the edge.
   - *Observation*: You resize the rectangle instead of drawing a new one.
6. Move the mouse **away** from the rectangle.
   - *Observation*: The cursor changes back to Crosshair.
7. Click in empty space.
   - *Observation*: You start drawing a new rectangle.

This creates a fluid workflow where "Editing" and "Creating" coexist without modal switching.
