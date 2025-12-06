# d3form - Interactive Diagramming & Presentations

**Live App:** [https://anshuman-ecc-eth.github.io/d3form/](https://anshuman-ecc-eth.github.io/d3form/)

A beautiful, no-code diagramming platform built entirely with D3.js featuring smooth animated transitions between frames.

## Features

### 🎨 Drawing Tools
- **Select Tool (V)**: Click and drag to move elements
- **Rectangle (R)**: Draw rounded rectangles
- **Circle (C)**: Draw ellipses
- **Text (T)**: Add text labels (double-click to edit)
- **Arrow (A)**: Draw arrows with arrowheads
- **Line (L)**: Draw straight lines

### 🎬 Frame-Based Presentations with Smooth Transitions
- Create multiple frames like in Excalidraw
- **Duplicate frames** to maintain consistency between objects
- **Smooth animated transitions** between ALL elements across frames
- Elements with matching IDs smoothly transform (position, size, color, rotation)
- New elements scale in from their center point
- Departing elements scale down to their center and fade out
- **No simple fade outs or jumps** - everything transforms smoothly!

### ✨ Premium Features
- **Light & Dark Mode**: Toggle between themes for comfortable viewing
- **Context Menu**: Right-click on any object to quickly change properties or delete
- **Advanced Text Editing**: Choose from multiple fonts (Inter, Arial, Times New Roman, etc.)
- **Object Linking**: Create diagrams with arrows and lines that can be styled (solid, dashed, dotted)
- **Live Property Editing**: Change fill, stroke, opacity, and fonts instantly
- **Drag-to-resize**: Click and drag element edges/corners to resize
- **Undo/Redo**: Full history tracking with Ctrl+Z/Ctrl+Y (50 steps)
- **Clipboard operations**: Cut, copy, and paste elements with Ctrl+X/C/V
- **Drag and drop**: Intuitive element positioning
- **Export/Import**: Save your work as JSON

## How to Use

### Edit Mode

#### Creating Elements
1. **Select a tool** from the toolbar or use keyboard shortcuts
2. **Draw on canvas** by clicking and dragging
3. Elements are automatically added to the current frame

#### Editing Elements
1. **Select elements** using the Select tool (V)
2. **Move elements** by clicking and dragging them
3. **Resize elements** by clicking and dragging near their edges/corners
   - Rectangles: Drag corners or edges to resize
   - Circles: Drag near the edge to resize
4. **Edit properties** by selecting an element and adjusting:
   - Fill color
   - Stroke color
   - Stroke width
   - Opacity
   - Font Family & Size
   - Line Styles
5. **Edit text** by double-clicking text elements
6. **Context Menu**: Right-click any element for quick actions
7. **Delete elements** by selecting them and pressing Delete/Backspace

#### Working with Frames
1. **Create frames** using the "Add Frame" button
2. **Duplicate current frame** to create variations with the "Duplicate" button
3. **Switch frames** by clicking on them in the frames list
4. **Delete frames** using the X button (minimum 1 frame required)

### Present Mode
1. Click the **Present** button in the header
2. Use **arrow keys** or **navigation buttons** to switch frames
3. Watch elements **smoothly transform** between frames:
   - Existing elements morph their properties
   - New elements scale in from center
   - Departing elements scale down and fade
4. Press **Escape** to exit presentation mode

## Keyboard Shortcuts

### Edit Mode - Tools
- `V` - Select tool
- `R` - Rectangle tool
- `C` - Circle tool
- `T` - Text tool
- `A` - Arrow tool
- `L` - Line tool

### Edit Mode - Actions
- `Ctrl+Z` / `Cmd+Z` - Undo
- `Ctrl+Shift+Z` / `Ctrl+Y` - Redo
- `Ctrl+X` / `Cmd+X` - Cut selected element
- `Ctrl+C` / `Cmd+C` - Copy selected element
- `Ctrl+V` / `Cmd+V` - Paste element
- `Delete` / `Backspace` - Delete selected element

### Present Mode
- `→` or `Space` - Next frame
- `←` - Previous frame
- `Escape` - Exit presentation mode

## Technical Details

- **Built with**: Pure HTML, CSS, and JavaScript
- **D3.js v7**: For SVG rendering and smooth transitions
- **No build tools required**: Just open `index.html` in a browser
- **Responsive design**: Adapts to different screen sizes

## Advanced Animation System

The frame transition system uses D3's powerful transition API with intelligent state management:

### For Elements in Both Frames
- **Duration**: 800ms for smooth, natural motion
- **Easing**: Cubic in-out for professional feel
- **Multi-property**: Animates position, size, color, stroke width, and opacity simultaneously

### For New Elements (Appearing)
- Start from scaled-down state at their center point
- Smoothly expand and fade in to final position
- Creates an organic "growing" effect

### For Departing Elements (Disappearing)
- Smoothly collapse to their center point
- Scale down while fading out
- Creates a natural "shrinking" effect

### Element Matching
- Elements with the same ID across frames are matched automatically
- Use the **Duplicate Frame** button to maintain IDs for smooth transitions
- Modify duplicated elements to create transformation effects

## Export/Import

Click the export button to save your work as JSON. The file contains all frames and elements, which can be imported later.

## Browser Compatibility

Works best in modern browsers:
- Chrome/Edge (recommended)
- Firefox
- Safari

## Tips for Best Results

1. **Use Duplicate Frame** when you want to animate objects between frames
2. Keep the same element IDs across frames for smooth morphing
3. Create dramatic effects by changing size, position, and color simultaneously
4. Text elements can move and change color smoothly
5. Arrows and lines can rotate and extend fluidly

---

**Created with ❤️ using D3.js**
