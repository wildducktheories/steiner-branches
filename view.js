// Steiner Branches Visualization

const canvas = document.getElementById('lattice');
const ctx = canvas.getContext('2d');

// Configuration
const CONFIG = {
  cellSize: 60,
  pointRadius: 4,
  colors: {
    background: '#1a1a1a',
    grid: '#333',
    branchA: '#4a9eff',
    branchB: '#ff6b6b',
    endpoint: '#4eff9e',
    connection: '#666',
    text: '#e0e0e0',
    gray: '#555'
  },
  padding: 50
};

// State
let latticeData = [];
let connections = [];
let hoveredPoint = null;
let selectedValue = null;
let useLogScale = false;
let showBoundaries = true; // Show circuit boundary lines
let trajectoryValues = new Set(); // Global trajectory values
let trajectorySequence = []; // Global trajectory sequence
let currentPoint = null; // Current lattice point
let currentCircuitValue = null; // C value of current circuit

/**
 * Initialize visualization with given parameters
 */
function initialize(startValue) {
  if (!startValue) {
    latticeData = [];
    connections = [];
    trajectoryValues = new Set();
    render();
    return;
  }

  // First, compute trajectory to determine what points we need
  // Use shorter trajectory for large values to avoid performance issues
  const trajectory = SteinerBranches.trajectory(startValue, 150);

  // console.log('Trajectory:', trajectory.map(s => `${s.value} (${s.isOdd ? 'odd' : 'even'}${s.isEndpoint ? ', endpoint' : ''})`));

  // Find all (n,x) pairs from trajectory values
  const requiredPoints = new Set();
  let maxN = 0;
  let maxX = 0;

  // Build lattice data directly from trajectory points only (don't generate full lattice)
  latticeData = [];

  for (const step of trajectory) {
    if (step.isOdd) {
      // Try to find branch representation
      const branch = SteinerBranches.findBranch(step.value);
      if (branch) {
        // Add only this specific point to lattice
        const aVal = SteinerBranches.A(branch.n, branch.x);
        const bVal = SteinerBranches.B(branch.n, branch.x);
        const cVal = SteinerBranches.C(branch.n, branch.x);

        // Only add the point that matches the branch
        if (branch.branch === 'A' && aVal !== null) {
          latticeData.push({
            n: branch.n,
            x: branch.x,
            value: aVal,
            branch: 'A',
            endpoint: cVal
          });
        } else if (branch.branch === 'B') {
          latticeData.push({
            n: branch.n,
            x: branch.x,
            value: bVal,
            branch: 'B',
            endpoint: cVal
          });
        }

        maxN = Math.max(maxN, branch.n);
        maxX = Math.max(maxX, branch.x);
      } else {
        console.warn(`No branch found for odd value ${step.value}`);
      }
    } else if (step.isEndpoint && step.endpointParams) {
      // Include C(n,x) endpoints
      maxN = Math.max(maxN, step.endpointParams.n);
      maxX = Math.max(maxX, step.endpointParams.x);
    }
  }

  // Add some padding to the lattice bounds for canvas size
  maxN = Math.max(maxN + 2, 5);
  maxX = Math.max(maxX + 2, 5);

  // Don't add C(n,x) points to lattice - they won't be rendered
  // C values will still appear in tooltips

  // Set canvas size (n on x-axis, x on y-axis)
  canvas.width = (maxN + 2) * CONFIG.cellSize + 2 * CONFIG.padding;

  if (useLogScale) {
    // Fixed height for log scale
    canvas.height = 600 + 2 * CONFIG.padding;
  } else {
    canvas.height = (maxX + 2) * CONFIG.cellSize + 2 * CONFIG.padding;
  }

  // Compute connections
  computeConnections(startValue);

  render();
}

/**
 * Compute Collatz connections from a starting value
 */
