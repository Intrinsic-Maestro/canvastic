import { useEffect, useRef } from "react";

const GRID_SPACING = 25;
const MIN_ZOOM = 0.2;
const MAX_ZOOM = 4;
const ZOOM_SPEED = 0.0015;

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function getMidpoint(a, b) {
  return {
    x: (a.x + b.x) * 0.5,
    y: (a.y + b.y) * 0.5,
  };
}

function screenToWorld(x, y, camera) {
  return {
    x: (x - camera.x) / camera.zoom,
    y: (y - camera.y) / camera.zoom,
  };
}

function drawSmoothStroke(ctx, stroke) {
  const { points, color, width } = stroke;
  if (!points.length) {
    return;
  }

  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  if (points.length === 1) {
    const point = points[0];
    const radius = Math.max((width * point.pressure) / 2, 0.5);
    ctx.beginPath();
    ctx.arc(point.x, point.y, radius, 0, Math.PI * 2);
    ctx.fill();
    return;
  }

  // Quadratic smoothing: each segment targets the midpoint between points
  // so the path flows through the stroke instead of forming jagged corners.
  for (let i = 1; i < points.length - 1; i += 1) {
    const previous = points[i - 1];
    const current = points[i];
    const next = points[i + 1];
    const start = getMidpoint(previous, current);
    const end = getMidpoint(current, next);
    ctx.lineWidth = Math.max(width * current.pressure, 0.5);
    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    ctx.quadraticCurveTo(current.x, current.y, end.x, end.y);
    ctx.stroke();
  }

  const last = points[points.length - 1];
  const previous = points[points.length - 2];
  ctx.lineWidth = Math.max(width * last.pressure, 0.5);
  ctx.beginPath();
  ctx.moveTo(previous.x, previous.y);
  ctx.quadraticCurveTo(previous.x, previous.y, last.x, last.y);
  ctx.stroke();
}

