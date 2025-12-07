# d3form Enhancement Features - Implementation Guide

## Summary
The user wants to add 5 major features to d3form. Given the complexity and the previous issues with partial implementations, I recommend implementing these features one at a time, testing each before moving to the next.

## Requested Features

### 1. Light/Dark Mode Toggle
**What's needed:**
- Add a theme toggle button (sun/moon icon) in the header next to Export
- Create CSS variables for light theme (inverted neutral colors)
- JavaScript to toggle `light-mode` class on `:root`
- Store preference in localStorage

**Files to modify:**
- `index.html`: Add theme toggle button
- `styles.css`: Add `:root.light-mode` CSS variables
- `app.js`: Add theme toggle function and localStorage

### 2. Ctrl+Click to Activate Select Tool
**What's needed:**
- Detect Ctrl key + click anywhere on canvas
- Automatically switch to select tool
- Visual feedback that select tool is active

**Files to modify:**
- `app.js`: Modify canvas mousedown handler to check `event.ctrlKey`

### 3. Right-Click Context Menu
**What's needed:**
- Context menu HTML (positioned absolutely)
- Show menu on right-click of any element
- Menu options: Change Fill, Change Stroke, Change Stroke Width, Change Opacity, Delete
- Close menu on outside click or action

**Files to modify:**
- `index.html`: Add context menu HTML
- `styles.css`: Style context menu
- `app.js`: Add context menu show/hide logic, property change handlers

### 4. Rich Text Options
**What's needed:**
- Font family dropdown (Inter, Arial, Georgia, Courier New, etc.)
- Font size slider/input
- Bold and italic toggles
- Update text element rendering to use these properties

**Files to modify:**
- `index.html`: Add font controls to Properties section
- `app.js`: Update text creation and rendering to use font properties

### 5. Intuitive Link Styling
**What's needed:**
- Link style dropdown: Solid, Dashed, Dotted
- Directionality: None, Start Arrow, End Arrow, Both Arrows
- Curve option (straight vs curved)
- Update arrow/line rendering

**Files to modify:**
- `index.html`: Add link style controls to Properties section
- `app.js`: Update arrow/line rendering with stroke-dasharray and markers

## Recommendation

I suggest we implement these features in order, one at a time:

1. **Start with Light/Dark Mode** - It's mostly CSS and won't break existing functionality
2. **Then Ctrl+Click** - Simple JavaScript addition
3. **Then Context Menu** - More complex but self-contained
4. **Then Rich Text** - Requires careful text rendering updates
5. **Finally Link Styling** - Most complex, requires SVG marker updates

Would you like me to proceed with implementing Feature #1 (Light/Dark Mode) first, or would you prefer a different approach?
