# Steiner Circuits Animation: p = 70055

Manim animation visualizing the Collatz trajectory starting at p=70055 through the Steiner circuits lattice.

## Overview

This animation demonstrates:
- The trajectory path through the (n,x) lattice
- Wave effect showing distance from current point
- Successors in blue gradient
- Predecessors in red gradient
- Current point highlighted in green
- Log₃ scaling on the x-axis

## Scenes

### SteinerCircuitsAnimation
Animated wave effect showing step-by-step progression through the trajectory with distance-based coloring and sizing.

### SteinerCircuitsStatic
Static overview showing the complete trajectory path and all points at once.

## Requirements

Install manim:

```bash
pip install manim
```

Or using conda:

```bash
conda install -c conda-forge manim
```

## Rendering

### Render the animated scene (high quality):

```bash
manim -pqh steiner_animation.py SteinerCircuitsAnimation
```

### Render the static overview:

```bash
manim -pqh steiner_animation.py SteinerCircuitsStatic
```

### Quick preview (low quality):

```bash
manim -pql steiner_animation.py SteinerCircuitsAnimation
```

### Render both scenes:

```bash
manim -pqh steiner_animation.py
```

## Output

Videos will be generated in:
- `media/videos/steiner_animation/1080p60/SteinerCircuitsAnimation.mp4`
- `media/videos/steiner_animation/1080p60/SteinerCircuitsStatic.mp4`

## Command Line Options

- `-p` - Preview (auto-play after rendering)
- `-q` - Quality:
  - `-ql` - Low quality (480p15)
  - `-qm` - Medium quality (720p30)
  - `-qh` - High quality (1080p60)
  - `-qk` - 4K quality (2160p60)
- `-s` - Skip to end and save last frame
- `-a` - Render all scenes in file

## Customization

To animate a different starting value, edit `steiner_animation.py` and change:

```python
start_value = 70055  # Change this to your desired value
```

## About p=70055

This starting value demonstrates:
- Large trajectory with many steps
- Wide range of x values requiring log scale
- Multiple circuit transitions
- Good example of the wave visualization effect

See the main README for more about Steiner circuits and the visualization.
