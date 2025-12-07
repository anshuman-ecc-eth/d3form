# Arrow Linking & Group Labels Update

## 1. Arrow Auto-Snapping & Linking ✅
**Feature**: Arrows now intelligently connect to objects.
- **Drawing**: When drawing an arrow, hover near the center of any object. It will "snap" to the center.
- **Linking**: The connection is persisted.
- **Moving**: When you move an object, any plugged-in arrows automatically follow it!

## 2. Group Labels (Central Text) ✅
**Feature**: Right-click any object to add a persistent label.
- **Action**: Right Click -> Select **"Add Label"**.
- **Behavior**: Prompts for text, places it in the center of the object (white text by default), and **Groups** them together.
- **Result**: Moving the object moves the label with it.

## 3. Resize Precision ✅
**Fix**: Reduced the resize detection sensitivity (from 10px to 6px).
- The resize cursor should now only appear when you are strictly on the boundary, reducing accidental activations.

## How to Test
1. **Refresh** (F5).
2. Draw two rectangles.
3. Select **Arrow Tool**.
4. Draw from Rect A to Rect Rect B (notice the snap effect).
5. Select **Move Tool (V)** and move Rect A.
   - *Result*: The arrow follows!
6. Right Click Rect B and choose **Add Label**.
   - Enter "Hello".
   - *Result*: "Hello" appears in the center.
7. Move Rect B.
   - *Result*: The label moves with it.
