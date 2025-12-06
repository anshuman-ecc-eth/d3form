---
description: Implementation plan for d3form enhancements
---

# d3form Enhancement Implementation Plan

## Features to Implement

### 1. Light/Dark Mode Toggle
- Add theme toggle button in header
- Create CSS variables for light theme
- Add JavaScript to switch between themes
- Persist theme preference in localStorage

### 2. Ctrl+Click to Activate Select Tool
- Add keyboard event listener for Ctrl key
- Modify canvas click handler to check for Ctrl modifier
- Switch to select tool when Ctrl+Click detected

### 3. Right-Click Context Menu
- Create context menu HTML structure
- Position menu at mouse coordinates
- Add options for:
  - Change fill color
  - Change stroke color
  - Change stroke width
  - Change opacity
  - Delete element
- Close menu on outside click

### 4. Rich Text Options
- Add font family selector to properties panel
- Add font size control
- Add bold/italic options
- Update text rendering to use selected font properties

### 5. Intuitive Link Styling
- Add link style selector (solid, dashed, dotted)
- Add directionality options (none, start, end, both)
- Add curve option for links
- Update arrow/line rendering to support these styles

## Implementation Order
1. Light/Dark mode (CSS + minimal JS)
2. Ctrl+Click select tool (small JS change)
3. Right-click context menu (HTML + JS)
4. Rich text options (HTML + JS)
5. Link styling (HTML + JS + rendering updates)
