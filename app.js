// ===== Application State =====
const state = {
    mode: 'edit', // 'edit' or 'present'
    currentTool: 'select',
    currentFrame: 0,
    frames: [{ id: 0, name: 'Frame 1', elements: [] }],
    elements: [],
    selectedElement: null,
    isDrawing: false,
    isResizing: false,
    resizeHandle: null,
    startPoint: null,
    tempElement: null,
    properties: {
        fill: '#6366f1',
        stroke: '#1e293b',
        strokeWidth: 2,
        opacity: 1,
        fontFamily: 'Inter',
        fontSize: 16,
        linkStyle: 'solid',
        arrowStyle: 'end'
    },
    dragState: {
        isDragging: false,
        element: null,
        startX: 0,
        startY: 0,
        offsetX: 0,
        offsetY: 0
    },
    history: [],
    historyIndex: -1,
    clipboard: null
};

// ===== D3 Setup =====
const svg = d3.select('#canvas');
const canvasWrapper = d3.select('#canvasWrapper');
let width = window.innerWidth - 280;
let height = window.innerHeight - 80;

svg.attr('width', width).attr('height', height);

// Create main group for elements
const mainGroup = svg.append('g').attr('class', 'main-group');

// ===== Utility Functions =====
function generateId() {
    return `el-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function getMousePosition(event) {
    const rect = svg.node().getBoundingClientRect();
    return {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top
    };
}

function getCurrentFrameElements() {
    return state.frames[state.currentFrame].elements;
}

function saveElementToFrame(element) {
    const frameElements = getCurrentFrameElements();
    const existingIndex = frameElements.findIndex(el => el.id === element.id);

    if (existingIndex >= 0) {
        frameElements[existingIndex] = element;
    } else {
        frameElements.push(element);
    }
}

// ===== Drawing Functions =====
function createRectangle(x1, y1, x2, y2) {
    const x = Math.min(x1, x2);
    const y = Math.min(y1, y2);
    const width = Math.abs(x2 - x1);
    const height = Math.abs(y2 - y1);

    return {
        id: generateId(),
        type: 'rectangle',
        x, y, width, height,
        ...state.properties
    };
}

function createCircle(x1, y1, x2, y2) {
    const cx = (x1 + x2) / 2;
    const cy = (y1 + y2) / 2;
    const rx = Math.abs(x2 - x1) / 2;
    const ry = Math.abs(y2 - y1) / 2;

    return {
        id: generateId(),
        type: 'circle',
        cx, cy, rx, ry,
        ...state.properties
    };
}

function createLine(x1, y1, x2, y2) {
    return {
        id: generateId(),
        type: 'line',
        x1, y1, x2, y2,
        ...state.properties
    };
}

function createArrow(x1, y1, x2, y2) {
    return {
        id: generateId(),
        type: 'arrow',
        x1, y1, x2, y2,
        ...state.properties
    };
}

function createText(x, y, text = 'Double-click to edit') {
    return {
        id: generateId(),
        type: 'text',
        x, y,
        text,
        ...state.properties
    };
}

// ===== Rendering Functions =====
function renderElement(element, selection) {
    const group = selection || mainGroup;

    switch (element.type) {
        case 'rectangle':
            return group.append('rect')
                .attr('id', element.id)
                .attr('x', element.x)
                .attr('y', element.y)
                .attr('width', element.width)
                .attr('height', element.height)
                .attr('fill', element.fill)
                .attr('stroke', element.stroke)
                .attr('stroke-width', element.strokeWidth)
                .attr('opacity', element.opacity)
                .attr('rx', 8)
                .style('cursor', 'move');

        case 'circle':
            return group.append('ellipse')
                .attr('id', element.id)
                .attr('cx', element.cx)
                .attr('cy', element.cy)
                .attr('rx', element.rx)
                .attr('ry', element.ry)
                .attr('fill', element.fill)
                .attr('stroke', element.stroke)
                .attr('stroke-width', element.strokeWidth)
                .attr('opacity', element.opacity)
                .style('cursor', 'move');

        case 'line':
            return group.append('line')
                .attr('id', element.id)
                .attr('x1', element.x1)
                .attr('y1', element.y1)
                .attr('x2', element.x2)
                .attr('y2', element.y2)
                .attr('stroke', element.stroke)
                .attr('stroke-width', element.strokeWidth)
                .attr('opacity', element.opacity)
                .attr('stroke-linecap', 'round')
                .style('cursor', 'move');

        case 'arrow':
            const arrowGroup = group.append('g')
                .attr('id', element.id)
                .style('cursor', 'move');

            arrowGroup.append('line')
                .attr('x1', element.x1)
                .attr('y1', element.y1)
                .attr('x2', element.x2)
                .attr('y2', element.y2)
                .attr('stroke', element.stroke)
                .attr('stroke-width', element.strokeWidth)
                .attr('opacity', element.opacity)
                .attr('stroke-linecap', 'round');

            // Arrow head
            const angle = Math.atan2(element.y2 - element.y1, element.x2 - element.x1);
            const arrowSize = 12;

            arrowGroup.append('polygon')
                .attr('points', `0,0 -${arrowSize},-${arrowSize / 2} -${arrowSize},${arrowSize / 2}`)
                .attr('fill', element.stroke)
                .attr('opacity', element.opacity)
                .attr('transform', `translate(${element.x2},${element.y2}) rotate(${angle * 180 / Math.PI})`);

            return arrowGroup;

        case 'text':
            return group.append('text')
                .attr('id', element.id)
                .attr('x', element.x)
                .attr('y', element.y)
                .attr('fill', element.fill)
                .attr('opacity', element.opacity)
                .attr('font-size', element.fontSize)
                .attr('font-family', element.fontFamily || 'Inter, sans-serif')
                .attr('font-weight', '500')
                .style('cursor', 'move')
                .text(element.text);
    }
}

function renderAllElements() {
    mainGroup.selectAll('*').remove();
    const elements = getCurrentFrameElements();
    elements.forEach(element => {
        const rendered = renderElement(element);
        if (rendered) {
            setupElementInteractions(rendered, element);
        }
    });
}

// ===== Element Interactions =====
function setupElementInteractions(selection, element) {
    if (state.mode !== 'edit') return;

    selection
        .on('mousedown', function (event) {
            if (state.currentTool === 'select') {
                event.stopPropagation();
                selectElement(element);
                startDrag(event, element);
            }
        })
        .on('dblclick', function (event) {
            if (element.type === 'text') {
                event.stopPropagation();
                editText(element);
            }
        })
        .on('contextmenu', function (event) {
            if (state.mode === 'edit') {
                event.preventDefault();
                event.stopPropagation();
                selectElement(element);
                showContextMenu(event, element);
            }
        });
}

function selectElement(element) {
    state.selectedElement = element;
    updateSelection();
    syncPropertiesFromElement(element);
}

function updateSelection() {
    mainGroup.selectAll('*').classed('element-selected', false);

    if (state.selectedElement) {
        mainGroup.select(`#${state.selectedElement.id}`)
            .classed('element-selected', true);
    }
}