function computeConnections(startValue) {
  connections = [];
  trajectoryValues = new Set(); // Reset global trajectory values
  trajectorySequence = []; // Reset trajectory sequence
  selectedValue = BigInt(startValue);

  const trajectory = SteinerBranches.trajectory(startValue, 150);

  // Store trajectory sequence
  trajectorySequence = trajectory;

  // Collect all values in trajectory that should be colored
  for (let i = 0; i < trajectory.length; i++) {
    const step = trajectory[i];
    // Include odd terms and endpoints (even values that are recognized C(n,x))
    if (step.isOdd || (step.isEndpoint && step.endpointParams)) {
      trajectoryValues.add(step.value.toString()); // Use string for Set comparison
    }
  }

  // Initialize current point to the first odd value in trajectory
  for (const step of trajectory) {
    if (step.isOdd) {
      const matchingPoints = latticeData.filter(p => p.value === step.value);
      if (matchingPoints.length > 0) {
        currentPoint = matchingPoints[0];
        currentCircuitValue = SteinerBranches.C(currentPoint.n, currentPoint.x);
        break;
      }
    }
  }

  // Create connections for visualization
  for (let i = 0; i < trajectory.length - 1; i++) {
    const from = trajectory[i];
    const to = trajectory[i + 1];

    // Show connections:
    // 1. From odd terms to C(n,x) endpoints
    // 2. From C(n,x) endpoints to next odd term
    const fromValid = from.isOdd || (from.isEndpoint && from.endpointParams);
    const toValid = to.isOdd || (to.isEndpoint && to.endpointParams);

    if (fromValid && toValid) {
      connections.push({
        from: from.value,
        to: to.value,
        step: i
      });
    }
  }

}

/**
 * Convert (n,x) lattice coordinates to screen coordinates
 * n is on x-axis, x is on y-axis (possibly log scale)
 */
function latticeToScreen(n, x) {
  const screenX = CONFIG.padding + n * CONFIG.cellSize;

  let screenY;
  if (useLogScale && x > 0) {
    // Log base 3 scale for y-axis
    const logX = Math.log(x + 1) / Math.log(3);  // log3(x+1) to handle x=0
    const maxX = Math.max(...latticeData.map(p => p.x));
    const maxLogX = Math.log(maxX + 1) / Math.log(3);
    const normalizedY = maxLogX > 0 ? logX / maxLogX : 0;
    const maxScreenY = canvas.height - 2 * CONFIG.padding;
    screenY = canvas.height - CONFIG.padding - normalizedY * maxScreenY;
  } else {
    // Linear scale
    screenY = canvas.height - CONFIG.padding - x * CONFIG.cellSize;
  }

  return { x: screenX, y: screenY };
}

/**
 * Convert screen coordinates to lattice coordinates
 * n is on x-axis, x is on y-axis
 */
function screenToLattice(screenX, screenY) {
  const n = Math.round((screenX - CONFIG.padding) / CONFIG.cellSize);

  let x;
  if (useLogScale) {
    // Inverse of log base 3 scale
    const maxX = Math.max(...latticeData.map(p => p.x));
    const maxLogX = Math.log(maxX + 1) / Math.log(3);
    const maxScreenY = canvas.height - 2 * CONFIG.padding;
    const normalizedY = (canvas.height - screenY - CONFIG.padding) / maxScreenY;
    const logX = normalizedY * maxLogX;
    x = Math.round(Math.pow(3, logX) - 1);
  } else {
    x = Math.round((canvas.height - screenY - CONFIG.padding) / CONFIG.cellSize);
  }

  return { n, x };
}

/**
 * Find lattice point near screen coordinates
 */
function findPointAt(screenX, screenY, threshold = 15) {
  for (const point of latticeData) {
    // Only consider points that are in the trajectory
    const inTrajectory = trajectoryValues.has(point.value.toString());
    if (!inTrajectory) {
      continue;
    }

    const screen = latticeToScreen(point.n, point.x);

    // Apply same offset as in drawing
    let offsetX = 0;
    let offsetY = 0;

    if (point.branch === 'A') {
      offsetX = -4; // top left
      offsetY = -4;
    } else if (point.branch === 'B') {
      offsetX = -4; // bottom left
      offsetY = 4;
    } else if (point.branch === 'C') {
      offsetX = 4;  // middle right
      offsetY = 0;
    }

    const drawX = screen.x + offsetX;
    const drawY = screen.y + offsetY;

    const dist = Math.sqrt((drawX - screenX) ** 2 + (drawY - screenY) ** 2);
    if (dist < threshold) {
      return point;
    }
  }
  return null;
}

/**
 * Main render function
 */
