// ===== Application State =====
const state = {
    mode: 'edit', // 'edit' or 'present'
    currentTool: 'select',
    currentFrame: 0,
    frames: [{ id: 0, name: 'Frame 1', elements: [] }],
    elements: [],
    selectedElement: null,
    selectedElements: [], // Multi-selection support
    isSelecting: false,   // Span selection state
    selectionBox: null,   // Span selection box
    isDrawing: false,
    isResizing: false,
    resizeHandle: null,
    startPoint: null,
    tempElement: null,
    properties: {
        fill: 'none',
        stroke: '#ffffff',
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
        elements: [], // Store multiple elements being dragged
        startX: 0,
        startY: 0,
        offsetX: 0,
        offsetY: 0
    },
    history: [],
    historyIndex: -1,
    clipboard: null,
    // Connector drawing state
    isDrawingConnector: false,
    connectorStart: null,
    connectorSourceElement: null,
    tempConnectorArrow: null,
    // Connector Mode (toggled with 'N' key)
    connectorMode: false
};

// ===== D3 Setup =====
const svg = d3.select('#canvas');
const canvasWrapper = d3.select('#canvasWrapper');
let width = window.innerWidth - 280;
let height = window.innerHeight - 80;

svg.attr('width', width).attr('height', height);

// Initialize cursor for default tool
svg.attr('data-tool', state.currentTool);

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

function createTriangle(x1, y1, x2, y2) {
    const x = Math.min(x1, x2);
    const y = Math.min(y1, y2);
    const width = Math.abs(x2 - x1);
    const height = Math.abs(y2 - y1);

    // Triangle points: top center, bottom right, bottom left
    const points = `${x + width / 2},${y} ${x + width},${y + height} ${x},${y + height}`;

    return {
        id: generateId(),
        type: 'triangle',
        x, y, width, height,
        points,
        ...state.properties
    };
}