function syncPropertiesFromElement(element) {
    if (!element) return;

    // Update property controls to match selected element
    // For lines and arrows, use stroke as the primary color
    if (element.type === 'line' || element.type === 'arrow') {
        state.properties.fill = element.stroke || '#1e293b';
        state.properties.stroke = element.stroke || '#1e293b';
    } else {
        state.properties.fill = element.fill || '#6366f1';
        state.properties.stroke = element.stroke || '#1e293b';
    }

    state.properties.strokeWidth = element.strokeWidth || 2;
    state.properties.opacity = element.opacity || 1;

    if (element.type === 'text') {
        state.properties.fontFamily = element.fontFamily || 'Inter';
        state.properties.fontSize = element.fontSize || 16;
    }

    // Update UI controls
    d3.select('#fillColor').property('value', state.properties.fill);
    d3.select('#strokeColor').property('value', state.properties.stroke);
    d3.select('#strokeWidth').property('value', state.properties.strokeWidth);
    d3.select('#opacity').property('value', Math.round(state.properties.opacity * 100));
    d3.select('#fontFamily').property('value', state.properties.fontFamily);
    d3.select('#fontSize').property('value', state.properties.fontSize);

    d3.select('#strokeWidth').node().nextElementSibling.textContent = state.properties.strokeWidth;
    d3.select('#opacity').node().nextElementSibling.textContent = Math.round(state.properties.opacity * 100) + '%';
    d3.select('#fontSize').node().nextElementSibling.textContent = state.properties.fontSize + 'px';
}

function startDrag(event, element) {
    const pos = getMousePosition(event);
    state.dragState = {
        isDragging: true,
        element: element,
        startX: pos.x,
        startY: pos.y,
        offsetX: 0,
        offsetY: 0
    };
}

function editText(element) {
    const newText = prompt('Enter text:', element.text);
    if (newText !== null) {
        element.text = newText;
        saveElementToFrame(element);
        renderAllElements();
    }
}

