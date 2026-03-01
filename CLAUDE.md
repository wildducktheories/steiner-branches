# Steiner Branches Lattice Visualizer - Development Summary

## Overview
An interactive web application for visualizing the Steiner branch formulas A(n,x), B(n,x), and C(n,x) for the Collatz map. Built as a single-page application using vanilla JavaScript, HTML5 Canvas, and CSS.

## Key Features

### Core Visualization
- **Lattice Display**: Shows (n,x) lattice points with n on x-axis, x on y-axis
- **Branch Formulas**: Implements A(n,x), B(n,x), C(n,x) using BigInt for accurate large integer calculations
- **Trajectory Tracking**: Computes and displays Collatz trajectories from any starting value
- **Color Coding**:
  - Blue points for A(n,x) branch (marked with -)
  - Red points for B(n,x) branch (marked with +)
  - Points offset for visual clarity (A: top-left, B: bottom-left)

### Circuit Boundaries
- **Green Dashed Lines**: Show boundaries between different Steiner circuits
- **Circuit Detection**: Identifies when consecutive odd values have different C(n,x) values
- **Exit Highlighting**: Brighter green (#6fffbf) and thicker lines (4px) for boundaries exiting current circuit
- **Special Case**: Handles convergence to 1 as circuit boundary even when C values match
- **Toggle Control**: Checkbox to show/hide circuit boundaries (default: enabled)

### Current Circuit Highlighting
- **Circuit Selection**: Click any point to make it current, or use keyboard navigation
- **Intra-Circuit Highlighting**: Connections within current circuit shown brighter and thicker
  - Brighter blue (#6fb9ff) for A-branch connections
  - Brighter red (#ff8b8b) for B-branch connections
  - Width increased to 4px from 2px

### Keyboard Navigation
- **n**: Move to next point in trajectory
- **p**: Move to previous point in trajectory
- **Shift+N**: Jump to first point of next circuit (wraps to start)
- **Shift+P**: Jump to first point of previous circuit (wraps to end)
- **Auto-tooltip**: Shows tooltip for current point during navigation

### Display Options
- **Log₃ Scale**: Logarithmic y-axis scaling (default: enabled) for large x values
- **Auto-bounds**: Automatically calculates lattice bounds from trajectory
- **Tooltips**: Hover over points to see:
  - x value
  - A(n,x), B(n,x), C(n,x) formulas as affine equations: coefficient·x + intercept = value
  - Which values are in the trajectory (highlighted in bright text)

### Performance Optimizations
- **Sparse Lattice Generation**: Only generates points actually in the trajectory (not full lattice grid)
- **Extended Search Range**: findBranch() supports n up to 30, x up to 1,000,000
- **Trajectory Limit**: Max 150 steps to prevent hanging on long trajectories
- **Minimal Console Logging**: Debug logs commented out for performance
- **Large Value Handling**: Supports trajectories with very large values (e.g., start=70055 with max value 265,994)

### URL Integration
- Start value stored in URL query parameters
- Shareable links for specific trajectories

## Architecture

### Files
- **index.html**: UI structure with controls and info panel
- **style.css**: Dark theme styling with monospace font for formulas
- **model.js**: Mathematical model implementing branch formulas and Collatz logic
- **view.js**: Canvas rendering, event handling, and visualization logic

### Key Design Decisions

1. **n on x-axis, x on y-axis**: Since x can be very large while n stays small, this orientation works better with log scale

2. **Sparse Lattice**: Instead of generating full lattice (potentially 40,000+ points), only create points in trajectory (typically 45-100 points)

3. **Circuit vs Trajectory**:
   - Circuit = set of odd values with same C(n,x) endpoint
   - Only highlight circuit boundaries (different C values) not all connections
   - Special case: always draw boundary to final value 1

4. **Highlighting Strategy**:
   - Circuit boundaries: highlight exits from current circuit only (not entries)
   - Intra-circuit: highlight connections within current circuit
   - Point size: constant (removed variable size to avoid confusion)

5. **BigInt Throughout**: All calculations use BigInt to handle large Collatz values accurately

## Formula Implementation

### A(n,x) - First Branch
```
A(n,x) = {
  undefined,                          if n ≤ 1
  3·2^(n-1) + 2^(n+1)·x - 1,         if n > 1 and n odd
  2^(n-1) + 2^(n+1)·x - 1,           if n > 1 and n even
}
```

### B(n,x) - Second Branch
```
B(n,x) = {
  3·2^n + 2^(n+2)·x - 1,  if n odd
  2^n + 2^(n+2)·x - 1,    if n even
}
```

### C(n,x) - Endpoint
```
C(n,x) = 2·3^n·x + 4·Σ(i=0 to ⌊(n-1)/2⌋) 9^i
```

### Collatz Map
```
T(n) = n/2 if n even, (3n+1)/2 if n odd
```

## Known Limitations

1. **Very Long Trajectories**: Limited to 150 steps to prevent hanging
2. **Very Large Values**: Trajectories with values > 1M may not render all points
3. **Browser Performance**: Canvas rendering slows with very dense lattices
4. **No Persistence**: Circuit highlighting state not saved in URL

## Development Notes

### Challenges Solved

1. **Gray points covering colored ones**: Fixed by skipping rendering entirely for non-trajectory points rather than drawing gray
2. **Double-clicking truncating graph**: Removed regeneration on click, only update current point
3. **Thick lines persisting**: Added explicit canvas state resets after each draw function
4. **Green lines to wrong points**: Used trajectorySequence order + findBranch() instead of lattice data order
5. **Page hanging on large values**: Switched from full lattice generation to sparse trajectory-only points

### Debug Approach
- Console logging for trajectory values and circuit detection (now commented out)
- Warnings for values not found by findBranch()
- Real-time tooltip updates during keyboard navigation

## Usage Examples

- **Simple trajectory**: `?start=27` - Shows small lattice with 6 circuits
- **Large trajectory**: `?start=70055` - Demonstrates sparse lattice optimization with x values up to ~30,000
- **Cycle visualization**: `?start=5` - Shows special case handling for convergence to 1

## Future Enhancement Ideas

- Add animation of trajectory progression
- Export lattice as SVG or PNG
- Display circuit statistics (size, max value, etc.)
- Support for arbitrary precision (beyond Number.MAX_SAFE_INTEGER for x)
- Zoom/pan controls for very large lattices
- Multiple trajectory comparison mode
- Circuit boundary count in UI