function render() {
  // Clear canvas
  ctx.fillStyle = CONFIG.colors.background;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Draw grid
  drawGrid();

  // Draw circuit boundaries (green lines between different circuits)
  if (showBoundaries) {
    drawCircuitBoundaries();
  }

  // Draw connections
  drawConnections();

  // Draw lattice points
  drawLatticePoints();

  // Draw axes labels
  drawLabels();

  // Draw hover tooltip
  if (hoveredPoint) {
    drawTooltip(hoveredPoint);
  }
}

/**
 * Draw background grid
 */
function drawGrid() {
  const maxN = Math.max(...latticeData.map(p => p.n));
  const maxX = Math.max(...latticeData.map(p => p.x));

  ctx.strokeStyle = CONFIG.colors.grid;
  ctx.lineWidth = 0.5;

  // Vertical lines (constant n)
  for (let n = 0; n <= maxN + 1; n++) {
    const screen = latticeToScreen(n, 0);
    ctx.beginPath();
    ctx.moveTo(screen.x, CONFIG.padding);
    ctx.lineTo(screen.x, canvas.height - CONFIG.padding);
    ctx.stroke();
  }

  // Horizontal lines (constant x)
  if (useLogScale) {
    // Draw grid lines at powers of 3
    const maxLog3 = Math.log(maxX + 1) / Math.log(3);
    for (let i = 0; i <= maxLog3; i++) {
      const x = Math.pow(3, i) - 1;
      if (x <= maxX) {
        const screen = latticeToScreen(0, x);
        ctx.beginPath();
        ctx.moveTo(CONFIG.padding, screen.y);
        ctx.lineTo(canvas.width - CONFIG.padding, screen.y);
        ctx.stroke();
      }
    }
  } else {
    for (let x = 0; x <= maxX + 1; x++) {
      const screen = latticeToScreen(0, x);
      ctx.beginPath();
      ctx.moveTo(CONFIG.padding, screen.y);
      ctx.lineTo(canvas.width - CONFIG.padding, screen.y);
      ctx.stroke();
    }
  }
}

/**
 * Draw circuit boundaries - green lines between consecutive values with different C values
 */