// ===== Canvas Event Handlers =====
svg.on('mousedown', function (event) {
    if (state.mode !== 'edit') return;

    // Ctrl+Click to switch to select tool
    if (event.ctrlKey) {
        selectTool('select');
    }

    const pos = getMousePosition(event);

    if (state.currentTool === 'select') {
        // Check if clicking on a resize handle
        if (state.selectedElement) {
            const handle = getResizeHandle(state.selectedElement, pos);
            if (handle) {
                state.isResizing = true;
                state.resizeHandle = handle;
                state.startPoint = pos;
                return;
            }
        }

        state.selectedElement = null;
        updateSelection();
    } else if (state.currentTool === 'text') {
        const element = createText(pos.x, pos.y);
        saveElementToFrame(element);
        renderAllElements();
        state.currentTool = 'select';
        updateToolSelection();
        saveHistory();
    } else {
        state.isDrawing = true;
        state.startPoint = pos;
    }
});

svg.on('mousemove', function (event) {
    if (state.mode !== 'edit') return;

    const pos = getMousePosition(event);

    // Handle dragging
    if (state.dragState.isDragging && state.currentTool === 'select') {
        const dx = pos.x - state.dragState.startX;
        const dy = pos.y - state.dragState.startY;

        updateElementPosition(state.dragState.element, dx, dy);
        state.dragState.startX = pos.x;
        state.dragState.startY = pos.y;
        return;
    }

    // Handle resizing
    if (state.isResizing && state.selectedElement) {
        resizeElement(state.selectedElement, pos, state.resizeHandle);
        renderAllElements();
        return;
    }

    // Handle drawing
    if (state.isDrawing && state.startPoint) {
        if (state.tempElement) {
            mainGroup.select(`#${state.tempElement.id}`).remove();
        }

        let element;
        switch (state.currentTool) {
            case 'rectangle':
                element = createRectangle(state.startPoint.x, state.startPoint.y, pos.x, pos.y);
                break;
            case 'circle':
                element = createCircle(state.startPoint.x, state.startPoint.y, pos.x, pos.y);
                break;
            case 'line':
                element = createLine(state.startPoint.x, state.startPoint.y, pos.x, pos.y);
                break;
            case 'arrow':
                element = createArrow(state.startPoint.x, state.startPoint.y, pos.x, pos.y);
                break;
        }

        if (element) {
            state.tempElement = element;
            renderElement(element);
        }
    }

    // Update cursor for resize handles
    if (state.currentTool === 'select' && !state.dragState.isDragging && !state.isResizing) {
        updateCursorForResize(pos);
    }
});

svg.on('mouseup', function (event) {
    if (state.mode !== 'edit') return;

    // End dragging
    if (state.dragState.isDragging) {
        saveElementToFrame(state.dragState.element);
        state.dragState.isDragging = false;
        state.dragState.element = null;
        saveHistory();
    }

    // End resizing
    if (state.isResizing) {
        saveElementToFrame(state.selectedElement);
        state.isResizing = false;
        state.resizeHandle = null;
        saveHistory();
    }

    // End drawing
    if (state.isDrawing && state.tempElement) {
        saveElementToFrame(state.tempElement);
        renderAllElements();
        state.tempElement = null;
        saveHistory();
    }

    state.isDrawing = false;
    state.startPoint = null;
});

function updateElementPosition(element, dx, dy) {
    switch (element.type) {
        case 'rectangle':
            element.x += dx;
            element.y += dy;
            break;
        case 'circle':
            element.cx += dx;
            element.cy += dy;
            break;
        case 'line':
            element.x1 += dx;
            element.y1 += dy;
            element.x2 += dx;
            element.y2 += dy;
            break;
        case 'arrow':
            element.x1 += dx;
            element.y1 += dy;
            element.x2 += dx;
            element.y2 += dy;
            break;
        case 'text':
            element.x += dx;
            element.y += dy;
            break;
    }

    renderAllElements();
}

// ===== Resize Functions =====
function getResizeHandle(element, pos) {
    const threshold = 10; // pixels from edge to detect resize

    switch (element.type) {
        case 'rectangle':
            const right = element.x + element.width;
            const bottom = element.y + element.height;

            // Check corners first (priority)
            if (Math.abs(pos.x - right) < threshold && Math.abs(pos.y - bottom) < threshold) {
                return 'se'; // southeast
            }
            if (Math.abs(pos.x - element.x) < threshold && Math.abs(pos.y - bottom) < threshold) {
                return 'sw'; // southwest
            }
            if (Math.abs(pos.x - right) < threshold && Math.abs(pos.y - element.y) < threshold) {
                return 'ne'; // northeast
            }
            if (Math.abs(pos.x - element.x) < threshold && Math.abs(pos.y - element.y) < threshold) {
                return 'nw'; // northwest
            }

            // Check edges
            if (Math.abs(pos.x - right) < threshold && pos.y >= element.y && pos.y <= bottom) {
                return 'e'; // east
            }
            if (Math.abs(pos.x - element.x) < threshold && pos.y >= element.y && pos.y <= bottom) {
                return 'w'; // west
            }
            if (Math.abs(pos.y - bottom) < threshold && pos.x >= element.x && pos.x <= right) {
                return 's'; // south
            }
            if (Math.abs(pos.y - element.y) < threshold && pos.x >= element.x && pos.x <= right) {
                return 'n'; // north
            }
            break;

        case 'circle':
            // Check if near the edge of the ellipse
            const dx = pos.x - element.cx;
            const dy = pos.y - element.cy;
            const distance = Math.sqrt((dx * dx) / (element.rx * element.rx) + (dy * dy) / (element.ry * element.ry));

            if (Math.abs(distance - 1) < threshold / Math.min(element.rx, element.ry)) {
                // Determine which direction based on angle
                const angle = Math.atan2(dy, dx);
                return { type: 'radial', angle };
            }
            break;
    }

    return null;
}

