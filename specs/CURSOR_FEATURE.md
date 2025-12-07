# Custom Tool Cursors Feature

## Overview
The cursor now changes to match the currently selected tool, providing better visual feedback.

## Tool Cursors

| Keyboard Shortcut | Tool | Cursor Icon |
|-------------------|------|-------------|
| **V** | Select | Triangular pointer (arrow) |
| **S** | Span Select | Dashed box with center dot |
| **R** | Rectangle | Rectangle outline |
| **C** | Circle | Circle outline |
| **L** | Line | Diagonal line |
| **A** | Arrow | Arrow with line |
| **T** | Text | Text cursor (T-shape) |

## How to Test

1. Open `index.html` in your web browser
2. Press different keyboard shortcuts (V, R, C, L, A, T, S) to switch tools
3. Move your cursor over the canvas area
4. Observe that the cursor icon changes to match the selected tool

## Implementation Details

### CSS (styles.css)
- Added custom cursor definitions using SVG data URIs for each tool
- Used `data-tool` attribute selector to apply the correct cursor
- Cursors are 24x24px SVG icons with white stroke and semi-transparent fills

### JavaScript (app.js)
- The `selectTool()` function sets the `data-tool` attribute on the SVG canvas
- The `updateCursorForResize()` function now respects custom cursors when not hovering over resize handles
- Inline cursor styles are removed to allow CSS cursors to take effect

## Browser Compatibility
Custom SVG cursors are supported in all modern browsers:
- Chrome/Edge: ✅
- Firefox: ✅
- Safari: ✅

## Notes
- The cursor hotspot (click point) is centered for most tools (12, 12)
- For the select tool, the hotspot is at (3, 3) to match the pointer tip
- Fallback cursors are provided for older browsers
