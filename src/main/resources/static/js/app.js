const fileInput = document.getElementById("cadFileInput");
const preview = document.getElementById("preview");
const message = document.getElementById("message");
const unitSelect = document.getElementById("unitSelect");
const toolButtons = Array.from(document.querySelectorAll(".tool-button[data-tool]"));

let svgRoot = null;
let viewport = null;
let measureLayer = null;
let activeTool = "pan";
let points = [];
let tempElement = null;
let realWidth = 1;
let realHeight = 1;
let svgWidth = 1;
let svgHeight = 1;
let transform = { scale: 1, x: 0, y: 0 };
let dragState = null;
let requestSeq = 0;

const unitMap = {
    cm: 0.01,
    m: 1,
    km: 1000
};

fileInput.addEventListener("change", async function () {
    const file = fileInput.files && fileInput.files[0];
    if (!file) {
        requestSeq++;
        clearViewer("파일을 선택해주세요.");
        return;
    }
    await uploadAndPreview(file);
});

toolButtons.forEach(function (button) {
    button.addEventListener("click", function () {
        setActiveTool(button.dataset.tool);
    });
});

document.querySelector("[data-action='reset-view']").addEventListener("click", resetView);
document.querySelector("[data-action='clear-measure']").addEventListener("click", clearMeasures);

async function uploadAndPreview(file) {
    const currentSeq = ++requestSeq;
    clearViewer("변환 중입니다...");

    const formData = new FormData();
    formData.append("file", file);

    try {
        const response = await fetch("/api/cad/preview", {
            method: "POST",
            body: formData
        });
        const data = await response.json();
        if (currentSeq !== requestSeq) return;

        if (!data.success) {
            clearViewer(data.message || "미리보기를 불러오지 못했습니다.", true);
            return;
        }

        renderSvg(data.result);
        setMessage(`${data.result.fileName} 미리보기`);
    } catch (error) {
        if (currentSeq === requestSeq) {
            clearViewer("미리보기 요청 중 오류가 발생했습니다.", true);
        }
    }
}

function renderSvg(result) {
    const bytes = Uint8Array.from(atob(result.base), function (char) {
        return char.charCodeAt(0);
    });
    const svgText = new TextDecoder("utf-8").decode(bytes);

    preview.innerHTML = svgText;
    svgRoot = preview.querySelector("svg");
    if (!svgRoot) {
        clearViewer("변환된 SVG를 읽지 못했습니다.", true);
        return;
    }

    realWidth = Number(result.realWidth) || 1;
    realHeight = Number(result.realHeight) || 1;
    svgWidth = readSvgLength(svgRoot.getAttribute("width")) || realWidth;
    svgHeight = readSvgLength(svgRoot.getAttribute("height")) || realHeight;

    svgRoot.setAttribute("width", "100%");
    svgRoot.setAttribute("height", "100%");
    svgRoot.setAttribute("preserveAspectRatio", "xMidYMid meet");

    viewport = ensureViewport(svgRoot);
    measureLayer = document.createElementNS("http://www.w3.org/2000/svg", "g");
    measureLayer.setAttribute("id", "measureLayer");
    svgRoot.appendChild(measureLayer);

    points = [];
    tempElement = null;
    setActiveTool("pan");
    resetView();
    bindSvgEvents();
}

function ensureViewport(svg) {
    let group = svg.querySelector("#viewPort");
    if (group) return group;

    group = document.createElementNS("http://www.w3.org/2000/svg", "g");
    group.setAttribute("id", "viewPort");
    Array.from(svg.childNodes).forEach(function (child) {
        if (child !== group && child.nodeType === Node.ELEMENT_NODE) {
            group.appendChild(child);
        }
    });
    svg.appendChild(group);
    return group;
}

function bindSvgEvents() {
    svgRoot.addEventListener("wheel", onWheel, { passive: false });
    svgRoot.addEventListener("pointerdown", onPointerDown);
    svgRoot.addEventListener("pointermove", onPointerMove);
    svgRoot.addEventListener("pointerup", onPointerUp);
    svgRoot.addEventListener("pointerleave", onPointerUp);
    svgRoot.addEventListener("contextmenu", function (event) {
        event.preventDefault();
    });
}