function resizeElement(element, pos, handle) {
    switch (element.type) {
        case 'rectangle':
            const oldX = element.x;
            const oldY = element.y;
            const oldRight = element.x + element.width;
            const oldBottom = element.y + element.height;

            if (handle.includes('e')) {
                element.width = Math.max(10, pos.x - element.x);
            }
            if (handle.includes('w')) {
                const newX = Math.min(pos.x, oldRight - 10);
                element.width = oldRight - newX;
                element.x = newX;
            }
            if (handle.includes('s')) {
                element.height = Math.max(10, pos.y - element.y);
            }
            if (handle.includes('n')) {
                const newY = Math.min(pos.y, oldBottom - 10);
                element.height = oldBottom - newY;
                element.y = newY;
            }
            break;

        case 'circle':
            if (handle.type === 'radial') {
                const dx = pos.x - element.cx;
                const dy = pos.y - element.cy;
                const distance = Math.sqrt(dx * dx + dy * dy);

                // Resize proportionally or along the angle
                const cos = Math.cos(handle.angle);
                const sin = Math.sin(handle.angle);

                element.rx = Math.max(10, Math.abs(distance * cos));
                element.ry = Math.max(10, Math.abs(distance * sin));
            }
            break;
    }
}

function updateCursorForResize(pos) {
    if (!state.selectedElement) {
        svg.style('cursor', 'crosshair');
        return;
    }

    const handle = getResizeHandle(state.selectedElement, pos);

    if (handle) {
        if (typeof handle === 'string') {
            // Rectangle handles
            const cursorMap = {
                'nw': 'nw-resize',
                'n': 'n-resize',
                'ne': 'ne-resize',
                'e': 'e-resize',
                'se': 'se-resize',
                's': 's-resize',
                'sw': 'sw-resize',
                'w': 'w-resize'
            };
            svg.style('cursor', cursorMap[handle] || 'default');
        } else {
            // Circle handle
            svg.style('cursor', 'nwse-resize');
        }
    } else {
        svg.style('cursor', 'default');
    }
}


// ===== Frame Management =====
function addFrame() {
    const newFrameId = state.frames.length;
    const newFrame = {
        id: newFrameId,
        name: `Frame ${newFrameId + 1}`,
        elements: []
    };

    state.frames.push(newFrame);
    renderFramesList();
}

function duplicateFrame() {
    const currentFrame = state.frames[state.currentFrame];
    const newFrameId = state.frames.length;

    // Deep copy the current frame's elements
    const duplicatedElements = currentFrame.elements.map(el => ({
        ...el,
        // Keep the same ID so transitions work smoothly
    }));

    const newFrame = {
        id: newFrameId,
        name: `Frame ${newFrameId + 1}`,
        elements: duplicatedElements
    };

    state.frames.push(newFrame);
    state.currentFrame = newFrameId;
    renderAllElements();
    renderFramesList();
    updateFrameIndicator();
}

function switchFrame(frameIndex) {
    if (frameIndex >= 0 && frameIndex < state.frames.length) {
        state.currentFrame = frameIndex;
        renderAllElements();
        renderFramesList();
        updateFrameIndicator();
    }
}

function deleteFrame(frameIndex) {
    if (state.frames.length > 1) {
        state.frames.splice(frameIndex, 1);
        if (state.currentFrame >= state.frames.length) {
            state.currentFrame = state.frames.length - 1;
        }
        renderAllElements();
        renderFramesList();
        updateFrameIndicator();
    }
}

function renderFramesList() {
    const framesList = d3.select('#framesList');
    framesList.selectAll('*').remove();

    state.frames.forEach((frame, index) => {
        const frameItem = framesList.append('div')
            .attr('class', `frame-item ${index === state.currentFrame ? 'active' : ''}`)
            .on('click', () => switchFrame(index));

        frameItem.append('span')
            .attr('class', 'frame-name')
            .text(frame.name);

        const actions = frameItem.append('div')
            .attr('class', 'frame-actions');

        if (state.frames.length > 1) {
            actions.append('button')
                .attr('class', 'frame-action-btn')
                .attr('title', 'Delete frame')
                .html(`<svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                </svg>`)
                .on('click', (event) => {
                    event.stopPropagation();
                    deleteFrame(index);
                });
        }
    });
}

