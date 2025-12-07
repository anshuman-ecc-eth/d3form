# Bug Fixes: Select Tool & Context Menu

## 1. Select Tool Restored ✅
**Issue**: Using the "Select" tool (V) was failing to drag or select elements properly.
**Fix**: The interaction logic was refactored.
- **Behavior**: Clicking the **body** of an element now correctly selects it and starts a drag operation.
- **Resize Priority**: Clicking the **edge** still prioritizes resizing, as requested.

## 2. Context Menu Restored ✅
**Issue**: The right-click menu was missing or inaccessible.
**Fix**: Fixed a code conflict where the context menu event listener was being overwritten.
- **Behavior**: Right-clicking any element now reliably opens the menu (allowing you to use the new "Add Label" feature!).

## Verification
1. **Refresh** (F5).
2. Draw a shape.
3. Switch to **Select Tool (V)**.
4. Drag the shape around -> **It moves!**
5. Hover the edge -> **Resize cursor appears**.
6. Right-click the shape -> **Menu appears**.