function drawDotGrid(ctx, width, height, camera) {
  const worldTopLeft = screenToWorld(0, 0, camera);
  const worldBottomRight = screenToWorld(width, height, camera);

  const startX = Math.floor(worldTopLeft.x / GRID_SPACING) * GRID_SPACING;
  const endX = Math.ceil(worldBottomRight.x / GRID_SPACING) * GRID_SPACING;
  const startY = Math.floor(worldTopLeft.y / GRID_SPACING) * GRID_SPACING;
  const endY = Math.ceil(worldBottomRight.y / GRID_SPACING) * GRID_SPACING;

  const dotRadius = clamp(camera.zoom * 0.9, 0.5, 1.4);

  ctx.save();
  ctx.fillStyle = "rgba(17, 24, 39, 0.18)";

  for (let x = startX; x <= endX; x += GRID_SPACING) {
    for (let y = startY; y <= endY; y += GRID_SPACING) {
      const screenX = x * camera.zoom + camera.x;
      const screenY = y * camera.zoom + camera.y;
      ctx.beginPath();
      ctx.arc(screenX, screenY, dotRadius, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.restore();
}

export default function Canvas({
  color,
  width,
  isPanMode,
  onTogglePanMode,
}) {
  const canvasRef = useRef(null);
  const animationFrameRef = useRef(0);
  const pointerStateRef = useRef({
    activePointerId: null,
    isDrawing: false,
    isPanning: false,
    lastScreenX: 0,
    lastScreenY: 0,
  });
  const settingsRef = useRef({ color, width, isPanMode });
  const cameraRef = useRef({
    x: typeof window !== "undefined" ? window.innerWidth / 2 : 0,
    y: typeof window !== "undefined" ? window.innerHeight / 2 : 0,
    zoom: 1,
  });
  const strokesRef = useRef([]);
  const activeStrokeRef = useRef(null);

  useEffect(() => {
    settingsRef.current = { color, width, isPanMode };
  }, [color, width, isPanMode]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.repeat) {
        return;
      }

      if (event.key.toLowerCase() === "d") {
        onTogglePanMode((current) => !current);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onTogglePanMode]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    const resizeCanvas = () => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.floor(window.innerWidth * dpr);
      canvas.height = Math.floor(window.innerHeight * dpr);
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const render = () => {
      const { innerWidth, innerHeight } = window;
      ctx.clearRect(0, 0, innerWidth, innerHeight);
      ctx.fillStyle = "#f8fafc";
      ctx.fillRect(0, 0, innerWidth, innerHeight);

      drawDotGrid(ctx, innerWidth, innerHeight, cameraRef.current);

      // Camera transform maps world-space strokes onto the screen every frame.
      ctx.save();
      ctx.translate(cameraRef.current.x, cameraRef.current.y);
      ctx.scale(cameraRef.current.zoom, cameraRef.current.zoom);

      for (const stroke of strokesRef.current) {
        drawSmoothStroke(ctx, stroke);
      }

      ctx.restore();
      animationFrameRef.current = window.requestAnimationFrame(render);
    };

    resizeCanvas();
    render();

    window.addEventListener("resize", resizeCanvas);
    return () => {
      window.removeEventListener("resize", resizeCanvas);
      window.cancelAnimationFrame(animationFrameRef.current);
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;

    const updateCursor = () => {
      const pointerState = pointerStateRef.current;
      canvas.style.cursor = settingsRef.current.isPanMode
        ? pointerState.isPanning
          ? "grabbing"
          : "grab"
        : "crosshair";
    };

    const handlePointerDown = (event) => {
      if (pointerStateRef.current.activePointerId !== null) {
        return;
      }

      canvas.setPointerCapture(event.pointerId);
      pointerStateRef.current.activePointerId = event.pointerId;
      pointerStateRef.current.lastScreenX = event.clientX;
      pointerStateRef.current.lastScreenY = event.clientY;

      if (settingsRef.current.isPanMode) {
        pointerStateRef.current.isPanning = true;
        updateCursor();
        return;
      }

      const worldPoint = screenToWorld(
        event.clientX,
        event.clientY,
        cameraRef.current,
      );

      const stroke = {
        color: settingsRef.current.color,
        width: settingsRef.current.width,
        points: [
          {
            x: worldPoint.x,
            y: worldPoint.y,
            pressure: event.pressure || 0.5,
          },
        ],
      };

      activeStrokeRef.current = stroke;
      strokesRef.current.push(stroke);
      pointerStateRef.current.isDrawing = true;
    };

    const handlePointerMove = (event) => {
      if (pointerStateRef.current.activePointerId !== event.pointerId) {
        return;
      }

      if (pointerStateRef.current.isPanning) {
        const dx = event.clientX - pointerStateRef.current.lastScreenX;
        const dy = event.clientY - pointerStateRef.current.lastScreenY;
        cameraRef.current.x += dx;
        cameraRef.current.y += dy;
        pointerStateRef.current.lastScreenX = event.clientX;
        pointerStateRef.current.lastScreenY = event.clientY;
        return;
      }

      if (!pointerStateRef.current.isDrawing || !activeStrokeRef.current) {
        return;
      }

      const worldPoint = screenToWorld(
        event.clientX,
        event.clientY,
        cameraRef.current,
      );

      const points = activeStrokeRef.current.points;
      const previous = points[points.length - 1];
      const dx = worldPoint.x - previous.x;
      const dy = worldPoint.y - previous.y;

      if (dx * dx + dy * dy < 0.25) {
        return;
      }

      points.push({
        x: worldPoint.x,
        y: worldPoint.y,
        pressure: event.pressure || previous.pressure || 0.5,
      });
    };

    const finishPointer = (event) => {
      if (pointerStateRef.current.activePointerId !== event.pointerId) {
        return;
      }

      if (canvas.hasPointerCapture(event.pointerId)) {
        canvas.releasePointerCapture(event.pointerId);
      }

      pointerStateRef.current.activePointerId = null;
      pointerStateRef.current.isDrawing = false;
      pointerStateRef.current.isPanning = false;
      activeStrokeRef.current = null;
      updateCursor();
    };

    const handleWheel = (event) => {
      event.preventDefault();

      const camera = cameraRef.current;
      const worldBeforeZoom = screenToWorld(event.clientX, event.clientY, camera);
      const nextZoom = clamp(
        camera.zoom * Math.exp(-event.deltaY * ZOOM_SPEED),
        MIN_ZOOM,
        MAX_ZOOM,
      );

      camera.zoom = nextZoom;
      camera.x = event.clientX - worldBeforeZoom.x * nextZoom;
      camera.y = event.clientY - worldBeforeZoom.y * nextZoom;
    };

    updateCursor();
    canvas.addEventListener("pointerdown", handlePointerDown);
    canvas.addEventListener("pointermove", handlePointerMove);
    canvas.addEventListener("pointerup", finishPointer);
    canvas.addEventListener("pointercancel", finishPointer);
    canvas.addEventListener("wheel", handleWheel, { passive: false });

    return () => {
      canvas.removeEventListener("pointerdown", handlePointerDown);
      canvas.removeEventListener("pointermove", handlePointerMove);
      canvas.removeEventListener("pointerup", finishPointer);
      canvas.removeEventListener("pointercancel", finishPointer);
      canvas.removeEventListener("wheel", handleWheel);
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    canvas.style.cursor = isPanMode ? "grab" : "crosshair";
  }, [isPanMode]);

  return <canvas ref={canvasRef} className="board-canvas" />;
}