// ===== Presentation Mode =====
function enterPresentMode() {
    state.mode = 'present';
    // Always start from the first frame
    state.currentFrame = 0;
    renderAllElements();
    d3.select('#toolbar').classed('hidden', true);
    d3.select('#presentControls').classed('hidden', false);
    svg.classed('select-mode', true);
    updateFrameIndicator();
}

function exitPresentMode() {
    state.mode = 'edit';
    d3.select('#toolbar').classed('hidden', false);
    d3.select('#presentControls').classed('hidden', true);
    svg.classed('select-mode', false);
}

function nextFrame() {
    if (state.currentFrame < state.frames.length - 1) {
        animateFrameTransition(state.currentFrame, state.currentFrame + 1);
        state.currentFrame++;
        updateFrameIndicator();
    }
}

function prevFrame() {
    if (state.currentFrame > 0) {
        animateFrameTransition(state.currentFrame, state.currentFrame - 1);
        state.currentFrame--;
        updateFrameIndicator();
    }
}

function updateFrameIndicator() {
    d3.select('#currentFrameNum').text(state.currentFrame + 1);
    d3.select('#totalFramesNum').text(state.frames.length);

    d3.select('#prevFrameBtn').property('disabled', state.currentFrame === 0);
    d3.select('#nextFrameBtn').property('disabled', state.currentFrame === state.frames.length - 1);
}

// ===== Smooth Frame Transitions =====
// This system ensures ALL objects smoothly transform between frames
// Objects that don't exist in both frames are animated to/from a scaled-down or offset state
function animateFrameTransition(fromIndex, toIndex) {
    const fromElements = state.frames[fromIndex].elements;
    const toElements = state.frames[toIndex].elements;

    // Create maps for quick lookup
    const fromMap = new Map(fromElements.map(el => [el.id, el]));
    const toMap = new Map(toElements.map(el => [el.id, el]));

    const duration = 800;
    const ease = d3.easeCubicInOut;

    // Handle elements that exist in the target frame
    toElements.forEach(toEl => {
        const fromEl = fromMap.get(toEl.id);
        let selection = mainGroup.select(`#${toEl.id}`);

        if (fromEl && selection.node()) {
            // Element exists in both frames - smooth transform
            animateElement(selection, fromEl, toEl, duration, ease);
        } else {
            // New element - create it with transformed state and animate in
            const startState = createStartStateForNewElement(toEl);

            // Render the element at its start state
            selection = renderElement(startState);
            setupElementInteractions(selection, toEl);

            // Animate to final state
            setTimeout(() => {
                animateElement(selection, startState, toEl, duration, ease);
            }, 10);
        }
    });

    // Handle elements that only exist in the source frame
    fromElements.forEach(fromEl => {
        if (!toMap.has(fromEl.id)) {
            const selection = mainGroup.select(`#${fromEl.id}`);
            const endState = createEndStateForDepartingElement(fromEl);

            // Animate to end state then remove
            animateElement(selection, fromEl, endState, duration, ease);
            setTimeout(() => {
                selection.remove();
            }, duration + 50);
        }
    });

    // Update frame after animation completes
    setTimeout(() => {
        renderAllElements();
    }, duration + 100);
}

// Create a start state for elements appearing (scaled down from center)
function createStartStateForNewElement(element) {
    const startState = { ...element };

    switch (element.type) {
        case 'rectangle':
            const centerX = element.x + element.width / 2;
            const centerY = element.y + element.height / 2;
            startState.x = centerX;
            startState.y = centerY;
            startState.width = 0;
            startState.height = 0;
            startState.opacity = 0;
            break;

        case 'circle':
            startState.rx = 0;
            startState.ry = 0;
            startState.opacity = 0;
            break;

        case 'line':
        case 'arrow':
            const midX = (element.x1 + element.x2) / 2;
            const midY = (element.y1 + element.y2) / 2;
            startState.x1 = midX;
            startState.y1 = midY;
            startState.x2 = midX;
            startState.y2 = midY;
            startState.opacity = 0;
            break;

        case 'text':
            startState.opacity = 0;
            // Start slightly above final position
            startState.y = element.y - 20;
            break;
    }

    return startState;
}