function onWheel(event) {
    if (!svgRoot || !viewport) return;
    event.preventDefault();
    const before = clientToSvgPoint(event.clientX, event.clientY);
    const nextScale = clamp(transform.scale * (event.deltaY < 0 ? 1.12 : 0.88), 0.2, 50);
    transform.scale = nextScale;
    applyTransform();
    const after = clientToSvgPoint(event.clientX, event.clientY);
    transform.x += (after.x - before.x) * transform.scale;
    transform.y += (after.y - before.y) * transform.scale;
    applyTransform();
}

function onPointerDown(event) {
    if (!svgRoot || !viewport) return;
    if (activeTool !== "pan") {
        handleMeasureClick(event);
        return;
    }
    dragState = {
        startX: event.clientX,
        startY: event.clientY,
        originX: transform.x,
        originY: transform.y
    };
    svgRoot.classList.add("dragging");
    svgRoot.setPointerCapture(event.pointerId);
}

function onPointerMove(event) {
    if (!svgRoot || !viewport) return;
    if (dragState) {
        transform.x = dragState.originX + event.clientX - dragState.startX;
        transform.y = dragState.originY + event.clientY - dragState.startY;
        applyTransform();
        return;
    }
    updateTempMeasure(event);
}

function onPointerUp(event) {
    if (!svgRoot || !dragState) return;
    dragState = null;
    svgRoot.classList.remove("dragging");
    try {
        svgRoot.releasePointerCapture(event.pointerId);
    } catch (ignored) {
    }
}

function handleMeasureClick(event) {
    const point = clientToSvgPoint(event.clientX, event.clientY);
    if (activeTool === "distance") {
        points.push(point);
        if (points.length === 1) {
            tempElement = addLine(point, point, true);
        } else {
            const start = points[0];
            const end = points[1];
            tempElement.setAttribute("x2", end.x);
            tempElement.setAttribute("y2", end.y);
            addDistanceText(start, end);
            points = [];
            tempElement = null;
        }
        return;
    }

    if (activeTool === "area") {
        if (points.length > 2 && distance(point, points[0]) < getSnapDistance()) {
            finishArea();
            return;
        }
        points.push(point);
        updateAreaPolygon();
    }
}

function updateTempMeasure(event) {
    if (activeTool === "distance" && points.length === 1 && tempElement) {
        const point = clientToSvgPoint(event.clientX, event.clientY);
        tempElement.setAttribute("x2", point.x);
        tempElement.setAttribute("y2", point.y);
    }
    if (activeTool === "area" && points.length > 0 && tempElement) {
        const point = clientToSvgPoint(event.clientX, event.clientY);
        const allPoints = points.concat([point]);
        tempElement.setAttribute("points", allPoints.map(toPointString).join(" "));
    }
}

function updateAreaPolygon() {
    if (!tempElement) {
        tempElement = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
        tempElement.setAttribute("fill", "rgba(0, 180, 216, 0.15)");
        tempElement.setAttribute("stroke", "#d92323");
        tempElement.setAttribute("stroke-dasharray", "5 5");
        tempElement.setAttribute("stroke-width", getStrokeWidth());
        measureLayer.appendChild(tempElement);
    }
    tempElement.setAttribute("points", points.map(toPointString).join(" "));
}

function finishArea() {
    const closedPoints = points.slice();
    const area = calculateCadArea(closedPoints);
    const box = tempElement.getBBox();
    tempElement.setAttribute("fill", "rgba(0, 180, 216, 0.24)");
    tempElement.setAttribute("stroke", "rgba(0, 180, 216, 0.8)");
    tempElement.setAttribute("stroke-dasharray", "");
    addText(formatArea(area), box.x + box.width / 2, box.y + box.height / 2);
    points = [];
    tempElement = null;
}

function addDistanceText(start, end) {
    const dx = (end.x - start.x) / getSvgUnitsPerCadX();
    const dy = (end.y - start.y) / getSvgUnitsPerCadY();
    const value = Math.sqrt(dx * dx + dy * dy) / unitMap[unitSelect.value];
    addText(`${value.toFixed(2)}${unitSelect.value}`, (start.x + end.x) / 2, (start.y + end.y) / 2);
}