function drawCircuitBoundaries() {
  if (trajectorySequence.length === 0) return;

  // Extract values that have lattice representations (odd values)
  const plottedSteps = trajectorySequence.filter(step => step.isOdd);

  // console.log('=== Circuit Boundaries Debug ===');
  // console.log(`Total odd steps: ${plottedSteps.length}`);
  // console.log('Odd values:', plottedSteps.map(s => s.value.toString()));

  if (plottedSteps.length < 2) return;

  // Check consecutive plotted values in the trajectory
  for (let i = 0; i < plottedSteps.length - 1; i++) {
    const step1 = plottedSteps[i];
    const step2 = plottedSteps[i + 1];

    // console.log(`\nChecking pair ${i}: ${step1.value} -> ${step2.value}`);

    // Get the circuit values for these steps
    const branch1 = SteinerBranches.findBranch(step1.value);
    const branch2 = SteinerBranches.findBranch(step2.value);

    // console.log(`  branch1: ${branch1 ? `${branch1.branch}(${branch1.n},${branch1.x})` : 'null'}`);
    // console.log(`  branch2: ${branch2 ? `${branch2.branch}(${branch2.n},${branch2.x})` : 'null'}`);

    if (!branch1 || !branch2) {
      // console.log(`  Skipping: branch not found`);
      continue;
    }

    const c1 = SteinerBranches.C(branch1.n, branch1.x);
    const c2 = SteinerBranches.C(branch2.n, branch2.x);

    // console.log(`  C1 = ${c1}, C2 = ${c2}`);

    // Only draw if they have different circuits OR if step2 is the final value 1
    const isFinalValue = step2.value === 1n;
    if (c1 === c2 && !isFinalValue) {
      // console.log(`  Skipping: same circuit`);
      continue;
    }

    // if (isFinalValue && c1 === c2) {
    //   console.log(`  Drawing boundary line to final value 1 (special case)`);
    // }

    // console.log(`  Different circuits! Drawing green line`);

    // A boundary line should be highlighted only if it's an EXIT from the current circuit
    // step1 happens before step2 in trajectory, so exit means c1 === current (leaving current)
    const isCurrentCircuitExit = currentCircuitValue !== null && c1 === currentCircuitValue;

    // console.log(`  Current circuit: ${currentCircuitValue}, is exit: ${isCurrentCircuitExit}`);

    // Set style based on whether this is a current circuit boundary
    if (isCurrentCircuitExit) {
      ctx.strokeStyle = '#6fffbf'; // Brighter green for current circuit boundary
      ctx.lineWidth = 4; // Thicker line
    } else {
      ctx.strokeStyle = CONFIG.colors.endpoint; // Normal green
      ctx.lineWidth = 2;
    }
    ctx.setLineDash([5, 5]); // Dashed line for circuit boundaries

    // Find the specific lattice points
    const point1 = latticeData.find(p =>
      p.value === step1.value &&
      p.branch === branch1.branch &&
      p.n === branch1.n &&
      p.x === branch1.x
    );

    const point2 = latticeData.find(p =>
      p.value === step2.value &&
      p.branch === branch2.branch &&
      p.n === branch2.n &&
      p.x === branch2.x
    );

    // console.log(`  point1 found: ${!!point1}, point2 found: ${!!point2}`);

    if (!point1 || !point2) {
      // console.log(`  Skipping: lattice point not found`);
      continue;
    }

    // Get positions and apply offsets
    const pos1 = latticeToScreen(point1.n, point1.x);
    const pos2 = latticeToScreen(point2.n, point2.x);

    // Apply same offsets as the rendered circles
    let offset1X = 0, offset1Y = 0;
    if (point1.branch === 'A') {
      offset1X = -4; offset1Y = -4; // top left
    } else if (point1.branch === 'B') {
      offset1X = -4; offset1Y = 4; // bottom left
    } else if (point1.branch === 'C') {
      offset1X = 4; offset1Y = 0; // middle right
    }

    let offset2X = 0, offset2Y = 0;
    if (point2.branch === 'A') {
      offset2X = -4; offset2Y = -4; // top left
    } else if (point2.branch === 'B') {
      offset2X = -4; offset2Y = 4; // bottom left
    } else if (point2.branch === 'C') {
      offset2X = 4; offset2Y = 0; // middle right
    }

    const fromX = pos1.x + offset1X;
    const fromY = pos1.y + offset1Y;
    const toX = pos2.x + offset2X;
    const toY = pos2.y + offset2Y;

    ctx.beginPath();
    ctx.moveTo(fromX, fromY);
    ctx.lineTo(toX, toY);
    ctx.stroke();

    // Draw arrow with same color as line
    const arrowColor = isCurrentCircuitExit ? '#6fffbf' : CONFIG.colors.endpoint;
    drawArrow(fromX, fromY, toX, toY, arrowColor);
  }

  // Reset dash pattern and line width
  ctx.setLineDash([]);
  ctx.lineWidth = 1;
}

/**
 * Draw Collatz connections
 */