// Create an end state for elements disappearing (scaled down to center)
function createEndStateForDepartingElement(element) {
    const endState = { ...element };

    switch (element.type) {
        case 'rectangle':
            const centerX = element.x + element.width / 2;
            const centerY = element.y + element.height / 2;
            endState.x = centerX;
            endState.y = centerY;
            endState.width = 0;
            endState.height = 0;
            endState.opacity = 0;
            break;

        case 'circle':
            endState.rx = 0;
            endState.ry = 0;
            endState.opacity = 0;
            break;

        case 'line':
        case 'arrow':
            const midX = (element.x1 + element.x2) / 2;
            const midY = (element.y1 + element.y2) / 2;
            endState.x1 = midX;
            endState.y1 = midY;
            endState.x2 = midX;
            endState.y2 = midY;
            endState.opacity = 0;
            break;

        case 'text':
            endState.opacity = 0;
            // End slightly below current position
            endState.y = element.y + 20;
            break;
    }

    return endState;
}

function animateElement(selection, fromEl, toEl, duration, ease) {
    switch (toEl.type) {
        case 'rectangle':
            selection.transition()
                .duration(duration)
                .ease(ease)
                .attr('x', toEl.x)
                .attr('y', toEl.y)
                .attr('width', toEl.width)
                .attr('height', toEl.height)
                .attr('fill', toEl.fill)
                .attr('stroke', toEl.stroke)
                .attr('stroke-width', toEl.strokeWidth)
                .attr('opacity', toEl.opacity);
            break;

        case 'circle':
            selection.transition()
                .duration(duration)
                .ease(ease)
                .attr('cx', toEl.cx)
                .attr('cy', toEl.cy)
                .attr('rx', toEl.rx)
                .attr('ry', toEl.ry)
                .attr('fill', toEl.fill)
                .attr('stroke', toEl.stroke)
                .attr('stroke-width', toEl.strokeWidth)
                .attr('opacity', toEl.opacity);
            break;

        case 'line':
            selection.transition()
                .duration(duration)
                .ease(ease)
                .attr('x1', toEl.x1)
                .attr('y1', toEl.y1)
                .attr('x2', toEl.x2)
                .attr('y2', toEl.y2)
                .attr('stroke', toEl.stroke)
                .attr('stroke-width', toEl.strokeWidth)
                .attr('opacity', toEl.opacity);
            break;

        case 'arrow':
            selection.select('line')
                .transition()
                .duration(duration)
                .ease(ease)
                .attr('x1', toEl.x1)
                .attr('y1', toEl.y1)
                .attr('x2', toEl.x2)
                .attr('y2', toEl.y2)
                .attr('stroke', toEl.stroke)
                .attr('stroke-width', toEl.strokeWidth)
                .attr('opacity', toEl.opacity);

            const angle = Math.atan2(toEl.y2 - toEl.y1, toEl.x2 - toEl.x1);
            const arrowSize = 12;

            selection.select('polygon')
                .transition()
                .duration(duration)
                .ease(ease)
                .attr('transform', `translate(${toEl.x2},${toEl.y2}) rotate(${angle * 180 / Math.PI})`)
                .attr('fill', toEl.stroke)
                .attr('opacity', toEl.opacity);
            break;

        case 'text':
            selection.transition()
                .duration(duration)
                .ease(ease)
                .attr('x', toEl.x)
                .attr('y', toEl.y)
                .attr('fill', toEl.fill)
                .attr('font-size', toEl.fontSize)
                .attr('opacity', toEl.opacity);

            // Update text content
            if (fromEl.text !== toEl.text) {
                selection.text(toEl.text);
            }
            break;
    }
}

// ===== Tool Selection =====
function selectTool(tool) {
    state.currentTool = tool;
    updateToolSelection();

    if (tool === 'select') {
        svg.classed('select-mode', true);
    } else {
        svg.classed('select-mode', false);
    }
}

function updateToolSelection() {
    d3.selectAll('.tool-btn').classed('active', false);
    d3.select(`.tool-btn[data-tool="${state.currentTool}"]`).classed('active', true);
}

// ===== Property Updates =====
function updateProperties() {
    state.properties.fill = d3.select('#fillColor').property('value');
    state.properties.stroke = d3.select('#strokeColor').property('value');
    state.properties.strokeWidth = +d3.select('#strokeWidth').property('value');
    state.properties.opacity = +d3.select('#opacity').property('value') / 100;
    state.properties.fontFamily = d3.select('#fontFamily').property('value');
    state.properties.fontSize = +d3.select('#fontSize').property('value');

    d3.select('#strokeWidth').node().nextElementSibling.textContent = state.properties.strokeWidth;
    d3.select('#opacity').node().nextElementSibling.textContent = Math.round(state.properties.opacity * 100) + '%';
    d3.select('#fontSize').node().nextElementSibling.textContent = state.properties.fontSize + 'px';

    // Apply to selected element if one is selected
    if (state.selectedElement) {
        state.selectedElement.fill = state.properties.fill;
        state.selectedElement.stroke = state.properties.stroke;
        state.selectedElement.strokeWidth = state.properties.strokeWidth;
        state.selectedElement.opacity = state.properties.opacity;

        if (state.selectedElement.type === 'text') {
            state.selectedElement.fontFamily = state.properties.fontFamily;
            state.selectedElement.fontSize = state.properties.fontSize;
        }

        saveElementToFrame(state.selectedElement);
        renderAllElements();
        saveHistory();
    }
}