function createDiamond(x1, y1, x2, y2) {
    const x = Math.min(x1, x2);
    const y = Math.min(y1, y2);
    const width = Math.abs(x2 - x1);
    const height = Math.abs(y2 - y1);

    // Diamond points: top, right, bottom, left
    const points = `${x + width / 2},${y} ${x + width},${y + height / 2} ${x + width / 2},${y + height} ${x},${y + height / 2}`;

    return {
        id: generateId(),
        type: 'diamond',
        x, y, width, height,
        points,
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

function createLink(x1, y1, x2, y2) {
    return {
        id: generateId(),
        type: 'link',
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

function createPath(d, x = 0, y = 0) {
    return {
        id: generateId(),
        type: 'path',
        d,
        x, y, // Position offset for the whole path
        ...state.properties
    };
}

// Helper to build transform string for an element
function getTransformString(element, cx, cy) {
    const transforms = [];
    const rotation = element.rotation || 0;
    const scale = element.scale || 1;
    const skewX = element.skewX || 0;
    const flipH = element.flipH ? -1 : 1;
    const flipV = element.flipV ? -1 : 1;

    if (rotation) transforms.push(`rotate(${rotation}, ${cx}, ${cy})`);
    if (scale !== 1 || flipH !== 1 || flipV !== 1) {
        transforms.push(`translate(${cx}, ${cy}) scale(${scale * flipH}, ${scale * flipV}) translate(${-cx}, ${-cy})`);
    }
    if (skewX) transforms.push(`skewX(${skewX})`);

    return transforms.length > 0 ? transforms.join(' ') : null;
}

// Helper to get blur filter
function getBlurFilter(element) {
    const blur = element.blur || 0;
    if (blur > 0) {
        return `url(#blur-${blur})`;
    }
    return null;
}

// Ensure blur filter definitions exist
function ensureBlurFilters() {
    let defs = svg.select('defs');
    if (defs.empty()) {
        defs = svg.append('defs');
    }
    // Create blur filters 1-20
    for (let i = 1; i <= 20; i++) {
        if (defs.select(`#blur-${i}`).empty()) {
            defs.append('filter')
                .attr('id', `blur-${i}`)
                .append('feGaussianBlur')
                .attr('stdDeviation', i);
        }
    }
}

// ===== Rendering Functions =====
function renderElement(element, selection) {
    const group = selection || mainGroup;

    switch (element.type) {
        case 'rectangle':
            const rectCx = element.x + element.width / 2;
            const rectCy = element.y + element.height / 2;
            const rectTransform = getTransformString(element, rectCx, rectCy);
            const rectBlur = getBlurFilter(element);
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
                .attr('transform', rectTransform)
                .attr('filter', rectBlur)
                .style('pointer-events', 'all');

        case 'circle':
            const circleTransform = getTransformString(element, element.cx, element.cy);
            const circleBlur = getBlurFilter(element);
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
                .attr('transform', circleTransform)
                .attr('filter', circleBlur)
                .style('pointer-events', 'all');

        case 'triangle':
            const triCx = element.x + element.width / 2;
            const triCy = element.y + element.height / 2;
            const triTransform = getTransformString(element, triCx, triCy);
            const triBlur = getBlurFilter(element);
            return group.append('polygon')
                .attr('id', element.id)
                .attr('points', element.points)
                .attr('fill', element.fill)
                .attr('stroke', element.stroke)
                .attr('stroke-width', element.strokeWidth)
                .attr('opacity', element.opacity)
                .attr('transform', triTransform)
                .attr('filter', triBlur)
                .style('pointer-events', 'all');

        case 'diamond':
            const diamCx = element.x + element.width / 2;
            const diamCy = element.y + element.height / 2;
            const diamTransform = getTransformString(element, diamCx, diamCy);
            const diamBlur = getBlurFilter(element);
            return group.append('polygon')
                .attr('id', element.id)
                .attr('points', element.points)
                .attr('fill', element.fill)
                .attr('stroke', element.stroke)
                .attr('stroke-width', element.strokeWidth)
                .attr('opacity', element.opacity)
                .attr('transform', diamTransform)
                .attr('filter', diamBlur)
                .style('pointer-events', 'all');

        case 'line':
            const lineGroup = group.append('g')
                .attr('id', element.id);

            // Invisible hit area for easier clicking
            lineGroup.append('line')
                .attr('x1', element.x1)
                .attr('y1', element.y1)
                .attr('x2', element.x2)
                .attr('y2', element.y2)
                .attr('stroke', 'transparent')
                .attr('stroke-width', 20)
                .style('pointer-events', 'all');

            // Visible line
            lineGroup.append('line')
                .attr('x1', element.x1)
                .attr('y1', element.y1)
                .attr('x2', element.x2)
                .attr('y2', element.y2)
                .attr('stroke', element.stroke)
                .attr('stroke-width', element.strokeWidth)
                .attr('opacity', element.opacity)
                .attr('stroke-linecap', 'round')
                .style('pointer-events', 'none');

            return lineGroup;

        case 'link':
            const linkGroup = group.append('g')
                .attr('id', element.id);

            // Invisible hit area
            linkGroup.append('line')
                .attr('x1', element.x1)
                .attr('y1', element.y1)
                .attr('x2', element.x2)
                .attr('y2', element.y2)
                .attr('stroke', 'transparent')
                .attr('stroke-width', 20)
                .style('cursor', 'pointer')
                .style('pointer-events', 'all');

            // Calculate stroke-dasharray based on linkStyle
            let dashArray = null;
            switch (element.linkStyle) {
                case 'dashed': dashArray = '10,5'; break;
                case 'dotted': dashArray = '3,3'; break;
                default: dashArray = null; // solid
            }

            // Visible link line
            linkGroup.append('line')
                .attr('x1', element.x1)
                .attr('y1', element.y1)
                .attr('x2', element.x2)
                .attr('y2', element.y2)
                .attr('stroke', element.stroke)
                .attr('stroke-width', element.strokeWidth)
                .attr('opacity', element.opacity)
                .attr('stroke-linecap', 'round')
                .attr('stroke-dasharray', dashArray)
                .style('pointer-events', 'none');

            return linkGroup;

        case 'arrow':
            const arrowGroup = group.append('g')
                .attr('id', element.id);

            // Invisible hit area for easier clicking
            arrowGroup.append('line')
                .attr('x1', element.x1)
                .attr('y1', element.y1)
                .attr('x2', element.x2)
                .attr('y2', element.y2)
                .attr('stroke', 'transparent')
                .attr('stroke-width', 20)
                .style('pointer-events', 'all');

            // Visible arrow line
            arrowGroup.append('line')
                .attr('x1', element.x1)
                .attr('y1', element.y1)
                .attr('x2', element.x2)
                .attr('y2', element.y2)
                .attr('stroke', element.stroke)
                .attr('stroke-width', element.strokeWidth)
                .attr('opacity', element.opacity)
                .attr('stroke-linecap', 'round')
                .style('pointer-events', 'none');

            // Arrow heads based on arrowHeads property (default: 'end')
            const arrowHeads = element.arrowHeads || 'end';
            const arrowSize = 12;

            // End arrow head (at x2, y2)
            if (arrowHeads === 'end' || arrowHeads === 'both') {
                const angleEnd = Math.atan2(element.y2 - element.y1, element.x2 - element.x1);
                arrowGroup.append('polygon')
                    .attr('points', `0,0 -${arrowSize},-${arrowSize / 2} -${arrowSize},${arrowSize / 2}`)
                    .attr('fill', element.stroke)
                    .attr('opacity', element.opacity)
                    .attr('transform', `translate(${element.x2},${element.y2}) rotate(${angleEnd * 180 / Math.PI})`)
                    .style('pointer-events', 'none');
            }

            // Start arrow head (at x1, y1)
            if (arrowHeads === 'start' || arrowHeads === 'both') {
                const angleStart = Math.atan2(element.y1 - element.y2, element.x1 - element.x2);
                arrowGroup.append('polygon')
                    .attr('points', `0,0 -${arrowSize},-${arrowSize / 2} -${arrowSize},${arrowSize / 2}`)
                    .attr('fill', element.stroke)
                    .attr('opacity', element.opacity)
                    .attr('transform', `translate(${element.x1},${element.y1}) rotate(${angleStart * 180 / Math.PI})`)
                    .style('pointer-events', 'none');
            }

            return arrowGroup;

        case 'group':
            const g = group.append('g')
                .attr('id', element.id);

            element.children.forEach(child => {
                renderElement(child, g);
            });
            return g;

        case 'path':
            return group.append('path')
                .attr('id', element.id)
                .attr('d', element.d)
                .attr('transform', `translate(${element.x}, ${element.y})`)
                .attr('fill', element.fill)
                .attr('stroke', element.stroke)
                .attr('stroke-width', element.strokeWidth)
                .attr('opacity', element.opacity);

        case 'text':
            const textGroup = group.append('g')
                .attr('id', element.id);

            // Add invisible background rect for easier clicking
            const estimatedWidth = (element.text || '').length * (element.fontSize || 16) * 0.6;
            const estimatedHeight = (element.fontSize || 16) * 1.2;
            const textCx = element.x;
            const textCy = element.y - estimatedHeight / 2;

            // Apply rotation to the group
            if (rotation) {
                textGroup.attr('transform', `rotate(${rotation}, ${textCx}, ${textCy})`);
            }

            textGroup.append('rect')
                .attr('x', element.textAlign === 'middle' ? element.x - estimatedWidth / 2 : element.x)
                .attr('y', element.y - estimatedHeight * 0.8)
                .attr('width', estimatedWidth)
                .attr('height', estimatedHeight)
                .attr('fill', 'transparent')
                .style('pointer-events', 'all');

            textGroup.append('text')
                .attr('x', element.x)
                .attr('y', element.y)
                .attr('fill', element.fill)
                .attr('opacity', element.opacity)
                .attr('font-size', element.fontSize)
                .attr('font-family', element.fontFamily || 'Inter, sans-serif')
                .attr('font-weight', '500')
                .attr('text-anchor', element.textAlign || 'start')
                .attr('dominant-baseline', element.textAlign === 'middle' ? 'middle' : 'auto')
                .text(element.text)
                .style('pointer-events', 'none');

            return textGroup;
    }
}

function renderAllElements() {
    ensureBlurFilters();
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
    // Present mode: Add hover effects
    if (state.mode === 'present' && element.hoverEffect) {
        selection
            .style('cursor', 'pointer')
            .on('mouseenter', function () {
                applyHoverEffect(element, d3.select(this), true);
            })
            .on('mouseleave', function () {
                applyHoverEffect(element, d3.select(this), false);
            });
        return;
    }

    if (state.mode !== 'edit') return;

    selection
        .on('mousedown', function (event) {
            // 1. Global Resize Check (Priority)
            const [mx, my] = d3.pointer(event, svg.node());
            const pos = { x: mx, y: my };
            const handle = getResizeHandle(element, pos);

            if (handle) {
                event.stopPropagation();
                if (!state.selectedElements.some(e => e.id === element.id)) {
                    selectElement(element);
                }
                state.isResizing = true;
                state.resizeHandle = handle;
                state.startPoint = pos;
                state.initialElement = { ...element };
                return;
            }

            // 2. Select/Drag Logic
            if (state.currentTool === 'select' || state.currentTool === 'span') {
                event.stopPropagation();

                // Ctrl+Click or Shift+Click for multi-selection
                if (event.ctrlKey || event.metaKey || event.shiftKey) {
                    selectElement(element, true); // Toggle selection
                } else if (!state.selectedElements.some(e => e.id === element.id)) {
                    selectElement(element);
                } else {
                    // Element is already selected - ensure it's properly focused
                    state.selectedElement = element;
                    if (state.selectedElements.length === 1) {
                        syncPropertiesFromElement(element);
                        updateSelection(); // Ensure handles are shown
                    }
                }

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
            event.preventDefault();
            event.stopPropagation();

            if (!state.selectedElements.some(e => e.id === element.id)) {
                selectElement(element);
            }
            showContextMenu(event, element);
        });
}

// ===== Connector Handles =====
function getConnectorPoints(element) {
    // Returns array of {x, y, position} for connector anchors
    const points = [];
    const margin = 15; // Offset handles to prevent overlap with resize handles

    switch (element.type) {
        case 'rectangle':
        case 'triangle':
        case 'diamond':
            const cx = element.x + element.width / 2;
            const cy = element.y + element.height / 2;
            points.push({ x: cx, y: element.y - margin, position: 'top', elementId: element.id });
            points.push({ x: element.x + element.width + margin, y: cy, position: 'right', elementId: element.id });
            points.push({ x: cx, y: element.y + element.height + margin, position: 'bottom', elementId: element.id });
            points.push({ x: element.x - margin, y: cy, position: 'left', elementId: element.id });
            break;
        case 'circle':
            points.push({ x: element.cx, y: element.cy - element.ry - margin, position: 'top', elementId: element.id });
            points.push({ x: element.cx + element.rx + margin, y: element.cy, position: 'right', elementId: element.id });
            points.push({ x: element.cx, y: element.cy + element.ry + margin, position: 'bottom', elementId: element.id });
            points.push({ x: element.cx - element.rx - margin, y: element.cy, position: 'left', elementId: element.id });
            break;
        case 'text':
            const tw = (element.text || '').length * (element.fontSize || 16) * 0.6;
            const th = (element.fontSize || 16) * 1.2;
            const tx = element.textAlign === 'middle' ? element.x - tw / 2 : element.x;
            const ty = element.y - th * 0.8;
            const tcx = tx + tw / 2;
            const tcy = ty + th / 2;
            points.push({ x: tcx, y: ty - margin, position: 'top', elementId: element.id });
            points.push({ x: tx + tw + margin, y: tcy, position: 'right', elementId: element.id });
            points.push({ x: tcx, y: ty + th + margin, position: 'bottom', elementId: element.id });
            points.push({ x: tx - margin, y: tcy, position: 'left', elementId: element.id });
            break;
    }
    return points;
}

function showConnectorHandles(element) {
    hideConnectorHandles(); // Clear any existing

    const points = getConnectorPoints(element);
    if (points.length === 0) return;

    const handleGroup = mainGroup.append('g')
        .attr('class', 'connector-handles')
        .attr('data-element-id', element.id);

    points.forEach(point => {
        handleGroup.append('circle')
            .attr('class', 'connector-handle')
            .attr('cx', point.x)
            .attr('cy', point.y)
            .attr('r', 6)
            .attr('fill', '#6366f1')
            .attr('stroke', '#ffffff')
            .attr('stroke-width', 2)
            .style('cursor', 'crosshair')
            .style('pointer-events', 'all')
            .on('mousedown', function (event) {
                event.stopPropagation();
                startConnectorDraw(event, point, element);
            });
    });
}

function hideConnectorHandles() {
    mainGroup.selectAll('.connector-handles').remove();
}

function showAllConnectorHandles() {
    hideConnectorHandles(); // Clear existing

    const elements = getCurrentFrameElements();
    elements.forEach(element => {
        // Skip line/arrow/link elements
        if (element.type === 'line' || element.type === 'arrow' || element.type === 'link') return;

        const points = getConnectorPoints(element);
        if (points.length === 0) return;

        const handleGroup = mainGroup.append('g')
            .attr('class', 'connector-handles')
            .attr('data-element-id', element.id);

        points.forEach(point => {
            handleGroup.append('circle')
                .attr('class', 'connector-handle')
                .attr('cx', point.x)
                .attr('cy', point.y)
                .attr('r', 6)
                .attr('fill', '#6366f1')
                .attr('stroke', '#ffffff')
                .attr('stroke-width', 2)
                .style('cursor', 'crosshair')
                .style('pointer-events', 'all')
                .on('mousedown', function (event) {
                    event.stopPropagation();
                    startConnectorDraw(event, point, element);
                });
        });
    });
}

function showResizeHandles(element) {
    hideResizeHandles();

    let points = [];
    if (element.type === 'rectangle' || element.type === 'text' || element.type === 'triangle' || element.type === 'diamond') {
        // For simple bounding box logic
        const x = element.x;
        const y = element.y;
        const w = element.width || 0;
        const h = element.height || 0;
        points = [
            { x: x, y: y },
            { x: x + w, y: y },
            { x: x + w, y: y + h },
            { x: x, y: y + h }
        ];
    } else if (element.type === 'circle') {
        const cx = element.cx, cy = element.cy, rx = element.rx, ry = element.ry;
        points = [
            { x: cx - rx, y: cy - ry },
            { x: cx + rx, y: cy - ry },
            { x: cx + rx, y: cy + ry },
            { x: cx - rx, y: cy + ry }
        ];
    } else if (element.type === 'line' || element.type === 'arrow' || element.type === 'link') {
        points = [
            { x: element.x1, y: element.y1 },
            { x: element.x2, y: element.y2 }
        ];
    }

    const group = mainGroup.append('g').attr('class', 'resize-handle-visual');
    points.forEach(p => {
        group.append('rect')
            .attr('x', p.x - 4)
            .attr('y', p.y - 4)
            .attr('width', 8)
            .attr('height', 8)
            .attr('fill', '#ffffff')
            .attr('stroke', '#6366f1')
            .attr('stroke-width', 1)
            .style('pointer-events', 'none');
    });
}

function hideResizeHandles() {
    mainGroup.selectAll('.resize-handle-visual').remove();
}

function startConnectorDraw(event, startPoint, sourceElement) {
    state.isDrawingConnector = true;
    state.connectorStart = startPoint;
    state.connectorSourceElement = sourceElement;

    // Create temporary link
    const tempArrow = createLink(startPoint.x, startPoint.y, startPoint.x, startPoint.y);
    tempArrow.startId = sourceElement.id;
    state.tempConnectorArrow = tempArrow;

    const rendered = renderElement(tempArrow);
    rendered.attr('id', 'temp-connector');
}

function findNearestConnectorPoint(pos, excludeElementId) {
    const threshold = 25; // Snap distance
    let nearest = null;
    let nearestDist = Infinity;

    const elements = getCurrentFrameElements();

    for (const element of elements) {
        if (element.id === excludeElementId) continue;
        if (element.type === 'line' || element.type === 'arrow') continue; // Skip lines/arrows

        const points = getConnectorPoints(element);

        for (const point of points) {
            const dx = pos.x - point.x;
            const dy = pos.y - point.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < threshold && dist < nearestDist) {
                nearestDist = dist;
                nearest = point;
            }
        }
    }

    return nearest;
}

function showSnapIndicator(point) {
    hideSnapIndicator();

    mainGroup.append('circle')
        .attr('class', 'snap-indicator')
        .attr('cx', point.x)
        .attr('cy', point.y)
        .attr('r', 10)
        .attr('fill', 'none')
        .attr('stroke', '#22c55e')
        .attr('stroke-width', 2)
        .style('pointer-events', 'none');
}

function hideSnapIndicator() {
    mainGroup.selectAll('.snap-indicator').remove();
}

function selectElement(element, toggle = false) {
    if (toggle) {
        const index = state.selectedElements.findIndex(e => e.id === element.id);
        if (index >= 0) {
            state.selectedElements.splice(index, 1);
        } else {
            state.selectedElements.push(element);
        }
    } else {
        state.selectedElements = [element];
    }

    state.selectedElement = state.selectedElements[state.selectedElements.length - 1] || null;
    updateSelection();

    if (state.selectedElements.length === 1) {
        syncPropertiesFromElement(element);
    }
}

function updateSelection() {
    mainGroup.selectAll('.element-selected').classed('element-selected', false);
    hideResizeHandles();

    if (state.selectedElements.length > 0) {
        state.selectedElements.forEach(el => {
            mainGroup.select(`#${el.id}`)
                .classed('element-selected', true);
        });

        // Show resize handles for single selection only
        if (state.selectedElements.length === 1) {
            const el = state.selectedElements[0];
            showResizeHandles(el);
        }
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
    state.properties.rotation = element.rotation || 0;

    if (element.type === 'text') {
        state.properties.fontFamily = element.fontFamily || 'Inter';
        state.properties.fontSize = element.fontSize || 16;
    }

    // Update UI controls
    if (state.properties.fill === 'none') {
        d3.select('#noFill').property('checked', true);
    } else {
        d3.select('#noFill').property('checked', false);
        d3.select('#fillColor').property('value', state.properties.fill);
    }

    d3.select('#strokeColor').property('value', state.properties.stroke);
    d3.select('#strokeWidth').property('value', state.properties.strokeWidth);
    d3.select('#rotation').property('value', state.properties.rotation);
    d3.select('#fontFamily').property('value', state.properties.fontFamily);
    d3.select('#fontSize').property('value', state.properties.fontSize);

    // Sync link and arrow properties
    if (element.type === 'link') {
        d3.select('#linkStyle').property('value', element.linkStyle || 'solid');
    }
    if (element.type === 'arrow') {
        d3.select('#arrowStyle').property('value', element.arrowHeads || 'end');
    }

    // Update value labels
    d3.select('#strokeWidth').node().nextElementSibling.textContent = state.properties.strokeWidth;
    d3.select('#rotation').node().nextElementSibling.textContent = state.properties.rotation + '°';
    d3.select('#fontSize').node().nextElementSibling.textContent = state.properties.fontSize + 'px';
}

function startDrag(event, element) {
    const pos = getMousePosition(event);

    // If element not in selection, select it exclusively
    if (!state.selectedElements.find(e => e.id === element.id)) {
        selectElement(element);
    }

    state.dragState = {
        isDragging: true,
        elements: [...state.selectedElements],
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

    if (state.currentTool === 'span') {
        state.isSelecting = true;
        state.selectionBox = { startX: pos.x, startY: pos.y, x: pos.x, y: pos.y, width: 0, height: 0 };

        if (!event.shiftKey) {
            state.selectedElements = [];
            updateSelection();
        }
        return;
    }


    // Global Check: Resize takes priority over creating new shapes
    const target = findHandleOnAnyElement(pos);
    if (target) {
        // Switch to resizing this element
        if (!state.selectedElements.some(e => e.id === target.element.id)) {
            selectElement(target.element);
        }
        state.isResizing = true;
        state.resizeHandle = target.handle;
        state.startPoint = pos;
        state.initialElement = { ...target.element };
        return;
    }

    if (state.currentTool === 'select') {
        // Click outside check handled implicitly by lack of handle/element hit
        if (event.target.id === 'canvas' || event.target.tagName === 'svg') {
            state.selectedElements = [];
            state.selectedElement = null;
            updateSelection();
        }
    } else if (state.currentTool === 'text') {
        const element = createText(pos.x, pos.y);
        saveElementToFrame(element);
        renderAllElements();
        state.currentTool = 'select';
        updateToolSelection();
        saveHistory();
    } else {
        // Start drawing
        state.isDrawing = true;

        // Arrow snapping (Start Point)
        let startP = pos;
        state.tempStartId = null;
        if (state.currentTool === 'arrow') {
            const snap = snapToElement(pos);
            if (snap) {
                startP = { x: snap.x, y: snap.y };
                state.tempStartId = snap.id;
            }
        }
        state.startPoint = startP;
    }
});

svg.on('mousemove', function (event) {
    if (state.mode !== 'edit') return;

    const pos = getMousePosition(event);

    // Span Selection
    if (state.isSelecting) {
        const box = state.selectionBox;
        box.x = Math.min(box.startX, pos.x);
        box.y = Math.min(box.startY, pos.y);
        box.width = Math.abs(pos.x - box.startX);
        box.height = Math.abs(pos.y - box.startY);

        renderSelectionBox();
        return;
    }

    // Handle dragging
    if (state.dragState.isDragging && (state.currentTool === 'select' || state.currentTool === 'span')) {
        const dx = pos.x - state.dragState.startX;
        const dy = pos.y - state.dragState.startY;

        updateElementPosition(dx, dy);
        state.dragState.startX = pos.x;
        state.dragState.startY = pos.y;
        return;
    }

    // Handle resizing
    if (state.isResizing && state.selectedElements.length === 1) {
        resizeElement(state.selectedElements[0], pos, state.resizeHandle);
        renderAllElements();
        return;
    }

    // Handle connector drawing
    if (state.isDrawingConnector && state.tempConnectorArrow) {
        // Update temp arrow endpoint
        state.tempConnectorArrow.x2 = pos.x;
        state.tempConnectorArrow.y2 = pos.y;

        // Snap start point to boundary towards mouse/target
        if (state.connectorSourceElement) {
            const startPt = getBoundaryPoint(state.connectorSourceElement, pos);
            state.tempConnectorArrow.x1 = startPt.x;
            state.tempConnectorArrow.y1 = startPt.y;
        }

        // Check for snap to other elements
        const snapPoint = findNearestConnectorPoint(pos, state.connectorSourceElement.id);
        if (snapPoint) {
            state.tempConnectorArrow.x2 = snapPoint.x;
            state.tempConnectorArrow.y2 = snapPoint.y;
            state.tempConnectorArrow.endId = snapPoint.elementId;
            // Show snap indicator
            showSnapIndicator(snapPoint);
        } else {
            state.tempConnectorArrow.endId = null;
            hideSnapIndicator();
        }

        // Re-render temp arrow
        mainGroup.select('#temp-connector').remove();
        const rendered = renderElement(state.tempConnectorArrow);
        rendered.attr('id', 'temp-connector');
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
            case 'triangle':
                element = createTriangle(state.startPoint.x, state.startPoint.y, pos.x, pos.y);
                break;
            case 'diamond':
                element = createDiamond(state.startPoint.x, state.startPoint.y, pos.x, pos.y);
                break;
            case 'line':
                element = createLine(state.startPoint.x, state.startPoint.y, pos.x, pos.y);
                break;
            case 'arrow':
                let endX = pos.x;
                let endY = pos.y;
                let endId = null;

                // Snap to end element
                const snapEnd = snapToElement(pos);
                if (snapEnd) {
                    endX = snapEnd.x;
                    endY = snapEnd.y;
                    endId = snapEnd.id;
                }

                element = createArrow(state.startPoint.x, state.startPoint.y, endX, endY);
                if (state.tempStartId) element.startId = state.tempStartId;
                if (endId) element.endId = endId;
                break;
        }

        if (element) {
            state.tempElement = element;
            renderElement(element);
        }
    }

    // Global Cursor Update
    if (!state.dragState.isDragging && !state.isResizing && !state.isDrawing) {
        // Check for resize handles
        const target = findHandleOnAnyElement(pos);
        if (target) {
            svg.style('cursor', getCursorForHandle(target.handle));
            return;
        }

        // Move/Default
        if (state.currentTool === 'select' || state.currentTool === 'span') {
            const elements = getCurrentFrameElements();
            let isOver = false;
            for (let i = elements.length - 1; i >= 0; i--) {
                if (isPointOverElement(elements[i], pos)) {
                    isOver = true;
                    break;
                }
            }

            if (isOver) {
                svg.style('cursor', 'move');
            } else {
                svg.style('cursor', null);
                svg.attr('data-tool', state.currentTool);
            }
        } else {
            svg.style('cursor', null);
            svg.attr('data-tool', state.currentTool);
        }
    }
});

svg.on('mouseup', function (event) {
    if (state.mode !== 'edit') return;

    // End dragging
    // End dragging
    if (state.dragState.isDragging) {
        state.dragState.elements.forEach(el => saveElementToFrame(el));
        state.dragState.isDragging = false;
        state.dragState.elements = [];
        state.dragState.element = null;
        saveHistory();
    }

    // End Span Selection
    if (state.isSelecting) {
        const box = state.selectionBox;
        const elements = getCurrentFrameElements();

        elements.forEach(el => {
            if (isElementInBox(el, box)) {
                selectElement(el, true); // Add to selection
            }
        });

        state.isSelecting = false;
        state.selectionBox = null;
        d3.select('#selectionBox').remove();
    }

    // End resizing
    if (state.isResizing) {
        if (state.selectedElements.length === 1) {
            saveElementToFrame(state.selectedElements[0]);
        }
        state.isResizing = false;
        state.resizeHandle = null;
        saveHistory();
    }

    // End connector drawing
    if (state.isDrawingConnector && state.tempConnectorArrow) {
        mainGroup.select('#temp-connector').remove();
        hideSnapIndicator();
        hideConnectorHandles();

        // Check if arrow has sufficient length
        const dx = state.tempConnectorArrow.x2 - state.tempConnectorArrow.x1;
        const dy = state.tempConnectorArrow.y2 - state.tempConnectorArrow.y1;
        const length = Math.sqrt(dx * dx + dy * dy);

        if (length > 10) {
            // Snap to boundaries - Ensure perfect connection
            if (state.tempConnectorArrow.startId && state.tempConnectorArrow.endId) {
                const elements = getCurrentFrameElements();
                const startEl = elements.find(e => e.id === state.tempConnectorArrow.startId);
                const endEl = elements.find(e => e.id === state.tempConnectorArrow.endId);

                if (startEl && endEl) {
                    const startCenter = getCenter(startEl);
                    const endCenter = getCenter(endEl);
                    const startPt = getBoundaryPoint(startEl, endCenter);
                    const endPt = getBoundaryPoint(endEl, startCenter);

                    state.tempConnectorArrow.x1 = startPt.x;
                    state.tempConnectorArrow.y1 = startPt.y;
                    state.tempConnectorArrow.x2 = endPt.x;
                    state.tempConnectorArrow.y2 = endPt.y;
                }
            }

            // Save the connector arrow
            saveElementToFrame(state.tempConnectorArrow);
            selectElement(state.tempConnectorArrow);
            renderAllElements();
            saveHistory();
        }

        // Reset connector state
        state.isDrawingConnector = false;
        state.connectorStart = null;
        state.connectorSourceElement = null;
        state.tempConnectorArrow = null;
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

function updateElementPosition(dx, dy) {
    const elementsToMove = state.dragState.elements.length > 0 ? state.dragState.elements : [];

    elementsToMove.forEach(element => {
        moveElementRecursive(element, dx, dy);
    });

    renderAllElements();
}

function moveElementRecursive(element, dx, dy) {
    switch (element.type) {
        case 'group':
            element.children.forEach(child => moveElementRecursive(child, dx, dy));
            element.x += dx;
            element.y += dy;
            break;
        case 'rectangle':
            element.x += dx;
            element.y += dy;
            break;
        case 'circle':
            element.cx += dx;
            element.cy += dy;
            break;
        case 'triangle':
        case 'diamond':
            element.x += dx;
            element.y += dy;
            // Recalculate points based on new position
            if (element.type === 'triangle') {
                const x = element.x;
                const y = element.y;
                const width = element.width;
                const height = element.height;
                element.points = `${x + width / 2},${y} ${x + width},${y + height} ${x},${y + height}`;
            } else {
                const x = element.x;
                const y = element.y;
                const width = element.width;
                const height = element.height;
                element.points = `${x + width / 2},${y} ${x + width},${y + height / 2} ${x + width / 2},${y + height} ${x},${y + height / 2}`;
            }
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

    // Update any arrows linked to this element
    updateLinkedArrows(element, dx, dy);
}

function updateLinkedArrows(element, dx, dy) {
    const elements = getCurrentFrameElements();
    elements.forEach(el => {
        // Handle legacy Arrows (simple move)
        if (el.type === 'arrow') {
            if (el.startId === element.id) {
                el.x1 += dx;
                el.y1 += dy;
            }
            if (el.endId === element.id) {
                el.x2 += dx;
                el.y2 += dy;
            }
        }
        // Handle Links (Boundary Snap)
        else if (el.type === 'link') {
            // If connected to this moving element
            if (el.startId === element.id || el.endId === element.id) {
                const startEl = elements.find(e => e.id === el.startId);
                const endEl = elements.find(e => e.id === el.endId);

                // If both ends exist, snap to boundaries
                if (startEl && endEl) {
                    const startCenter = getCenter(startEl);
                    const endCenter = getCenter(endEl);

                    const startPt = getBoundaryPoint(startEl, endCenter);
                    const endPt = getBoundaryPoint(endEl, startCenter);

                    el.x1 = startPt.x;
                    el.y1 = startPt.y;
                    el.x2 = endPt.x;
                    el.y2 = endPt.y;
                }
                // Fallback for dragging one end (e.g. during creation partial state?)
                // Usually creation uses temp arrow.
            }
        }
    });
}

function getCenter(el) {
    if (el.type === 'circle') return { x: el.cx, y: el.cy };
    if (el.type === 'line' || el.type === 'arrow' || el.type === 'link') {
        return { x: (el.x1 + el.x2) / 2, y: (el.y1 + el.y2) / 2 };
    }
    // Rect, Text, Triangle, Diamond
    return { x: el.x + el.width / 2, y: el.y + el.height / 2 };
}

function getBoundaryPoint(el, target) {
    const center = getCenter(el);
    const dx = target.x - center.x;
    const dy = target.y - center.y;
    const angle = Math.atan2(dy, dx);

    if (el.type === 'circle') {
        return {
            x: center.x + Math.cos(angle) * el.rx,
            y: center.y + Math.sin(angle) * el.ry
        };
    }

    if (el.type === 'triangle') {
        // Triangle vertices: top-center, bottom-left, bottom-right
        const vertices = [
            { x: el.x + el.width / 2, y: el.y },                    // top
            { x: el.x, y: el.y + el.height },                       // bottom-left
            { x: el.x + el.width, y: el.y + el.height }             // bottom-right
        ];
        return getPolygonBoundaryPoint(center, target, vertices);
    }

    if (el.type === 'diamond') {
        // Diamond vertices: top, right, bottom, left
        const vertices = [
            { x: el.x + el.width / 2, y: el.y },                    // top
            { x: el.x + el.width, y: el.y + el.height / 2 },        // right
            { x: el.x + el.width / 2, y: el.y + el.height },        // bottom
            { x: el.x, y: el.y + el.height / 2 }                    // left
        ];
        return getPolygonBoundaryPoint(center, target, vertices);
    }

    // Rectangle logic (works for Text, Rect, etc.)
    const w = (el.width || 0) / 2;
    const h = (el.height || 0) / 2;
    if (w === 0 || h === 0) return center;

    const cos = Math.cos(angle);
    const sin = Math.sin(angle);

    const t_x = cos !== 0 ? (Math.sign(cos) * w) / cos : Infinity;
    const t_y = sin !== 0 ? (Math.sign(sin) * h) / sin : Infinity;

    const t = Math.min(Math.abs(t_x), Math.abs(t_y));

    return {
        x: center.x + t * cos,
        y: center.y + t * sin
    };
}

// Helper: Find intersection of ray from center to target with polygon edges
function getPolygonBoundaryPoint(center, target, vertices) {
    let closestPoint = center;
    let minDist = Infinity;

    for (let i = 0; i < vertices.length; i++) {
        const v1 = vertices[i];
        const v2 = vertices[(i + 1) % vertices.length];

        const intersection = lineIntersection(
            center.x, center.y, target.x, target.y,
            v1.x, v1.y, v2.x, v2.y
        );

        if (intersection) {
            const dist = Math.sqrt(
                Math.pow(intersection.x - center.x, 2) +
                Math.pow(intersection.y - center.y, 2)
            );
            if (dist < minDist && dist > 0.1) {
                minDist = dist;
                closestPoint = intersection;
            }
        }
    }

    return closestPoint;
}

// Helper: Line segment intersection
function lineIntersection(x1, y1, x2, y2, x3, y3, x4, y4) {
    const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
    if (Math.abs(denom) < 0.0001) return null;

    const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom;
    const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / denom;

    // t > 0 means intersection is in the direction of target
    // u between 0 and 1 means intersection is on the edge segment
    if (t > 0 && u >= 0 && u <= 1) {
        return {
            x: x1 + t * (x2 - x1),
            y: y1 + t * (y2 - y1)
        };
    }
    return null;
}


function snapToElement(pos) {
    // Helper to find nearest element anchor (center)
    // Returns { x, y, id } or null
    const threshold = 15;
    const elements = getCurrentFrameElements();

    // Reverse check for z-index
    for (let i = elements.length - 1; i >= 0; i--) {
        const el = elements[i];
        if (el.type === 'arrow' || el.type === 'line' || el.type === 'text') continue; // Snap to shapes only
        if (state.tempElement && el.id === state.tempElement.id) continue; // Don't snap to self

        let cx, cy;
        if (el.type === 'circle') {
            cx = el.cx; cy = el.cy;
        } else {
            cx = el.x + el.width / 2;
            cy = el.y + el.height / 2;
        }

        const dist = Math.sqrt((pos.x - cx) ** 2 + (pos.y - cy) ** 2);
        if (dist < threshold) {
            return { x: cx, y: cy, id: el.id };
        }
    }
    return null;
}



function findHandleOnAnyElement(pos) {
    const elements = getCurrentFrameElements();
    // Check in reverse order (top z-index first) to find the top-most interactable element
    for (let i = elements.length - 1; i >= 0; i--) {
        const el = elements[i];
        const handle = getResizeHandle(el, pos);
        if (handle) return { element: el, handle };
    }
    return null;
}

// ===== Resize Functions =====
function getResizeHandle(element, pos) {
    const threshold = 6; // Reduced to 6px to prevent false positives

    // Internal helper for distance
    const dist = (x1, y1, x2, y2) => Math.sqrt((x1 - x2) ** 2 + (y1 - y2) ** 2);

    // Internal helper for point to segment distance
    const pointToLine = (x, y, x1, y1, x2, y2) => {
        const A = x - x1;
        const B = y - y1;
        const C = x2 - x1;
        const D = y2 - y1;
        const dot = A * C + B * D;
        const len_sq = C * C + D * D;
        let param = -1;
        if (len_sq !== 0) param = dot / len_sq;
        let xx, yy;
        if (param < 0) { xx = x1; yy = y1; }
        else if (param > 1) { xx = x2; yy = y2; }
        else { xx = x1 + param * C; yy = y1 + param * D; }
        return dist(x, y, xx, yy);
    };

    switch (element.type) {
        case 'rectangle':
            const right = element.x + element.width;
            const bottom = element.y + element.height;

            // Check corners first (priority)
            if (Math.abs(pos.x - right) < threshold && Math.abs(pos.y - bottom) < threshold) return 'se';
            if (Math.abs(pos.x - element.x) < threshold && Math.abs(pos.y - bottom) < threshold) return 'sw';
            if (Math.abs(pos.x - right) < threshold && Math.abs(pos.y - element.y) < threshold) return 'ne';
            if (Math.abs(pos.x - element.x) < threshold && Math.abs(pos.y - element.y) < threshold) return 'nw';


            break;

        case 'triangle':
            const t_top = { x: element.x + element.width / 2, y: element.y };
            const t_bl = { x: element.x, y: element.y + element.height };
            const t_br = { x: element.x + element.width, y: element.y + element.height };

            // Detect Vertices (map to standard box handles)
            if (dist(pos.x, pos.y, t_top.x, t_top.y) < threshold) return 'n';
            if (dist(pos.x, pos.y, t_br.x, t_br.y) < threshold) return 'se';
            if (dist(pos.x, pos.y, t_bl.x, t_bl.y) < threshold) return 'sw';

            // Detect Edges (map to standard box handles)
            if (pointToLine(pos.x, pos.y, t_top.x, t_top.y, t_br.x, t_br.y) < threshold) return 'e'; // Right slant
            if (pointToLine(pos.x, pos.y, t_top.x, t_top.y, t_bl.x, t_bl.y) < threshold) return 'w'; // Left slant
            if (pointToLine(pos.x, pos.y, t_bl.x, t_bl.y, t_br.x, t_br.y) < threshold) return 's'; // Bottom
            break;

        case 'diamond':
            const d_top = { x: element.x + element.width / 2, y: element.y };
            const d_right = { x: element.x + element.width, y: element.y + element.height / 2 };
            const d_bot = { x: element.x + element.width / 2, y: element.y + element.height };
            const d_left = { x: element.x, y: element.y + element.height / 2 };

            // Detect Vertices
            if (dist(pos.x, pos.y, d_top.x, d_top.y) < threshold) return 'n';
            if (dist(pos.x, pos.y, d_right.x, d_right.y) < threshold) return 'e';
            if (dist(pos.x, pos.y, d_bot.x, d_bot.y) < threshold) return 's';
            if (dist(pos.x, pos.y, d_left.x, d_left.y) < threshold) return 'w';

            // Detect Edges (map to corner handles for diagonal resize)
            if (pointToLine(pos.x, pos.y, d_top.x, d_top.y, d_right.x, d_right.y) < threshold) return 'ne';
            if (pointToLine(pos.x, pos.y, d_right.x, d_right.y, d_bot.x, d_bot.y) < threshold) return 'se';
            if (pointToLine(pos.x, pos.y, d_bot.x, d_bot.y, d_left.x, d_left.y) < threshold) return 'sw';
            if (pointToLine(pos.x, pos.y, d_left.x, d_left.y, d_top.x, d_top.y) < threshold) return 'nw';
            break;

        case 'circle':
            // Treat circle as bounding box for handles to ensure alignment
            const c_x = element.cx - element.rx;
            const c_y = element.cy - element.ry;
            const c_right = element.cx + element.rx;
            const c_bottom = element.cy + element.ry;

            // Check corners
            if (dist(pos.x, pos.y, c_right, c_bottom) < threshold) return 'se';
            if (dist(pos.x, pos.y, c_x, c_bottom) < threshold) return 'sw';
            if (dist(pos.x, pos.y, c_right, c_y) < threshold) return 'ne';
            if (dist(pos.x, pos.y, c_x, c_y) < threshold) return 'nw';


            break;

        case 'line':
        case 'arrow':
            // Handles at both endpoints
            if (dist(pos.x, pos.y, element.x1, element.y1) < threshold) return 'start';
            if (dist(pos.x, pos.y, element.x2, element.y2) < threshold) return 'end';
            break;

        case 'text':
            // Text bounding box handles
            const textWidth = (element.text || '').length * (element.fontSize || 16) * 0.6;
            const textHeight = (element.fontSize || 16) * 1.2;
            const textX = element.textAlign === 'middle' ? element.x - textWidth / 2 : element.x;
            const textY = element.y - textHeight * 0.8;
            const textRight = textX + textWidth;
            const textBottom = textY + textHeight;

            // Check corners
            if (dist(pos.x, pos.y, textRight, textBottom) < threshold) return 'se';
            if (dist(pos.x, pos.y, textX, textBottom) < threshold) return 'sw';
            if (dist(pos.x, pos.y, textRight, textY) < threshold) return 'ne';
            if (dist(pos.x, pos.y, textX, textY) < threshold) return 'nw';


            break;
    }

    return null;
}

function resizeElement(element, pos, handle) {
    const init = state.initialElement;
    if (!init) return;

    const dx = pos.x - state.startPoint.x;
    const dy = pos.y - state.startPoint.y;
    const MIN = 10;

    if (element.type === 'circle') {
        const initX = init.cx - init.rx;
        const initY = init.cy - init.ry;
        const initW = init.rx * 2;
        const initH = init.ry * 2;

        let newX = initX; let newY = initY; let newW = initW; let newH = initH;

        if (handle.includes('e')) newW = Math.max(MIN, initW + dx);
        if (handle.includes('w')) {
            newW = Math.max(MIN, initW - dx);
            newX = initX + (initW - newW);
        }
        if (handle.includes('s')) newH = Math.max(MIN, initH + dy);
        if (handle.includes('n')) {
            newH = Math.max(MIN, initH - dy);
            newY = initY + (initH - newH);
        }

        element.rx = newW / 2;
        element.ry = newH / 2;
        element.cx = newX + element.rx;
        element.cy = newY + element.ry;
    } else if (element.type === 'rectangle' || element.type === 'triangle' || element.type === 'diamond') {
        // Rectangle, Triangle, Diamond
        let newX = init.x; let newY = init.y; let newW = init.width; let newH = init.height;

        if (handle.includes('e')) newW = Math.max(MIN, init.width + dx);
        if (handle.includes('w')) {
            newW = Math.max(MIN, init.width - dx);
            newX = init.x + (init.width - newW);
        }
        if (handle.includes('s')) newH = Math.max(MIN, init.height + dy);
        if (handle.includes('n')) {
            newH = Math.max(MIN, init.height - dy);
            newY = init.y + (init.height - newH);
        }

        element.x = newX; element.y = newY; element.width = newW; element.height = newH;

        // Recalculate polygon points
        if (element.type === 'triangle') {
            const x = element.x, y = element.y, w = element.width, h = element.height;
            element.points = `${x + w / 2},${y} ${x + w},${y + h} ${x},${y + h}`;
        } else if (element.type === 'diamond') {
            const x = element.x, y = element.y, w = element.width, h = element.height;
            element.points = `${x + w / 2},${y} ${x + w},${y + h / 2} ${x + w / 2},${y + h} ${x},${y + h / 2}`;
        }
    } else if (element.type === 'line' || element.type === 'arrow') {
        // Line/Arrow endpoint resize with snapping
        if (handle === 'start') {
            const snap = snapToElement(pos);
            if (snap) {
                element.x1 = snap.x;
                element.y1 = snap.y;
                element.startId = snap.id;
            } else {
                element.x1 = pos.x;
                element.y1 = pos.y;
                element.startId = null;
            }
        } else if (handle === 'end') {
            const snap = snapToElement(pos);
            if (snap) {
                element.x2 = snap.x;
                element.y2 = snap.y;
                element.endId = snap.id;
            } else {
                element.x2 = pos.x;
                element.y2 = pos.y;
                element.endId = null;
            }
        }
    } else if (element.type === 'text') {
        // Text resize - change font size based on drag
        const initFontSize = init.fontSize || 16;

        // Calculate scale factor based on vertical drag (more intuitive)
        if (handle.includes('s') || handle.includes('n')) {
            const scaleFactor = 1 + (dy / 100);
            element.fontSize = Math.max(8, Math.min(200, Math.round(initFontSize * scaleFactor)));
        }
        if (handle.includes('e') || handle.includes('w')) {
            const scaleFactor = 1 + (dx / 100);
            element.fontSize = Math.max(8, Math.min(200, Math.round(initFontSize * scaleFactor)));
        }

        if (handle.includes('n')) {
            element.y = init.y + dy;
        }
    }

    // Update links attached to this element
    updateLinkedArrows(element, 0, 0);
}

function isPointOverElement(element, pos) {
    // Check if a point is over an element (for cursor/hit testing)
    const threshold = 5;

    switch (element.type) {
        case 'rectangle':
            return pos.x >= element.x && pos.x <= element.x + element.width &&
                pos.y >= element.y && pos.y <= element.y + element.height;

        case 'circle':
            const dx = pos.x - element.cx;
            const dy = pos.y - element.cy;
            return (dx * dx) / (element.rx * element.rx) + (dy * dy) / (element.ry * element.ry) <= 1;

        case 'triangle':
            // Use barycentric coordinates
            const x1 = element.x + element.width / 2, y1 = element.y;
            const x2 = element.x + element.width, y2 = element.y + element.height;
            const x3 = element.x, y3 = element.y + element.height;

            const den = (y2 - y3) * (x1 - x3) + (x3 - x2) * (y1 - y3);
            if (den === 0) return false;

            const a = ((y2 - y3) * (pos.x - x3) + (x3 - x2) * (pos.y - y3)) / den;
            const b = ((y3 - y1) * (pos.x - x3) + (x1 - x3) * (pos.y - y3)) / den;
            const c = 1 - a - b;

            return a >= 0 && b >= 0 && c >= 0;

        case 'diamond':
            const dxD = Math.abs(pos.x - (element.x + element.width / 2));
            const dyD = Math.abs(pos.y - (element.y + element.height / 2));
            const hw = Math.max(element.width / 2, 1);
            const hh = Math.max(element.height / 2, 1);
            return (dxD / hw + dyD / hh) <= 1;

        case 'line':
        case 'arrow':
            // Check distance to line segment
            const A = pos.x - element.x1;
            const B = pos.y - element.y1;
            const C = element.x2 - element.x1;
            const D = element.y2 - element.y1;
            const dot = A * C + B * D;
            const len_sq = C * C + D * D;
            let param = len_sq !== 0 ? dot / len_sq : -1;

            let xx, yy;
            if (param < 0) { xx = element.x1; yy = element.y1; }
            else if (param > 1) { xx = element.x2; yy = element.y2; }
            else { xx = element.x1 + param * C; yy = element.y1 + param * D; }

            const dist = Math.sqrt((pos.x - xx) ** 2 + (pos.y - yy) ** 2);
            return dist < 10; // 10px tolerance for lines

        case 'text':
            // Estimate text bounds
            const textWidth = (element.text || '').length * (element.fontSize || 16) * 0.6;
            const textHeight = (element.fontSize || 16) * 1.2;
            const textX = element.textAlign === 'middle' ? element.x - textWidth / 2 : element.x;
            const textY = element.y - textHeight * 0.8;

            return pos.x >= textX && pos.x <= textX + textWidth &&
                pos.y >= textY && pos.y <= textY + textHeight;

        default:
            return false;
    }
}

function updateCursorForResize(pos) {
    if (state.selectedElements.length !== 1) {
        // Reset to tool cursor by re-triggering data-tool attribute
        svg.attr('data-tool', state.currentTool);
        svg.style('cursor', null); // Remove inline style to use CSS cursor
        return;
    }

    const handle = getResizeHandle(state.selectedElements[0], pos);

    if (handle) {
        // At resize boundary - show resize cursor
        if (typeof handle === 'string') {
            // Rectangle/triangle/diamond/line/arrow handles
            const cursorMap = {
                'nw': 'nw-resize',
                'n': 'n-resize',
                'ne': 'ne-resize',
                'e': 'e-resize',
                'se': 'se-resize',
                's': 's-resize',
                'sw': 'sw-resize',
                'w': 'w-resize',
                'start': 'crosshair',
                'end': 'crosshair'
            };
            svg.style('cursor', cursorMap[handle] || 'default');
        } else {
            // Circle handle
            svg.style('cursor', 'nwse-resize');
        }
    } else {
        // Not at resize boundary - check if we're over the selected element
        const element = state.selectedElements[0];
        const isOverElement = isPointOverElement(element, pos);

        if (isOverElement) {
            // Over the element but not at boundary - show move cursor
            svg.style('cursor', 'move');
        } else {
            // Not over element - show tool cursor
            svg.style('cursor', null);
        }
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
    // Re-render to clear Present mode event listeners and restore Edit mode interactions
    renderAllElements();
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

        case 'triangle':
        case 'diamond':
            const cx = element.x + element.width / 2;
            const cy = element.y + element.height / 2;
            startState.x = cx;
            startState.y = cy;
            startState.width = 0;
            startState.height = 0;
            startState.opacity = 0;
            // Recalculate points for zero-size shape
            if (element.type === 'triangle') {
                startState.points = `${cx},${cy} ${cx},${cy} ${cx},${cy}`;
            } else {
                startState.points = `${cx},${cy} ${cx},${cy} ${cx},${cy} ${cx},${cy}`;
            }
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

        case 'link':
            const linkMidX = (element.x1 + element.x2) / 2;
            const linkMidY = (element.y1 + element.y2) / 2;
            startState.x1 = linkMidX;
            startState.y1 = linkMidY;
            startState.x2 = linkMidX;
            startState.y2 = linkMidY;
            startState.opacity = 0;
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

        case 'triangle':
        case 'diamond':
            const cx = element.x + element.width / 2;
            const cy = element.y + element.height / 2;
            endState.x = cx;
            endState.y = cy;
            endState.width = 0;
            endState.height = 0;
            endState.opacity = 0;
            // Recalculate points for zero-size shape
            if (element.type === 'triangle') {
                endState.points = `${cx},${cy} ${cx},${cy} ${cx},${cy}`;
            } else {
                endState.points = `${cx},${cy} ${cx},${cy} ${cx},${cy} ${cx},${cy}`;
            }
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

        case 'link':
            const linkMidX = (element.x1 + element.x2) / 2;
            const linkMidY = (element.y1 + element.y2) / 2;
            endState.x1 = linkMidX;
            endState.y1 = linkMidY;
            endState.x2 = linkMidX;
            endState.y2 = linkMidY;
            endState.opacity = 0;
            break;
    }

    return endState;
}

function animateElement(selection, fromEl, toEl, duration, ease) {
    const fromRotation = fromEl.rotation || 0;
    const toRotation = toEl.rotation || 0;

    switch (toEl.type) {
        case 'rectangle':
            const rectCx = toEl.x + toEl.width / 2;
            const rectCy = toEl.y + toEl.height / 2;
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
                .attr('opacity', toEl.opacity)
                .attrTween('transform', function () {
                    return d3.interpolateString(
                        `rotate(${fromRotation}, ${rectCx}, ${rectCy})`,
                        `rotate(${toRotation}, ${rectCx}, ${rectCy})`
                    );
                });
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
                .attr('opacity', toEl.opacity)
                .attrTween('transform', function () {
                    return d3.interpolateString(
                        `rotate(${fromRotation}, ${toEl.cx}, ${toEl.cy})`,
                        `rotate(${toRotation}, ${toEl.cx}, ${toEl.cy})`
                    );
                });
            break;

        case 'triangle':
        case 'diamond':
            const polyCx = toEl.x + toEl.width / 2;
            const polyCy = toEl.y + toEl.height / 2;
            selection.transition()
                .duration(duration)
                .ease(ease)
                .attr('points', toEl.points)
                .attr('fill', toEl.fill)
                .attr('stroke', toEl.stroke)
                .attr('stroke-width', toEl.strokeWidth)
                .attr('opacity', toEl.opacity)
                .attrTween('transform', function () {
                    return d3.interpolateString(
                        `rotate(${fromRotation}, ${polyCx}, ${polyCy})`,
                        `rotate(${toRotation}, ${polyCx}, ${polyCy})`
                    );
                });
            break;

        case 'line':
            // Animate invisible hit area (child 1)
            selection.select('line:nth-child(1)')
                .transition()
                .duration(duration)
                .ease(ease)
                .attr('x1', toEl.x1)
                .attr('y1', toEl.y1)
                .attr('x2', toEl.x2)
                .attr('y2', toEl.y2);

            // Animate visible line (child 2)
            selection.select('line:nth-child(2)')
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
            break;

        case 'arrow':
            // Animate invisible hit area
            selection.select('line:nth-child(1)')
                .transition()
                .duration(duration)
                .ease(ease)
                .attr('x1', toEl.x1)
                .attr('y1', toEl.y1)
                .attr('x2', toEl.x2)
                .attr('y2', toEl.y2);

            // Animate visible line
            selection.select('line:nth-child(2)')
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

            const angle = Math.atan2(toEl.y2 - toEl.y1, toEl.x2 - toEl.x1) * 180 / Math.PI;

            selection.select('polygon')
                .transition()
                .duration(duration)
                .ease(ease)
                .attr('transform', `translate(${toEl.x2},${toEl.y2}) rotate(${angle})`)
                .attr('fill', toEl.stroke)
                .attr('opacity', toEl.opacity);
            break;

        case 'text':
            // Word-level text animation using GSAP
            animateTextWordLevel(selection, fromEl, toEl, duration);
            break;

        case 'link':
            // Animate invisible hit area (child 1)
            selection.select('line:nth-child(1)')
                .transition()
                .duration(duration)
                .ease(ease)
                .attr('x1', toEl.x1)
                .attr('y1', toEl.y1)
                .attr('x2', toEl.x2)
                .attr('y2', toEl.y2);

            // Animate visible line (child 2)
            selection.select('line:nth-child(2)')
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
            break;
    }
}

// ===== Tool Selection =====
function selectTool(tool) {
    state.currentTool = tool;
    updateToolSelection();

    // Set data-tool for cursor styling
    svg.attr('data-tool', tool);
}

function updateToolSelection() {
    d3.selectAll('.tool-btn').classed('active', false);
    d3.select(`.tool-btn[data-tool="${state.currentTool}"]`).classed('active', true);

    // Disable 'No Fill' for text tool (text uses fill for color)
    const noFillCheckbox = d3.select('#noFill');
    if (state.currentTool === 'text') {
        noFillCheckbox.property('disabled', true);
        noFillCheckbox.property('checked', false);
        // Ensure fill has a visible color for text
        if (state.properties.fill === 'none') {
            state.properties.fill = '#ffffff';
            d3.select('#fillColor').property('value', '#ffffff');
        }
    } else {
        noFillCheckbox.property('disabled', false);
    }
}

// ===== Word-Level Text Animation with GSAP =====
function animateTextWordLevel(selection, fromEl, toEl, duration) {
    const fromText = fromEl.text || '';
    const toText = toEl.text || '';
    const fontSize = toEl.fontSize || 16;
    const fontFamily = toEl.fontFamily || 'Inter, sans-serif';

    // Use much longer duration for smoother text animation
    const textDuration = Math.max(duration * 1.5, 1000);
    const durationSec = textDuration / 1000;

    // Get DOM nodes
    const textGroup = selection.node();
    const rect = selection.select('rect');
    const textEl = selection.select('text');

    // Calculate dimensions
    const textWidth = toText.length * fontSize * 0.6;
    const textHeight = fontSize * 1.2;
    const textX = toEl.textAlign === 'middle' ? toEl.x - textWidth / 2 : toEl.x;
    const textY = toEl.y - textHeight * 0.8;

    // Check if text content changed
    const textChanged = fromText !== toText;

    // Check if position changed
    const positionChanged = fromEl.x !== toEl.x || fromEl.y !== toEl.y;

    if (typeof gsap !== 'undefined') {
        // Animate hit area smoothly with GSAP
        gsap.to(rect.node(), {
            attr: { x: textX, y: textY, width: textWidth, height: textHeight },
            duration: durationSec,
            ease: 'sine.inOut'  // Very smooth sine easing
        });

        const textNode = textEl.node();

        // Smooth position animation
        gsap.to(textNode, {
            attr: { x: toEl.x, y: toEl.y },
            duration: durationSec,
            ease: 'sine.inOut'
        });

        // Handle text content change with word animation
        if (textChanged) {
            const fromWords = fromText.split(/\s+/).filter(w => w);
            const toWords = toText.split(/\s+/).filter(w => w);
            const { added } = diffWords(fromWords, toWords);

            // If words changed, rebuild with tspans for word-level animation
            textEl.text('');

            toWords.forEach((word, i) => {
                const isNew = added.includes(i);
                const tspan = textEl.append('tspan')
                    .text((i === 0 ? '' : ' ') + word);

                if (isNew) {
                    // Fade in new words with staggered delay
                    tspan.style('opacity', 0);
                    gsap.to(tspan.node(), {
                        opacity: 1,
                        duration: durationSec * 0.6,
                        ease: 'power1.in',  // Gentle ease-in
                        delay: 0.15 + (i * 0.05)  // Staggered delay for each word
                    });
                }
            });
        }
    } else {
        // D3 fallback for position animation
        rect.transition()
            .duration(textDuration)
            .ease(d3.easeCubicInOut)
            .attr('x', textX)
            .attr('y', textY)
            .attr('width', textWidth)
            .attr('height', textHeight);

        textEl.transition()
            .duration(textDuration)
            .ease(d3.easeCubicInOut)
            .attr('x', toEl.x)
            .attr('y', toEl.y)
            .attr('fill', toEl.fill)
            .attr('font-size', fontSize);

        // Update text content at midpoint
        if (textChanged) {
            setTimeout(() => {
                textEl.text(toText);
            }, textDuration / 2);
        }
    }
}

// Diff words between two arrays
function diffWords(fromWords, toWords) {
    const added = [];
    const removed = [];
    const common = [];

    // Simple LCS-based diff
    const toSet = new Set(toWords);
    const fromSet = new Set(fromWords);

    toWords.forEach((word, i) => {
        if (!fromSet.has(word)) {
            added.push(i);
        } else {
            common.push(i);
        }
    });

    fromWords.forEach((word, i) => {
        if (!toSet.has(word)) {
            removed.push(i);
        }
    });

    return { added, removed, common };
}

// ===== Property Updates =====
function updateProperties() {
    state.properties.fill = d3.select('#fillColor').property('value');
    state.properties.stroke = d3.select('#strokeColor').property('value');
    state.properties.strokeWidth = +d3.select('#strokeWidth').property('value');
    state.properties.fontFamily = d3.select('#fontFamily').property('value');
    state.properties.fontSize = +d3.select('#fontSize').property('value');

    d3.select('#strokeWidth').node().nextElementSibling.textContent = state.properties.strokeWidth;
    d3.select('#fontSize').node().nextElementSibling.textContent = state.properties.fontSize + 'px';

    // Apply to selected element if one is selected
    if (state.selectedElement) {
        state.selectedElement.fill = state.properties.fill;
        state.selectedElement.stroke = state.properties.stroke;
        state.selectedElement.strokeWidth = state.properties.strokeWidth;

        if (state.selectedElement.type === 'text') {
            state.selectedElement.fontFamily = state.properties.fontFamily;
            state.selectedElement.fontSize = state.properties.fontSize;
        }

        saveElementToFrame(state.selectedElement);
        renderAllElements();
        updateSelection();
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
d3.select('#rotation').on('input', updateRotation);
d3.select('#fontFamily').on('change', updateProperties);
d3.select('#fontSize').on('input', updateProperties);

// Link Style - changes stroke style of link elements
d3.select('#linkStyle').on('change', function () {
    const style = d3.select(this).property('value');
    if (state.selectedElement && state.selectedElement.type === 'link') {
        state.selectedElement.linkStyle = style;
        saveElementToFrame(state.selectedElement);
        renderAllElements();
        updateSelection();
        saveHistory();
        console.log(`Link style changed to: ${style}`);
    }
});

// Arrow Heads - changes arrowhead position on arrow elements
d3.select('#arrowStyle').on('change', function () {
    const style = d3.select(this).property('value');
    if (state.selectedElement && state.selectedElement.type === 'arrow') {
        state.selectedElement.arrowHeads = style;
        saveElementToFrame(state.selectedElement);
        renderAllElements();
        updateSelection();
        saveHistory();
        console.log(`Arrow heads changed to: ${style}`);
    }
});

function updateRotation() {
    const rotation = +d3.select('#rotation').property('value');
    d3.select('#rotation').node().nextElementSibling.textContent = rotation + '°';

    if (state.selectedElement) {
        state.selectedElement.rotation = rotation;
        saveElementToFrame(state.selectedElement);
        renderAllElements();
        updateSelection();
        saveHistory();
    }
}

// ===== Context Menu =====
function showContextMenu(event, element) {
    hideContextMenu();

    const menu = d3.select('body').append('div')
        .attr('class', 'context-menu')
        .style('left', event.pageX + 'px')
        .style('top', event.pageY + 'px');

    // Fill color option
    if (element.type !== 'line' && element.type !== 'arrow') {
        const fillItem = menu.append('div')
            .attr('class', 'context-menu-item');

        fillItem.append('span')
            .attr('class', 'context-menu-label')
            .text('Fill');

        fillItem.append('input')
            .attr('type', 'color')
            .attr('class', 'context-color-input')
            .attr('value', element.fill || '#6366f1')
            .on('input', function () {
                element.fill = this.value;
                saveElementToFrame(element);
                renderAllElements();
                updateSelection();
                saveHistory();
            });
    }

    // Stroke color option
    const strokeItem = menu.append('div')
        .attr('class', 'context-menu-item');

    strokeItem.append('span')
        .attr('class', 'context-menu-label')
        .text('Stroke');

    strokeItem.append('input')
        .attr('type', 'color')
        .attr('class', 'context-color-input')
        .attr('value', element.stroke || '#1e293b')
        .on('input', function () {
            element.stroke = this.value;
            saveElementToFrame(element);
            renderAllElements();
            updateSelection();
            saveHistory();
        });

    // Stroke width option
    const widthItem = menu.append('div')
        .attr('class', 'context-menu-item');

    widthItem.append('span')
        .attr('class', 'context-menu-label')
        .text('Width');

    const widthInput = widthItem.append('input')
        .attr('type', 'range')
        .attr('class', 'context-range-input')
        .attr('min', '1')
        .attr('max', '10')
        .attr('value', element.strokeWidth || 2)
        .on('input', function () {
            element.strokeWidth = +this.value;
            widthValue.text(this.value);
            saveElementToFrame(element);
            renderAllElements();
            updateSelection();
            saveHistory();
        });

    const widthValue = widthItem.append('span')
        .attr('class', 'context-value')
        .text(element.strokeWidth || 2);

    // Opacity option
    const opacityItem = menu.append('div')
        .attr('class', 'context-menu-item');

    opacityItem.append('span')
        .attr('class', 'context-menu-label')
        .text('Opacity');

    const opacityInput = opacityItem.append('input')
        .attr('type', 'range')
        .attr('class', 'context-range-input')
        .attr('min', '0')
        .attr('max', '100')
        .attr('value', (element.opacity || 1) * 100)
        .on('input', function () {
            element.opacity = +this.value / 100;
            opacityValue.text(this.value + '%');
            saveElementToFrame(element);
            renderAllElements();
            updateSelection();
            saveHistory();
        });

    const opacityValue = opacityItem.append('span')
        .attr('class', 'context-value')
        .text(Math.round((element.opacity || 1) * 100) + '%');

    // Divider
    menu.append('div').attr('class', 'context-menu-divider');

    // Add Label action
    menu.append('div')
        .attr('class', 'context-menu-item context-menu-action')
        .text('Add Label')
        .on('click', function () {
            const text = prompt('Enter label text:', 'Label');
            if (text) {
                let cx, cy;
                if (element.type === 'circle') { cx = element.cx; cy = element.cy; }
                else if (element.type === 'line' || element.type === 'arrow') {
                    cx = (element.x1 + element.x2) / 2; cy = (element.y1 + element.y2) / 2;
                }
                else { cx = element.x + element.width / 2; cy = element.y + element.height / 2; }

                const label = createText(cx, cy);
                label.text = text;
                label.textAlign = 'middle';

                // Create Group
                const group = {
                    id: generateId(),
                    type: 'group',
                    children: [element, label],
                    x: 0, y: 0
                };

                const frameElements = getCurrentFrameElements();
                const idx = frameElements.findIndex(e => e.id === element.id);
                if (idx !== -1) {
                    frameElements[idx] = group;
                    selectElement(group);
                    renderAllElements();
                    saveHistory();
                }
            }
            hideContextMenu();
        });

    // Duplicate action
    menu.append('div')
        .attr('class', 'context-menu-item context-menu-action')
        .text('Duplicate')
        .on('click', function () {
            const newElement = JSON.parse(JSON.stringify(element));
            newElement.id = generateId();
            newElement.x = (newElement.x || 0) + 20;
            newElement.y = (newElement.y || 0) + 20;
            if (newElement.x1 !== undefined) {
                newElement.x1 += 20;
                newElement.y1 += 20;
                newElement.x2 += 20;
                newElement.y2 += 20;
            }
            if (newElement.cx !== undefined) {
                newElement.cx += 20;
                newElement.cy += 20;
            }
            getCurrentFrameElements().push(newElement);
            selectElement(newElement);
            renderAllElements();
            saveHistory();
            hideContextMenu();
        });

    // Delete action
    menu.append('div')
        .attr('class', 'context-menu-item context-menu-action context-menu-danger')
        .text('Delete')
        .on('click', function () {
            const frameElements = getCurrentFrameElements();
            const index = frameElements.findIndex(el => el.id === element.id);
            if (index >= 0) {
                frameElements.splice(index, 1);
                state.selectedElement = null;
                state.selectedElements = [];
                renderAllElements();
                updateSelection();
                saveHistory();
            }
            hideContextMenu();
        });

    // Close menu when clicking outside
    setTimeout(() => {
        d3.select('body').on('click.contextmenu', hideContextMenu);
    }, 10);
}

function hideContextMenu() {
    d3.selectAll('.context-menu').remove();
    d3.select('body').on('click.contextmenu', null);
}


d3.select('#exportBtn').on('click', function () {
    const dataStr = JSON.stringify(state.frames, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'd3form-export.json';
    link.click();
    URL.revokeObjectURL(url);
});

d3.select('#importBtn').on('click', function () {
    document.getElementById('importFile').click();
});

d3.select('#importFile').on('change', function () {
    const file = this.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (e) {
        try {
            const importedFrames = JSON.parse(e.target.result);

            // Validate the imported data
            if (!Array.isArray(importedFrames) || importedFrames.length === 0) {
                alert('Invalid file format. Expected an array of frames.');
                return;
            }

            // Import the frames
            state.frames = importedFrames;
            state.currentFrame = 0;
            state.selectedElements = [];
            state.selectedElement = null;

            renderFramesList();
            renderAllElements();
            updateFrameIndicator();
            saveHistory();

            console.log(`📥 Imported ${importedFrames.length} frame(s)`);
        } catch (err) {
            alert('Error parsing file: ' + err.message);
        }
    };
    reader.readAsText(file);

    // Reset the input so the same file can be imported again
    this.value = '';
});



function applyTemplate(type) {
    const cx = width / 2;
    const cy = height / 2;
    let elements = [];

    // Properties for templates
    const colorprimary = '#6366f1';
    const colorsecondary = '#ec4899';
    const colorneutral = '#cbd5e1';

    switch (type) {
        case 'svg':
            // Basic shapes
            elements = [
                createCircle(cx - 100, cy, cx - 40, cy + 60),
                createRectangle(cx - 20, cy - 30, cx + 40, cy + 30),
                createLine(cx + 60, cy - 30, cx + 120, cy + 30)
            ];
            break;

        case 'bar':
            // Bar chart
            // Axes
            const barStartX = cx - 150;
            const barStartY = cy + 100;
            elements.push({ ...createLine(barStartX, barStartY, barStartX + 300, barStartY), stroke: colorneutral }); // X
            elements.push({ ...createLine(barStartX, barStartY, barStartX, barStartY - 200), stroke: colorneutral }); // Y

            // Bars
            const data = [50, 120, 80, 160, 40];
            const barWidth = 40;
            const gap = 15;

            data.forEach((val, i) => {
                const h = val;
                const x = barStartX + 20 + i * (barWidth + gap);
                const y = barStartY - h;
                elements.push({
                    ...createRectangle(x, y, x + barWidth, barStartY),
                    fill: i % 2 === 0 ? colorprimary : colorsecondary
                });
            });
            break;

        case 'line':
            // Simple line chart using Path
            const lineStartX = cx - 150;
            const lineStartY = cy + 100;
            elements.push({ ...createLine(lineStartX, lineStartY, lineStartX + 300, lineStartY), stroke: colorneutral }); // X
            elements.push({ ...createLine(lineStartX, lineStartY, lineStartX, lineStartY - 200), stroke: colorneutral }); // Y

            // Path data: M 0 0 L 50 -50 L 100 -30 ...
            const lineData = [[0, 0], [50, -50], [100, -30], [150, -120], [200, -80], [250, -150]];
            const d = "M " + lineData.map(p => `${p[0]},${p[1]}`).join(" L ");
            elements.push(createPath(d, lineStartX, lineStartY));

            // Add dots
            lineData.forEach(p => {
                elements.push({
                    ...createCircle(lineStartX + p[0] - 4, lineStartY + p[1] - 4, lineStartX + p[0] + 4, lineStartY + p[1] + 4),
                    fill: '#fff', stroke: colorprimary, strokeWidth: 2
                });
            });
            break;

        case 'scatter':
            // Scatter plot
            const scatStartX = cx - 150;
            const scatStartY = cy + 100;
            elements.push({ ...createLine(scatStartX, scatStartY, scatStartX + 300, scatStartY), stroke: colorneutral }); // X
            elements.push({ ...createLine(scatStartX, scatStartY, scatStartX, scatStartY - 200), stroke: colorneutral }); // Y

            for (let i = 0; i < 15; i++) {
                const rx = Math.random() * 280;
                const ry = Math.random() * -180;
                const r = 4 + Math.random() * 6;
                elements.push({
                    ...createCircle(scatStartX + rx - r, scatStartY + ry - r, scatStartX + rx + r, scatStartY + ry + r),
                    fill: Math.random() > 0.5 ? colorprimary : colorsecondary,
                    opacity: 0.7
                });
            }
            break;

        case 'area':
            // Area chart
            const areaStartX = cx - 150;
            const areaStartY = cy + 100;
            elements.push({ ...createLine(areaStartX, areaStartY, areaStartX + 300, areaStartY), stroke: colorneutral }); // X
            elements.push({ ...createLine(areaStartX, areaStartY, areaStartX, areaStartY - 200), stroke: colorneutral }); // Y

            const areaData = [[0, 0], [50, -50], [100, -30], [150, -120], [200, -80], [250, -150], [300, 0]];
            const ad = "M " + areaData.map(p => `${p[0]},${p[1]}`).join(" L ") + " Z";
            elements.push({ ...createPath(ad, areaStartX, areaStartY), fill: colorprimary, opacity: 0.3, stroke: 'none' });
            // Top line
            const ld = "M " + areaData.slice(0, 6).map(p => `${p[0]},${p[1]}`).join(" L ");
            elements.push({ ...createPath(ld, areaStartX, areaStartY), fill: 'none', stroke: colorprimary, strokeWidth: 2 });
            break;

        case 'pie':
            // Pie chart - manually simplified arcs
            // M 0 0 L 100 0 A 100 100 0 0 1 50 86.6 Z (Example sector)
            // Let's make 3 slices
            // Slice 1: 0 to 120deg
            const p1 = "M 0 0 L 100 0 A 100 100 0 0 1 -50 86.6 Z";
            elements.push({ ...createPath(p1, cx, cy), fill: colorprimary });

            // Slice 2: 120 to 240deg
            const p2 = "M 0 0 L -50 86.6 A 100 100 0 0 1 -50 -86.6 Z";
            elements.push({ ...createPath(p2, cx, cy), fill: colorsecondary });

            // Slice 3: 240 to 360deg
            const p3 = "M 0 0 L -50 -86.6 A 100 100 0 0 1 100 0 Z";
            elements.push({ ...createPath(p3, cx, cy), fill: '#fbbf24' }); // amber
            break;

        case 'hierarchy':
        case 'network':
        case 'axes':
        case 'map':
        default:
            // Placeholder for complex types
            elements.push(createText(cx - 100, cy, `${type.charAt(0).toUpperCase() + type.slice(1)} Template Placeholder`));
            elements.push(createRectangle(cx - 120, cy - 20, cx + 120, cy + 40));
            break;
    }

    // Group them
    if (elements.length > 0) {
        // Add to frame
        const frameElements = getCurrentFrameElements();

        // If multiple elements, group them
        if (elements.length > 1) {
            const group = {
                id: generateId(),
                type: 'group',
                children: elements,
                x: 0, y: 0
            };
            frameElements.push(group);
            // Select the group
            state.selectedElements = [group];
            state.selectedElement = group;
        } else {
            frameElements.push(elements[0]);
            state.selectedElements = [elements[0]];
            state.selectedElement = elements[0];
        }

        renderAllElements();
        updateSelection();
        saveHistory();
    }
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
    if (state.selectedElements.length > 0) {
        // Copy all selected elements to clipboard
        state.clipboard = JSON.parse(JSON.stringify(state.selectedElements));

        // Remove all selected elements from the frame
        const elements = getCurrentFrameElements();
        const idsToRemove = new Set(state.selectedElements.map(el => el.id));

        for (let i = elements.length - 1; i >= 0; i--) {
            if (idsToRemove.has(elements[i].id)) {
                elements.splice(i, 1);
            }
        }

        state.selectedElements = [];
        state.selectedElement = null;
        renderAllElements();
        saveHistory();
    }
}

function copyElement() {
    if (state.selectedElements.length > 0) {
        // Copy all selected elements to clipboard
        state.clipboard = JSON.parse(JSON.stringify(state.selectedElements));
    }
}

function pasteElement() {
    if (state.clipboard) {
        // Handle both single element and array of elements
        const elementsToPaste = Array.isArray(state.clipboard) ? state.clipboard : [state.clipboard];
        const newElements = [];

        elementsToPaste.forEach(clipboardElement => {
            const newElement = JSON.parse(JSON.stringify(clipboardElement));
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
                case 'path':
                    newElement.x += 20;
                    newElement.y += 20;
                    break;
                case 'group':
                    // For groups, recursively update all children IDs
                    newElement.children = newElement.children.map(child => {
                        const newChild = { ...child, id: generateId() };
                        // Apply offset to children too
                        if (newChild.x !== undefined) newChild.x += 20;
                        if (newChild.y !== undefined) newChild.y += 20;
                        if (newChild.cx !== undefined) newChild.cx += 20;
                        if (newChild.cy !== undefined) newChild.cy += 20;
                        if (newChild.x1 !== undefined) {
                            newChild.x1 += 20;
                            newChild.y1 += 20;
                            newChild.x2 += 20;
                            newChild.y2 += 20;
                        }
                        return newChild;
                    });
                    break;
            }

            saveElementToFrame(newElement);
            newElements.push(newElement);
        });

        renderAllElements();

        // Select all newly pasted elements
        state.selectedElements = newElements;
        state.selectedElement = newElements[newElements.length - 1];
        updateSelection();

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
            case 's':
                selectTool('span');
                break;
            case 'r':
                selectTool('rectangle');
                break;
            case 'c':
                selectTool('circle');
                break;
            case 'q':
                selectTool('triangle');
                break;
            case 'd':
                // Only select diamond tool if not using Ctrl (preserve Ctrl+Shift+D for duplicate frame)
                if (!event.ctrlKey && !event.metaKey) {
                    selectTool('diamond');
                }
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
                if (state.selectedElements.length > 0) {
                    const elements = getCurrentFrameElements();
                    const toDelete = new Set(state.selectedElements.map(e => e.id));

                    for (let i = elements.length - 1; i >= 0; i--) {
                        if (toDelete.has(elements[i].id)) {
                            elements.splice(i, 1);
                        }
                    }

                    state.selectedElements = [];
                    state.selectedElement = null;
                    renderAllElements();
                    saveHistory();
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
updateFrameIndicator();
// updateProperties(); // Replaced by logic below

// ===== Property Listeners (Fill/No Fill) =====
d3.select('#noFill').on('change', function () {
    const isChecked = d3.select(this).property('checked');
    if (isChecked) {
        state.properties.fill = 'none';
    } else {
        state.properties.fill = d3.select('#fillColor').property('value');
    }
    applyPropertyUpdate('fill', state.properties.fill);
});

d3.select('#fillColor').on('input', function () {
    d3.select('#noFill').property('checked', false);
    state.properties.fill = this.value;
    applyPropertyUpdate('fill', this.value);
});

// Helper to apply updates
function applyPropertyUpdate(prop, value) {
    if (state.selectedElements.length > 0) {
        state.selectedElements.forEach(el => {
            el[prop] = value;
            saveElementToFrame(el);
        });
        renderAllElements();
        saveHistory();
    }
}

// Re-bind other properties to use the helper if needed, or rely on existing bindings
// Existing bindings are likely anonymous.
// Let's bind stroke color too just in case defaults changed
d3.select('#strokeColor').on('input', function () {
    state.properties.stroke = this.value;
    applyPropertyUpdate('stroke', this.value);
});

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

    menu.style('left', `${x}px`)
        .style('top', `${y}px`)
        .classed('hidden', false);

    // Store element ID for actions
    menu.attr('data-element-id', element.id);

    // Show/hide Connect option based on multi-selection (exactly 2 connectable elements)
    const canConnect = state.selectedElements.length === 2 &&
        state.selectedElements.every(el =>
            el.type !== 'line' && el.type !== 'arrow' && el.type !== 'link'
        );

    console.log(`Context menu: ${state.selectedElements.length} elements selected, canConnect=${canConnect}`);
    d3.select('#ctxConnect').style('display', canConnect ? 'block' : 'none');

    // Show Highlight option only for text elements
    d3.select('.effect-item[data-effect="highlight"]').style('display', element.type === 'text' ? 'block' : 'none');

    // Highlight current hover effect
    const currentEffect = element.hoverEffect || 'none';
    d3.selectAll('.effect-item').classed('active', false);
    d3.select(`.effect-item[data-effect="${currentEffect}"]`).classed('active', true);
}

function hideContextMenu() {
    d3.select('#contextMenu').classed('hidden', true);
}

// Connect two selected elements with a persistent link
function connectSelectedElements() {
    if (state.selectedElements.length !== 2) return;

    const el1 = state.selectedElements[0];
    const el2 = state.selectedElements[1];

    // Get centers
    const center1 = getCenter(el1);
    const center2 = getCenter(el2);

    // Calculate boundary points
    const pt1 = getBoundaryPoint(el1, center2);
    const pt2 = getBoundaryPoint(el2, center1);

    // Create persistent link (separate element, not grouping!)
    const link = {
        id: generateId(),
        type: 'link',
        x1: pt1.x,
        y1: pt1.y,
        x2: pt2.x,
        y2: pt2.y,
        startId: el1.id,
        endId: el2.id,
        stroke: state.properties.stroke,
        strokeWidth: state.properties.strokeWidth,
        opacity: state.properties.opacity
    };

    saveElementToFrame(link);

    // Clear selection so objects can be moved independently
    state.selectedElements = [];
    state.selectedElement = null;

    renderAllElements();
    saveHistory();

    console.log(`🔗 Connected: ${el1.id} ↔ ${el2.id}`);
}

// Context Menu Actions
d3.select('#ctxCopy').on('click', () => {
    copyElement();
    hideContextMenu();
});

d3.select('#ctxPaste').on('click', () => {
    pasteElement();
    hideContextMenu();
});

d3.select('#ctxConnect').on('click', () => {
    connectSelectedElements();
    hideContextMenu();
});

d3.select('#ctxChangeFill').on('click', () => {
    // Trigger the color picker
    d3.select('#fillColor').node().click();
    hideContextMenu();
});

d3.select('#ctxChangeStroke').on('click', () => {
    // Trigger the color picker
    d3.select('#strokeColor').node().click();
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

// Effect item click handlers
d3.selectAll('.effect-item').on('click', function () {
    const effect = d3.select(this).attr('data-effect');
    const id = d3.select('#contextMenu').attr('data-element-id');
    const elements = getCurrentFrameElements();
    const element = elements.find(el => el.id === id);

    if (element) {
        if (effect === 'highlight' && element.type === 'text') {
            // Prompt user to enter the portion of text to highlight
            const highlightText = prompt(
                `Enter the portion of text to highlight (from: "${element.text}"):`,
                element.highlightText || element.text
            );
            if (highlightText !== null) {
                element.hoverEffect = 'highlight';
                element.highlightText = highlightText;
                console.log(`🔦 Set highlight: "${highlightText}" on ${element.id}`);
            }
        } else {
            element.hoverEffect = effect === 'none' ? null : effect;
            element.highlightText = null; // Clear highlight text for other effects
            console.log(`✨ Set hover effect: ${effect} on ${element.id}`);
        }
        saveHistory();
    }

    // Update active state on menu items
    d3.selectAll('.effect-item').classed('active', false);
    d3.select(this).classed('active', true);

    hideContextMenu();
});

// Hide menu on global click
d3.select('body').on('click.contextmenu', () => {
    hideContextMenu();
});

// ===== Hover Effects for Present Mode =====
function applyHoverEffect(element, selection, entering) {
    const effect = element.hoverEffect;
    if (!effect) return;

    const duration = 300;
    const ease = d3.easeCubicOut;
    let cx, cy;

    // Get element center
    if (element.type === 'circle') {
        cx = element.cx;
        cy = element.cy;
    } else if (element.type === 'line' || element.type === 'arrow' || element.type === 'link') {
        cx = (element.x1 + element.x2) / 2;
        cy = (element.y1 + element.y2) / 2;
    } else {
        cx = element.x + (element.width || 0) / 2;
        cy = element.y + (element.height || 0) / 2;
    }

    if (entering) {
        switch (effect) {
            case 'inflate':
                selection.transition().duration(duration).ease(ease)
                    .attr('transform', `translate(${cx}, ${cy}) scale(1.3) translate(${-cx}, ${-cy})`);
                break;
            case 'dissolve':
                selection.transition().duration(duration).ease(ease)
                    .attr('opacity', 0.2)
                    .attr('filter', 'url(#blur-8)');
                break;
            case 'highlight':
                // Text-specific: fade out non-highlighted words
                if (element.type === 'text' && element.highlightText) {
                    applyTextHighlight(selection, element, true, duration);
                }
                break;
        }
    } else {
        // Reset on mouse leave
        selection.interrupt();

        if (effect === 'highlight' && element.type === 'text') {
            applyTextHighlight(selection, element, false, duration);
        } else {
            selection.transition().duration(duration).ease(ease)
                .attr('transform', getTransformString(element, cx, cy))
                .attr('opacity', element.opacity || 1)
                .attr('filter', getBlurFilter(element));
        }
    }
}

// Apply highlight effect to text (fade out non-highlighted words)
function applyTextHighlight(selection, element, entering, duration) {
    // For text groups, find the text element
    let textEl = selection.select('text');
    if (textEl.empty()) {
        // Maybe selection IS the text element
        if (selection.node().tagName === 'text') {
            textEl = selection;
        } else {
            console.log('Highlight: Could not find text element');
            return;
        }
    }

    const fullText = element.text || '';
    const highlightText = element.highlightText || '';

    console.log(`Highlight effect: entering=${entering}, highlight="${highlightText}", fullText="${fullText}"`);

    if (entering) {
        // Split text into highlighted and non-highlighted parts
        const highlightStart = fullText.indexOf(highlightText);
        if (highlightStart === -1) {
            console.log('Highlight text not found in full text');
            return;
        }

        const before = fullText.substring(0, highlightStart);
        const highlighted = highlightText;
        const after = fullText.substring(highlightStart + highlightText.length);

        // Clear and rebuild with tspans
        textEl.text('');

        if (before) {
            textEl.append('tspan')
                .attr('class', 'fade-text')
                .text(before)
                .style('opacity', 1);
        }

        textEl.append('tspan')
            .attr('class', 'highlight-text')
            .text(highlighted)
            .style('opacity', 1)
            .style('font-weight', '700');

        if (after) {
            textEl.append('tspan')
                .attr('class', 'fade-text')
                .text(after)
                .style('opacity', 1);
        }

        // Animate fade-text to low opacity
        if (typeof gsap !== 'undefined') {
            gsap.to(textEl.selectAll('.fade-text').nodes(), {
                opacity: 0.15,
                duration: duration / 1000,
                ease: 'power2.out'
            });
        } else {
            textEl.selectAll('.fade-text')
                .transition()
                .duration(duration)
                .style('opacity', 0.15);
        }
    } else {
        // Restore full text
        if (typeof gsap !== 'undefined') {
            gsap.to(textEl.selectAll('.fade-text').nodes(), {
                opacity: 1,
                duration: duration / 1000,
                ease: 'power2.out',
                onComplete: () => {
                    textEl.text(fullText);
                }
            });
        } else {
            textEl.selectAll('.fade-text')
                .transition()
                .duration(duration)
                .style('opacity', 1)
                .on('end', () => {
                    textEl.text(fullText);
                });
        }
    }
}

function doPulse(selection, cx, cy, count) {
    if (count >= 2) return;
    selection.transition().duration(200).ease(d3.easeSinInOut)
        .attr('transform', `translate(${cx}, ${cy}) scale(1.1) translate(${-cx}, ${-cy})`)
        .transition().duration(200)
        .attr('transform', null)
        .on('end', () => doPulse(selection, cx, cy, count + 1));
}

function renderSelectionBox() {
    let box = d3.select('#selectionBox');
    if (box.empty()) {
        box = svg.append('rect')
            .attr('id', 'selectionBox')
            .attr('class', 'selection-box')
            .style('pointer-events', 'none');
    }

    if (state.selectionBox) {
        box.attr('x', state.selectionBox.x)
            .attr('y', state.selectionBox.y)
            .attr('width', state.selectionBox.width)
            .attr('height', state.selectionBox.height)
            .style('display', 'block');
    } else {
        box.style('display', 'none');
    }
}

function isElementInBox(element, box) {
    let bbox;
    let centerX, centerY;

    // Calculate bounding box and center point based on type
    if (element.type === 'rectangle') {
        bbox = { x: element.x, y: element.y, width: element.width, height: element.height };
        centerX = element.x + element.width / 2;
        centerY = element.y + element.height / 2;
    } else if (element.type === 'text') {
        const len = (element.text || "").length;
        const width = len * (element.fontSize || 16) * 0.6;
        const height = (element.fontSize || 16);
        bbox = { x: element.x, y: element.y - height, width: width, height: height };
        centerX = element.x + width / 2;
        centerY = element.y - height / 2;
    } else if (element.type === 'circle') {
        bbox = { x: element.cx - element.rx, y: element.cy - element.ry, width: element.rx * 2, height: element.ry * 2 };
        centerX = element.cx;
        centerY = element.cy;
    } else if (element.type === 'triangle' || element.type === 'diamond') {
        bbox = { x: element.x, y: element.y, width: element.width, height: element.height };
        centerX = element.x + element.width / 2;
        centerY = element.y + element.height / 2;
    } else if (element.type === 'line' || element.type === 'arrow') {
        bbox = {
            x: Math.min(element.x1, element.x2),
            y: Math.min(element.y1, element.y2),
            width: Math.abs(element.x2 - element.x1),
            height: Math.abs(element.y2 - element.y1)
        };
        centerX = (element.x1 + element.x2) / 2;
        centerY = (element.y1 + element.y2) / 2;
    } else if (element.type === 'path') {
        // For paths, use the position offset as the center
        // This is a simplified approach - ideally we'd calculate the actual path bounds
        centerX = element.x || 0;
        centerY = element.y || 0;
        bbox = { x: centerX - 50, y: centerY - 50, width: 100, height: 100 }; // Rough estimate
    } else if (element.type === 'group') {
        // If ANY child is in box, select group
        return element.children.some(child => isElementInBox(child, box));
    } else {
        return false;
    }

    if (!bbox) return false;

    // Check if center point is inside the selection box (more intuitive for users)
    const centerInBox = (
        centerX >= box.x &&
        centerX <= box.x + box.width &&
        centerY >= box.y &&
        centerY <= box.y + box.height
    );

    // Also check for intersection (at least partial overlap) as fallback
    const hasIntersection = (
        bbox.x < box.x + box.width &&
        bbox.x + bbox.width > box.x &&
        bbox.y < box.y + box.height &&
        bbox.y + bbox.height > box.y
    );

    // Select if center is in box OR if there's significant intersection
    return centerInBox || hasIntersection;
}

function groupSelectedElements() {
    if (state.selectedElements.length < 2) return;

    const elementsToGroup = [...state.selectedElements];
    const frameElements = getCurrentFrameElements();

    // Sort logic to maintain some order? (Optional)

    // Remove individual elements from frame
    elementsToGroup.forEach(el => {
        const idx = frameElements.findIndex(f => f.id === el.id);
        if (idx !== -1) frameElements.splice(idx, 1);
    });

    const groupElement = {
        id: generateId(),
        type: 'group',
        children: elementsToGroup,
        // Calculate abstract position (optional, used for dragging group together if we implemented relative coords)
        x: 0, y: 0
    };

    frameElements.push(groupElement);
    state.selectedElements = [groupElement];
    state.selectedElement = groupElement;

    renderAllElements();
    updateSelection();
    saveHistory();
}

function ungroupSelectedElements() {
    if (state.selectedElements.length !== 1 || state.selectedElements[0].type !== 'group') return;

    const group = state.selectedElements[0];
    const frameElements = getCurrentFrameElements();

    // Remove group
    const idx = frameElements.findIndex(f => f.id === group.id);
    if (idx !== -1) frameElements.splice(idx, 1);

    // Add children back to frame
    group.children.forEach(child => {
        frameElements.push(child);
    });

    state.selectedElements = [...group.children];
    state.selectedElement = group.children[0];

    renderAllElements();
    updateSelection();
    saveHistory();
}

function getHoveredConnector(pos) {
    if (state.selectedElements.length !== 1) return null;

    const element = state.selectedElements[0];
    if (element.type === 'line' || element.type === 'arrow' || element.type === 'link') return null;

    const points = getConnectorPoints(element);
    const threshold = 12; // Slightly larger tolerance for stability

    // Find closest within threshold
    let closest = null;
    let minDist = Infinity;

    for (const point of points) {
        const dist = Math.sqrt(Math.pow(pos.x - point.x, 2) + Math.pow(pos.y - point.y, 2));
        if (dist < threshold && dist < minDist) {
            minDist = dist;
            closest = { point, element };
        }
    }
    return closest;
}

function getCursorForHandle(handle) {
    if (!handle) return 'default';
    if (typeof handle !== 'string') return 'move'; // fallback

    const cursorMap = {
        'nw': 'nw-resize', 'n': 'n-resize', 'ne': 'ne-resize',
        'e': 'e-resize', 'se': 'se-resize', 's': 's-resize',
        'sw': 'sw-resize', 'w': 'w-resize',
        'start': 'move', 'end': 'move'
    };
    return cursorMap[handle] || 'move';
}