function drawConnections() {
  for (const conn of connections) {
    // Find lattice points for from and to values
    const fromPoints = latticeData.filter(p => p.value === conn.from);
    const toPoints = latticeData.filter(p => p.value === conn.to);

    // Draw connection from each matching point
    for (const fromPt of fromPoints) {
      for (const toPt of toPoints) {
        const from = latticeToScreen(fromPt.n, fromPt.x);
        const to = latticeToScreen(toPt.n, toPt.x);

        // Apply same offsets as the rendered circles
        let fromOffsetX = 0, fromOffsetY = 0;
        if (fromPt.branch === 'A') {
          fromOffsetX = -4; fromOffsetY = -4; // top left
        } else if (fromPt.branch === 'B') {
          fromOffsetX = -4; fromOffsetY = 4; // bottom left
        } else if (fromPt.branch === 'C') {
          fromOffsetX = 4; fromOffsetY = 0; // middle right
        }

        let toOffsetX = 0, toOffsetY = 0;
        if (toPt.branch === 'A') {
          toOffsetX = -4; toOffsetY = -4; // top left
        } else if (toPt.branch === 'B') {
          toOffsetX = -4; toOffsetY = 4; // bottom left
        } else if (toPt.branch === 'C') {
          toOffsetX = 4; toOffsetY = 0; // middle right
        }

        const fromX = from.x + fromOffsetX;
        const fromY = from.y + fromOffsetY;
        const toX = to.x + toOffsetX;
        const toY = to.y + toOffsetY;

        // Check if this connection is within the current circuit
        // Only check for odd-to-odd connections (skip odd-to-even and even-to-odd)
        let isInCurrentCircuit = false;
        if (fromPt.value % 2n === 1n && toPt.value % 2n === 1n) {
          const fromC = SteinerBranches.C(fromPt.n, fromPt.x);
          const toC = SteinerBranches.C(toPt.n, toPt.x);
          // Same circuit and matches current circuit
          isInCurrentCircuit = currentCircuitValue !== null &&
                              fromC === toC &&
                              fromC === currentCircuitValue;
        }

        // Color based on the source point's branch
        let lineColor;
        if (fromPt.branch === 'A') {
          lineColor = CONFIG.colors.branchA;
        } else if (fromPt.branch === 'B') {
          lineColor = CONFIG.colors.branchB;
        } else if (fromPt.branch === 'C') {
          lineColor = CONFIG.colors.endpoint;
        } else {
          lineColor = CONFIG.colors.connection;
        }

        // Brighten color and increase width if in current circuit
        if (isInCurrentCircuit) {
          // Brighten the color
          if (fromPt.branch === 'A') {
            lineColor = '#6fb9ff'; // Brighter blue
          } else if (fromPt.branch === 'B') {
            lineColor = '#ff8b8b'; // Brighter red
          }
          ctx.lineWidth = 4;
        } else {
          ctx.lineWidth = 2;
        }

        ctx.strokeStyle = lineColor;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(fromX, fromY);
        ctx.lineTo(toX, toY);
        ctx.stroke();
        ctx.setLineDash([]);

        // Draw arrow
        drawArrow(fromX, fromY, toX, toY, lineColor);
      }
    }
  }

  // Reset line dash and width
  ctx.setLineDash([]);
  ctx.lineWidth = 1;
}

/**
 * Draw arrow at end of line
 */
function drawArrow(x1, y1, x2, y2, color) {
  const angle = Math.atan2(y2 - y1, x2 - x1);
  const arrowLength = 10;

  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x2, y2);
  ctx.lineTo(
    x2 - arrowLength * Math.cos(angle - Math.PI / 6),
    y2 - arrowLength * Math.sin(angle - Math.PI / 6)
  );
  ctx.lineTo(
    x2 - arrowLength * Math.cos(angle + Math.PI / 6),
    y2 - arrowLength * Math.sin(angle + Math.PI / 6)
  );
  ctx.closePath();
  ctx.fill();
}

/**
 * Draw lattice points
 */