// ===== Event Listeners =====
d3.selectAll('.tool-btn').on('click', function () {
    const tool = d3.select(this).attr('data-tool');
    selectTool(tool);
});

d3.select('#editModeBtn').on('click', function () {
    exitPresentMode();
    d3.selectAll('.mode-btn').classed('active', false);
    d3.select(this).classed('active', true);
});

d3.select('#presentModeBtn').on('click', function () {
    enterPresentMode();
    d3.selectAll('.mode-btn').classed('active', false);
    d3.select(this).classed('active', true);
});

d3.select('#addFrameBtn').on('click', addFrame);
d3.select('#duplicateFrameBtn').on('click', duplicateFrame);
d3.select('#nextFrameBtn').on('click', nextFrame);
d3.select('#prevFrameBtn').on('click', prevFrame);

d3.select('#fillColor').on('input', updateProperties);
d3.select('#strokeColor').on('input', updateProperties);
d3.select('#strokeWidth').on('input', updateProperties);
d3.select('#opacity').on('input', updateProperties);
d3.select('#fontFamily').on('change', updateProperties);
d3.select('#fontSize').on('input', updateProperties);

d3.select('#exportBtn').on('click', function () {
    const dataStr = JSON.stringify(state.frames, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'd3motion-export.json';
    link.click();
    URL.revokeObjectURL(url);
});

// Theme toggle
d3.select('#themeToggleBtn').on('click', function () {
    const root = document.documentElement;
    const isLightMode = root.classList.contains('light-mode');

    if (isLightMode) {
        root.classList.remove('light-mode');
        localStorage.setItem('theme', 'dark');
    } else {
        root.classList.add('light-mode');
        localStorage.setItem('theme', 'light');
    }
});

// Load saved theme on startup
const savedTheme = localStorage.getItem('theme');
if (savedTheme === 'light') {
    document.documentElement.classList.add('light-mode');
}


// ===== History Management =====
function saveHistory() {
    // Remove any history after current index
    state.history = state.history.slice(0, state.historyIndex + 1);

    // Deep copy current state
    const snapshot = JSON.parse(JSON.stringify(state.frames));
    state.history.push(snapshot);
    state.historyIndex++;

    // Limit history to 50 steps
    if (state.history.length > 50) {
        state.history.shift();
        state.historyIndex--;
    }
}

function undo() {
    if (state.historyIndex > 0) {
        state.historyIndex--;
        state.frames = JSON.parse(JSON.stringify(state.history[state.historyIndex]));
        renderAllElements();
        renderFramesList();
    }
}

function redo() {
    if (state.historyIndex < state.history.length - 1) {
        state.historyIndex++;
        state.frames = JSON.parse(JSON.stringify(state.history[state.historyIndex]));
        renderAllElements();
        renderFramesList();
    }
}

// ===== Clipboard Operations =====
function cutElement() {
    if (state.selectedElement) {
        state.clipboard = JSON.parse(JSON.stringify(state.selectedElement));
        const elements = getCurrentFrameElements();
        const index = elements.findIndex(el => el.id === state.selectedElement.id);
        if (index >= 0) {
            elements.splice(index, 1);
            state.selectedElement = null;
            renderAllElements();
            saveHistory();
        }
    }
}

function copyElement() {
    if (state.selectedElement) {
        state.clipboard = JSON.parse(JSON.stringify(state.selectedElement));
    }
}

function pasteElement() {
    if (state.clipboard) {
        const newElement = JSON.parse(JSON.stringify(state.clipboard));
        newElement.id = generateId();

        // Offset the pasted element slightly
        switch (newElement.type) {
            case 'rectangle':
                newElement.x += 20;
                newElement.y += 20;
                break;
            case 'circle':
                newElement.cx += 20;
                newElement.cy += 20;
                break;
            case 'line':
            case 'arrow':
                newElement.x1 += 20;
                newElement.y1 += 20;
                newElement.x2 += 20;
                newElement.y2 += 20;
                break;
            case 'text':
                newElement.x += 20;
                newElement.y += 20;
                break;
        }

        saveElementToFrame(newElement);
        renderAllElements();
        selectElement(newElement);
        saveHistory();
    }
}

// Keyboard shortcuts
document.addEventListener('keydown', (event) => {
    // Handle Ctrl/Cmd shortcuts
    if (event.ctrlKey || event.metaKey) {
        switch (event.key.toLowerCase()) {
            case 'z':
                event.preventDefault();
                if (event.shiftKey) {
                    redo();
                } else {
                    undo();
                }
                break;
            case 'y':
                event.preventDefault();
                redo();
                break;
            case 'x':
                event.preventDefault();
                cutElement();
                break;
            case 'c':
                event.preventDefault();
                copyElement();
                break;
            case 'd':
                if (event.shiftKey) {
                    event.preventDefault();
                    duplicateFrame();
                }
                break;
            case 'v':
                event.preventDefault();
                pasteElement();
                break;
        }
        return;
    }

    if (state.mode === 'edit') {
        switch (event.key.toLowerCase()) {
            case 'v':
                selectTool('select');
                break;
            case 'r':
                selectTool('rectangle');
                break;
            case 'c':
                selectTool('circle');
                break;
            case 't':
                selectTool('text');
                break;
            case 'a':
                selectTool('arrow');
                break;
            case 'l':
                selectTool('line');
                break;
            case 'delete':
            case 'backspace':
                if (state.selectedElement) {
                    const elements = getCurrentFrameElements();
                    const index = elements.findIndex(el => el.id === state.selectedElement.id);
                    if (index >= 0) {
                        elements.splice(index, 1);
                        state.selectedElement = null;
                        renderAllElements();
                        saveHistory();
                    }
                }
                break;
        }
    } else if (state.mode === 'present') {
        switch (event.key) {
            case 'ArrowRight':
            case ' ':
                nextFrame();
                break;
            case 'ArrowLeft':
                prevFrame();
                break;
            case 'Escape':
                exitPresentMode();
                d3.selectAll('.mode-btn').classed('active', false);
                d3.select('#editModeBtn').classed('active', true);
                break;
        }
    }
});

// Window resize handler
window.addEventListener('resize', () => {
    width = window.innerWidth - 280;
    height = window.innerHeight - 80;
    svg.attr('width', width).attr('height', height);
});

// ===== Initialize =====
renderFramesList();
updateFrameIndicator();
updateProperties();

// Initialize history with the starting state
saveHistory();

console.log('🎨 D3Motion initialized! Use the toolbar to start creating.');
console.log('💡 Keyboard shortcuts: Ctrl+Z (Undo), Ctrl+Y (Redo), Ctrl+C (Copy), Ctrl+X (Cut), Ctrl+V (Paste)');

// ===== Context Menu =====
function showContextMenu(event, element) {
    const menu = d3.select('#contextMenu');

    // Position menu
    const x = event.pageX;
    const y = event.pageY;

    menu.style('left', ${ x }px)
        .style('top', ${ y }px)
        .classed('hidden', false);

    // Store element ID for actions
    menu.attr('data-element-id', element.id);
}

function hideContextMenu() {
    d3.select('#contextMenu').classed('hidden', true);
}

// Context Menu Actions
d3.select('#ctxChangeFill').on('click', () => {
    const id = d3.select('#contextMenu').attr('data-element-id');
    const element = getCurrentFrameElements().find(el => el.id === id);
    if (element) {
        element.fill = state.properties.fill;
        saveElementToFrame(element);
        renderAllElements();
        saveHistory();
    }
    hideContextMenu();
});

d3.select('#ctxChangeStroke').on('click', () => {
    const id = d3.select('#contextMenu').attr('data-element-id');
    const element = getCurrentFrameElements().find(el => el.id === id);
    if (element) {
        element.stroke = state.properties.stroke;
        saveElementToFrame(element);
        renderAllElements();
        saveHistory();
    }
    hideContextMenu();
});

d3.select('#ctxChangeWidth').on('click', () => {
    const id = d3.select('#contextMenu').attr('data-element-id');
    const element = getCurrentFrameElements().find(el => el.id === id);
    if (element) {
        element.strokeWidth = state.properties.strokeWidth;
        saveElementToFrame(element);
        renderAllElements();
        saveHistory();
    }
    hideContextMenu();
});

d3.select('#ctxChangeOpacity').on('click', () => {
    const id = d3.select('#contextMenu').attr('data-element-id');
    const element = getCurrentFrameElements().find(el => el.id === id);
    if (element) {
        element.opacity = state.properties.opacity;
        saveElementToFrame(element);
        renderAllElements();
        saveHistory();
    }
    hideContextMenu();
});

d3.select('#ctxDelete').on('click', () => {
    const id = d3.select('#contextMenu').attr('data-element-id');
    const elements = getCurrentFrameElements();
    const index = elements.findIndex(el => el.id === id);
    if (index >= 0) {
        elements.splice(index, 1);
        state.selectedElement = null;
        renderAllElements();
        saveHistory();
    }
    hideContextMenu();
});

// Hide menu on global click
d3.select('body').on('click.contextmenu', () => {
    hideContextMenu();
});
