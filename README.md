# Steiner Circuits Lattice Visualizer

An interactive web-based visualization tool for exploring Steiner branch formulas and circuit structures in the Collatz conjecture.

## Overview

This visualization displays the relationship between odd integers in the Collatz map through the lens of Steiner branch formulas A(n,x), B(n,x), and their common endpoint C(n,x). The tool provides an intuitive way to understand how Collatz trajectories flow through different circuits.

## What It Shows

### The Lattice

The visualization presents an (n,x) lattice where:
- **n-axis (horizontal)**: The branch parameter n (typically small values: 2-10)
- **x-axis (vertical, log₃ scale)**: The offset parameter x (can be very large)

Each point in the lattice represents odd integers calculated via:
- **A(n,x)**: First branch formula (marked with `-`)
- **B(n,x)**: Second branch formula (marked with `+`)
- **C(n,x)**: Common endpoint formula (not directly plotted, but shown in tooltips)

### Steiner Circuits

A **Steiner circuit** is a set of odd integers that all map to the same endpoint C(n,x) under the Collatz map. The visualization highlights:
- **Circuit boundaries**: Green dashed lines show transitions between different circuits
- **Current circuit**: When you select a node, the wave effect highlights related nodes

### Wave Visualization

The innovative wave-based visualization shows the trajectory flow:
- **Selected node**: Large green circle (radius 12px)
- **Successor nodes** (later in trajectory): Blue gradient, fading with distance
- **Predecessor nodes** (earlier in trajectory): Red gradient, fading with distance
- **Node size**: Decreases with distance from selected node

This creates a "ripple effect" that makes it easy to see the trajectory's structure at a glance.

## Features

### Interactive Navigation

- **Mouse**: Click any node to select it and see its trajectory
- **Keyboard**:
  - `n` - Navigate to next point in trajectory
  - `p` - Navigate to previous point in trajectory
  - `Shift+N` - Jump to first point of next circuit
  - `Shift+P` - Jump to first point of previous circuit
  - `s` - Toggle animation (auto-advance through trajectory)

### Display Options

- **Show circuit boundaries**: Toggle green boundary lines on/off
- **Logarithmic scale**: Y-axis uses log₃ scaling to handle large x values
- **Tooltips**: Hover over nodes to see:
  - The (n,x) coordinates
  - Calculated values for A(n,x), B(n,x), C(n,x)
  - Which values appear in the trajectory

### Animation

Press `s` to start/stop automatic animation that advances through the trajectory at 2 steps per second, showing the wave effect in motion

## Branch Formulas

### A(n,x)
```
A(n,x) = {
  3·2^(n-1) + 2^(n+1)·x - 1,  if n odd
  2^(n-1) + 2^(n+1)·x - 1,    if n even
}
```

### B(n,x)
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

## Usage

1. **Open `index.html`** in a modern web browser
2. **Enter a starting value** (e.g., 27, 70055, or 5)
3. **Click Generate** to visualize its trajectory
4. **Interact with the visualization**:
   - Click nodes to select them
   - Use keyboard shortcuts (n/p/Shift+N/Shift+P/s)
   - Toggle circuit boundaries on/off
5. **Explore**: Hover over points to see detailed information

## Examples

Try these interesting starting values:
- `27` - Classic Collatz example with 6 circuits
- `70055` - Large trajectory demonstrating log scale utility
- `5` - Shows special case handling for convergence to 1

## Files

- `index.html` - Main HTML structure and UI controls
- `view.js` - Visualization and rendering logic with wave effect
- `model.js` - Mathematical formulas and Collatz trajectory computation
- `style.css` - Dark theme styling
- `papers/` - LaTeX paper on Steiner branches
- `Taskfile.yml` - Build automation for the paper

## Building the Paper

To build the accompanying LaTeX paper:

```bash
# Build the PDF
task paper:build

# View the PDF
task paper:view

# Build and view in one command
task paper

# Clean auxiliary files
task paper:clean

# Clean all files including PDF
task paper:clean-all
```

## Technical Details

- **Sparse lattice generation**: Only generates points that appear in the trajectory for performance
- **BigInt arithmetic**: Handles arbitrarily large integers accurately
- **Logarithmic scaling**: log₃ scale essential for visualizing trajectories with large x values
- **Canvas-based rendering**: Fast, interactive graphics using HTML5 Canvas
- **Wave effect**: Distance-based coloring and sizing for intuitive trajectory visualization
- **Trajectory limit**: Capped at 150 steps to prevent performance issues
- **No external dependencies**: Pure JavaScript/HTML/CSS

## Mathematical Background

### The Collatz Map

The standard Collatz map T(n):
```
T(n) = n/2      if n even
T(n) = (3n+1)/2 if n odd
```

These formulas classify odd integers by their position in Steiner circuits, providing a structured way to analyze Collatz trajectories.

## Related Work

This visualizer is based on the mathematical framework described in the accompanying paper:

**"Branch Formulas for the Collatz Map: A First-Principles Derivation via Steiner Circuits"**

The paper presents a complete derivation of the branch formulas from Steiner circuits without relying on global convergence claims. Build the paper using `task paper` to read the full mathematical treatment.

## License

See accompanying paper for mathematical details and theoretical background.