function calculateCadArea(inputPoints) {
    let area = 0;
    const cadPoints = inputPoints.map(function (point) {
        return {
            x: point.x / getSvgUnitsPerCadX(),
            y: point.y / getSvgUnitsPerCadY()
        };
    });
    for (let i = 0; i < cadPoints.length; i++) {
        const current = cadPoints[i];
        const next = cadPoints[(i + 1) % cadPoints.length];
        area += current.x * next.y - next.x * current.y;
    }
    return Math.abs(area / 2) / Math.pow(unitMap[unitSelect.value], 2);
}

function formatArea(value) {
    const unit = unitSelect.value;
    const fixed = unit === "cm" ? 2 : unit === "m" ? 3 : 6;
    const label = unit === "cm" ? "cm²" : unit === "km" ? "km²" : "m²";
    return `${value.toFixed(fixed)}${label}`;
}

function addLine(start, end, temp) {
    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line.setAttribute("x1", start.x);
    line.setAttribute("y1", start.y);
    line.setAttribute("x2", end.x);
    line.setAttribute("y2", end.y);
    line.setAttribute("stroke", "#d92323");
    line.setAttribute("stroke-width", getStrokeWidth());
    if (temp) line.setAttribute("stroke-dasharray", "5 5");
    measureLayer.appendChild(line);
    return line;
}

function addText(text, x, y) {
    const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
    label.textContent = text;
    label.setAttribute("x", x);
    label.setAttribute("y", y);
    label.setAttribute("fill", "#d92323");
    label.setAttribute("font-size", getFontSize());
    label.setAttribute("font-weight", "700");
    label.setAttribute("text-anchor", "middle");
    label.setAttribute("paint-order", "stroke");
    label.setAttribute("stroke", "#ffffff");
    label.setAttribute("stroke-width", getStrokeWidth() * 2);
    measureLayer.appendChild(label);
}

function clientToSvgPoint(clientX, clientY) {
    const point = svgRoot.createSVGPoint();
    point.x = clientX;
    point.y = clientY;
    const matrixTarget = viewport || svgRoot;
    return point.matrixTransform(matrixTarget.getScreenCTM().inverse());
}

function resetView() {
    if (!viewport) return;
    transform = { scale: 1, x: 0, y: 0 };
    applyTransform();
}

function clearMeasures() {
    if (!measureLayer) return;
    measureLayer.innerHTML = "";
    points = [];
    tempElement = null;
}

function setActiveTool(tool) {
    activeTool = tool;
    points = [];
    if (tempElement) {
        tempElement.remove();
        tempElement = null;
    }
    toolButtons.forEach(function (button) {
        button.classList.toggle("active", button.dataset.tool === tool);
    });
    preview.classList.toggle("measuring", tool !== "pan");
}

function applyTransform() {
    if (!viewport) return;
    viewport.setAttribute("transform", `translate(${transform.x} ${transform.y}) scale(${transform.scale})`);
    if (measureLayer) {
        measureLayer.setAttribute("transform", `translate(${transform.x} ${transform.y}) scale(${transform.scale})`);
    }
}

function clearViewer(text, isError) {
    preview.innerHTML = "";
    svgRoot = null;
    viewport = null;
    measureLayer = null;
    points = [];
    tempElement = null;
    setMessage(text, isError);
}

function setMessage(text, isError) {
    message.textContent = text;
    message.classList.toggle("error", Boolean(isError));
}

function readSvgLength(value) {
    if (!value) return 0;
    return Number(String(value).replace(/[^0-9.]/g, ""));
}

function getSvgUnitsPerCadX() {
    return svgWidth / realWidth;
}

function getSvgUnitsPerCadY() {
    return svgHeight / realHeight;
}

function getStrokeWidth() {
    return Math.max(Math.max(svgWidth, svgHeight) / 7000, 1);
}

function getFontSize() {
    return Math.max(Math.max(svgWidth, svgHeight) / 550, 12);
}

function getSnapDistance() {
    return Math.max(Math.max(svgWidth, svgHeight) / 1000, 3);
}

function toPointString(point) {
    return `${point.x},${point.y}`;
}

function distance(a, b) {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return Math.sqrt(dx * dx + dy * dy);
}

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

setActiveTool("pan");