function drawLatticePoints() {
  for (const point of latticeData) {
    const screen = latticeToScreen(point.n, point.x);
    const isSelected = selectedValue !== null && point.value === selectedValue;
    const isHovered = hoveredPoint === point;

    // Check if this value appears in the trajectory (use global trajectoryValues)
    const inTrajectory = trajectoryValues.has(point.value.toString());

    // ONLY draw if in trajectory (skip gray points entirely)
    if (!inTrajectory && !isHovered) {
      continue; // Skip this point
    }

    // Determine color and offset based on branch type
    let color;
    let offsetX = 0;
    let offsetY = 0;

    if (point.branch === 'A') {
      color = CONFIG.colors.branchA;
      offsetX = -4; // top left
      offsetY = -4;
    } else if (point.branch === 'B') {
      color = CONFIG.colors.branchB;
      offsetX = -4; // bottom left
      offsetY = 4;
    } else if (point.branch === 'C') {
      color = CONFIG.colors.endpoint;
      offsetX = 4;  // middle right
      offsetY = 0;
    }

    // Apply offset to screen position
    const drawX = screen.x + offsetX;
    const drawY = screen.y + offsetY;

    // Use constant radius for all points
    const radius = CONFIG.pointRadius;

    // Draw point - solid color, no stroke
    ctx.beginPath();
    ctx.arc(drawX, drawY, radius, 0, 2 * Math.PI);
    ctx.fillStyle = color;
    ctx.fill();

    // Optional: thin stroke for selected/hovered only
    if (isSelected || isHovered) {
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    // Draw sign indicator with smaller font
    let sign;
    if (point.branch === 'A') {
      sign = '-';
    } else if (point.branch === 'B') {
      sign = '+';
    } else if (point.branch === 'C') {
      sign = '=';
    }
    ctx.fillStyle = '#000'; // Black text
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(sign, drawX, drawY);
  }
}

/**
 * Draw axis labels
 */
function drawLabels() {
  ctx.fillStyle = CONFIG.colors.text;
  ctx.font = '14px sans-serif';

  // X-axis label (n)
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText('n →', canvas.width / 2, canvas.height - CONFIG.padding / 2);

  // Y-axis label (x, possibly log scale)
  ctx.save();
  ctx.translate(CONFIG.padding / 2, canvas.height / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  const yLabel = useLogScale ? 'log₃(x+1) →' : 'x →';
  ctx.fillText(yLabel, 0, 0);
  ctx.restore();

  // Draw tick labels
  const maxN = Math.max(...latticeData.map(p => p.n));
  const maxX = Math.max(...latticeData.map(p => p.x));

  ctx.font = '12px sans-serif';
  ctx.fillStyle = '#999';

  // X-axis ticks (n values)
  for (let n = 1; n <= maxN; n++) {
    const screen = latticeToScreen(n, 0);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(n.toString(), screen.x, canvas.height - CONFIG.padding + 5);
  }

  // Y-axis ticks (x values)
  if (useLogScale) {
    // Show powers of 3
    const maxLog3 = Math.log(maxX + 1) / Math.log(3);
    for (let i = 0; i <= maxLog3; i++) {
      const x = Math.pow(3, i) - 1;
      if (x <= maxX && x >= 0) {
        const screen = latticeToScreen(0, x);
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        ctx.fillText(Math.round(x).toString(), CONFIG.padding - 5, screen.y);
      }
    }
  } else {
    for (let x = 0; x <= maxX; x++) {
      const screen = latticeToScreen(0, x);
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillText(x.toString(), CONFIG.padding - 5, screen.y);
    }
  }
}

/**
 * Draw tooltip for hovered point
 */
function drawTooltip(point) {
  const screen = latticeToScreen(point.n, point.x);

  // Calculate all three values for this (n,x)
  const aVal = SteinerBranches.A(point.n, point.x);
  const bVal = SteinerBranches.B(point.n, point.x);
  const cVal = SteinerBranches.C(point.n, point.x);

  const n = point.n;
  const nOdd = n % 2 === 1;
  const x = point.x;

  // Build formulas as affine equations: coefficient·x + intercept
  const lines = [];

  // Show x value first
  lines.push({ text: `x = ${x}`, inTrajectory: true });

  // A(n,x) formula
  if (aVal !== null) {
    const aCoeff = Math.pow(2, n + 1);
    const aIntercept = (nOdd ? 3 * Math.pow(2, n - 1) : Math.pow(2, n - 1)) - 1;
    const aFormula = `A(${n},x) = ${aCoeff}x + ${aIntercept} = ${aVal}`;
    const aInTrajectory = trajectoryValues.has(aVal.toString());
    lines.push({ text: aFormula, inTrajectory: aInTrajectory });
  }

  // B(n,x) formula
  const bCoeff = Math.pow(2, n + 2);
  const bIntercept = (nOdd ? 3 * Math.pow(2, n) : Math.pow(2, n)) - 1;
  const bFormula = `B(${n},x) = ${bCoeff}x + ${bIntercept} = ${bVal}`;
  const bInTrajectory = trajectoryValues.has(bVal.toString());
  lines.push({ text: bFormula, inTrajectory: bInTrajectory });

  // C(n,x) formula
  const cCoeff = 2 * Math.pow(3, n);
  const limit = Math.floor((n - 1) / 2);
  let cIntercept = 0;
  for (let i = 0; i <= limit; i++) {
    cIntercept += Math.pow(9, i);
  }
  cIntercept *= 4;
  const cFormula = `C(${n},x) = ${cCoeff}x + ${cIntercept} = ${cVal}`;
  const cInTrajectory = trajectoryValues.has(cVal.toString());
  lines.push({ text: cFormula, inTrajectory: cInTrajectory });

  // Measure text
  ctx.font = '14px monospace';
  let maxWidth = 0;
  for (const line of lines) {
    const metrics = ctx.measureText(line.text);
    maxWidth = Math.max(maxWidth, metrics.width);
  }

  const padding = 10;
  const lineHeight = 18;
  const boxWidth = maxWidth + padding * 2;
  const boxHeight = lines.length * lineHeight + padding * 2;

  // Position tooltip to avoid edges
  let tooltipX = screen.x + 15;
  let tooltipY = screen.y - boxHeight - 15;

  if (tooltipX + boxWidth > canvas.width - 10) {
    tooltipX = screen.x - boxWidth - 15;
  }
  if (tooltipY < 10) {
    tooltipY = screen.y + 15;
  }

  // Draw background
  ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
  ctx.fillRect(tooltipX, tooltipY, boxWidth, boxHeight);

  // Draw border
  ctx.strokeStyle = CONFIG.colors.highlight;
  ctx.lineWidth = 1;
  ctx.strokeRect(tooltipX, tooltipY, boxWidth, boxHeight);

  // Draw text
  ctx.font = '14px monospace';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';

  let currentY = tooltipY + padding;
  for (const line of lines) {
    // Use bright color for trajectory values, dim for non-trajectory
    ctx.fillStyle = line.inTrajectory ? CONFIG.colors.text : '#666';
    ctx.fillText(line.text, tooltipX + padding, currentY);
    currentY += lineHeight;
  }
}

// Mouse event handlers
canvas.addEventListener('mousemove', (e) => {
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;

  hoveredPoint = findPointAt(x, y);
  render();
});

canvas.addEventListener('click', (e) => {
  if (hoveredPoint) {
    // Set as current point (don't regenerate trajectory)
    currentPoint = hoveredPoint;
    currentCircuitValue = SteinerBranches.C(hoveredPoint.n, hoveredPoint.x);

    // Update info panel
    updateInfoPanel(hoveredPoint);

    render();
  }
});

// Keyboard navigation
document.addEventListener('keydown', (e) => {
  if (e.key === 'n' || e.key === 'N' || e.key === 'p' || e.key === 'P') {
    if (trajectorySequence.length === 0) return;

    // Build ordered list of plotted points from trajectory sequence
    const plottedPoints = [];
    for (const step of trajectorySequence) {
      if (step.isOdd) {
        // Find the correct lattice point for this odd value
        const branch = SteinerBranches.findBranch(step.value);
        if (branch) {
          // Find the specific point matching the branch formula
          const matchingPoint = latticeData.find(p =>
            p.value === step.value &&
            p.branch === branch.branch &&
            p.n === branch.n &&
            p.x === branch.x
          );
          if (matchingPoint) {
            plottedPoints.push(matchingPoint);
          }
        }
      }
    }

    // console.log(`Total plotted points: ${plottedPoints.length}`);
    if (plottedPoints.length === 0) return;

    // Find current point index
    let currentIndex = -1;
    if (currentPoint) {
      currentIndex = plottedPoints.findIndex(p =>
        p.value === currentPoint.value &&
        p.branch === currentPoint.branch &&
        p.n === currentPoint.n &&
        p.x === currentPoint.x
      );
      // console.log(`Current point: ${currentPoint.branch}(${currentPoint.n},${currentPoint.x})=${currentPoint.value}, index: ${currentIndex}`);
    }

    // Check if shift key is pressed for circuit navigation
    if (e.shiftKey) {
      // Shift+N: jump to first point of next circuit
      // Shift+P: jump to first point of previous circuit

      // Group points by circuit value
      const circuits = [];
      let lastCircuitValue = null;

      for (const point of plottedPoints) {
        const circuitValue = SteinerBranches.C(point.n, point.x);
        if (circuitValue !== lastCircuitValue) {
          circuits.push({
            circuitValue,
            firstPoint: point,
            firstIndex: plottedPoints.indexOf(point)
          });
          lastCircuitValue = circuitValue;
        }
      }

      // console.log(`Total circuits: ${circuits.length}`);

      // Find which circuit we're currently in
      let currentCircuitIndex = -1;
      if (currentCircuitValue !== null) {
        currentCircuitIndex = circuits.findIndex(c => c.circuitValue === currentCircuitValue);
        // console.log(`Current circuit index: ${currentCircuitIndex}, C = ${currentCircuitValue}`);
      }

      if (e.key === 'N') {
        // Next circuit (or wrap to first)
        currentCircuitIndex = (currentCircuitIndex + 1) % circuits.length;
      } else if (e.key === 'P') {
        // Previous circuit (or wrap to last)
        currentCircuitIndex = currentCircuitIndex <= 0 ? circuits.length - 1 : currentCircuitIndex - 1;
      }

      // Jump to first point of target circuit
      currentIndex = circuits[currentCircuitIndex].firstIndex;
      // console.log(`Jumping to circuit ${currentCircuitIndex}, C = ${circuits[currentCircuitIndex].circuitValue}`);
    } else {
      // Regular navigation: next/previous point within trajectory
      if (e.key === 'n') {
        // Next point
        currentIndex = (currentIndex + 1) % plottedPoints.length;
      } else if (e.key === 'p') {
        // Previous point
        currentIndex = currentIndex <= 0 ? plottedPoints.length - 1 : currentIndex - 1;
      }
    }

    // Set new current point
    currentPoint = plottedPoints[currentIndex];
    currentCircuitValue = SteinerBranches.C(currentPoint.n, currentPoint.x);

    // console.log(`New current point: ${currentPoint.branch}(${currentPoint.n},${currentPoint.x})=${currentPoint.value}, index: ${currentIndex}`);

    // Update info panel
    updateInfoPanel(currentPoint);

    // Set as hovered to show tooltip
    hoveredPoint = currentPoint;

    render();
  }
});

/**
 * Update info panel with point details
 */
function updateInfoPanel(point) {
  const info = document.getElementById('info-content');
  if (!info) return;

  const trajectory = SteinerBranches.trajectory(point.value, 200);

  let html = `<h3>${point.branch}(${point.n},${point.x}) = ${point.value}</h3>`;
  html += `<p><strong>Endpoint:</strong> C(${point.n},${point.x}) = ${point.endpoint}</p>`;
  html += `<h4>Collatz Trajectory:</h4>`;
  html += `<div class="trajectory">`;

  for (let i = 0; i < Math.min(trajectory.length, 20); i++) {
    const step = trajectory[i];
    const stepClass = step.isEndpoint ? 'endpoint' : (step.isOdd ? 'odd' : 'even');
    html += `<span class="${stepClass}">${step.value}</span>`;
    if (i < trajectory.length - 1) html += ' → ';
  }

  if (trajectory.length > 20) {
    html += ` <span>... (${trajectory.length} steps total)</span>`;
  }

  html += `</div>`;

  info.innerHTML = html;
}

// Generate button handler
document.getElementById('generate').addEventListener('click', () => {
  const startValue = document.getElementById('input-start').value;
  useLogScale = document.getElementById('log-scale').checked;
  showBoundaries = document.getElementById('show-boundaries').checked;

  const start = startValue ? BigInt(startValue) : null;

  // Update URL with start value
  if (startValue) {
    const url = new URL(window.location);
    url.searchParams.set('start', startValue);
    window.history.pushState({}, '', url);
  }

  initialize(start);
});

// Log scale checkbox handler
document.getElementById('log-scale').addEventListener('change', () => {
  const startValue = document.getElementById('input-start').value;
  useLogScale = document.getElementById('log-scale').checked;

  const start = startValue ? BigInt(startValue) : null;
  initialize(start);
});

// Show boundaries checkbox handler
document.getElementById('show-boundaries').addEventListener('change', () => {
  showBoundaries = document.getElementById('show-boundaries').checked;
  render(); // Just re-render, don't reinitialize
});

// Initialize on load with default value or URL parameter
window.addEventListener('load', () => {
  useLogScale = document.getElementById('log-scale').checked;
  showBoundaries = document.getElementById('show-boundaries').checked;

  // Check URL for start parameter
  const urlParams = new URLSearchParams(window.location.search);
  const urlStart = urlParams.get('start');

  let startValue;
  if (urlStart) {
    // Use URL parameter and update input field
    startValue = urlStart;
    document.getElementById('input-start').value = urlStart;
  } else {
    // Use default from input field
    startValue = document.getElementById('input-start').value;
  }

  if (startValue) {
    initialize(BigInt(startValue));
  }
});
