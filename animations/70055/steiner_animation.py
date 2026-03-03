"""
Manim animation for Steiner Circuits starting at p=70055
Visualizes the trajectory through the (n,x) lattice with wave effect
"""

from manim import *
import math

# Steiner branch formulas
def A(n, x):
    """A(n,x) branch formula"""
    if n <= 1:
        return None
    n_odd = n % 2 == 1
    if n_odd:
        return 3 * (2 ** (n - 1)) + (2 ** (n + 1)) * x - 1
    else:
        return (2 ** (n - 1)) + (2 ** (n + 1)) * x - 1

def B(n, x):
    """B(n,x) branch formula"""
    n_odd = n % 2 == 1
    if n_odd:
        return 3 * (2 ** n) + (2 ** (n + 2)) * x - 1
    else:
        return (2 ** n) + (2 ** (n + 2)) * x - 1

def C(n, x):
    """C(n,x) endpoint formula"""
    term1 = 2 * (3 ** n) * x
    limit = (n - 1) // 2
    sum_val = sum(9 ** i for i in range(limit + 1))
    term2 = 4 * sum_val
    return term1 + term2

def collatz(n):
    """Standard Collatz map"""
    if n % 2 == 0:
        return n // 2
    else:
        return (3 * n + 1) // 2

def find_branch(m):
    """Find which branch formula generates m"""
    if m % 2 == 0 or m < 1:
        return None

    for n in range(1, 31):
        n_odd = n % 2 == 1
        base_A = 3 * (2 ** (n - 1)) if n_odd else (2 ** (n - 1))
        divisor = 2 ** (n + 1)

        numerator_A = m - base_A + 1
        if numerator_A >= 0 and numerator_A % divisor == 0:
            x = numerator_A // divisor
            if 0 <= x < 1000000:
                return {'branch': 'A', 'n': n, 'x': x}

        base_B = 3 * (2 ** n) if n_odd else (2 ** n)
        divisor = 2 ** (n + 2)

        numerator_B = m - base_B + 1
        if numerator_B >= 0 and numerator_B % divisor == 0:
            x = numerator_B // divisor
            if 0 <= x < 1000000:
                return {'branch': 'B', 'n': n, 'x': x}

    return None

def compute_trajectory(start_value, max_steps=150):
    """Compute Collatz trajectory with branch information"""
    trajectory = []
    current = start_value

    for step in range(max_steps):
        is_odd = current % 2 == 1

        if is_odd:
            branch = find_branch(current)
            if branch:
                trajectory.append({
                    'value': current,
                    'branch': branch['branch'],
                    'n': branch['n'],
                    'x': branch['x'],
                    'endpoint': C(branch['n'], branch['x']),
                    'step': step
                })

        if current == 1:
            break

        current = collatz(current)

    return trajectory


class SteinerCircuitsAnimation(Scene):
    def construct(self):
        # Configuration
        start_value = 70055

        # Title
        title = Text("Steiner Circuits: m = 70055", font_size=48)
        title.to_edge(UP)
        self.play(Write(title))

        # Formulas on the right side, below title
        formulas = VGroup(
            MathTex(r"A(n,x) = \begin{cases} 3 \cdot 2^{n-1} + 2^{n+1} \cdot x - 1 & \text{if } n \text{ odd} \\ 2^{n-1} + 2^{n+1} \cdot x - 1 & \text{if } n \text{ even} \end{cases}", font_size=20),
            MathTex(r"B(n,x) = \begin{cases} 3 \cdot 2^n + 2^{n+2} \cdot x - 1 & \text{if } n \text{ odd} \\ 2^n + 2^{n+2} \cdot x - 1 & \text{if } n \text{ even} \end{cases}", font_size=20),
            MathTex(r"C(n,x) = 2 \cdot 3^n \cdot x + 4 \sum_{i=0}^{\lfloor(n-1)/2\rfloor} 9^i", font_size=20)
        ).arrange(DOWN, aligned_edge=LEFT, buff=0.3)
        formulas.to_edge(RIGHT, buff=0.5).shift(UP * 1.5)
        self.play(FadeIn(formulas))
        self.wait(0.5)

        # Compute trajectory
        trajectory = compute_trajectory(start_value)

        # Extract unique (n,x) points
        points_data = [(t['n'], t['x'], t['branch']) for t in trajectory]

        # Find bounds for visualization
        n_values = [p[0] for p in points_data]
        x_values = [p[1] for p in points_data]

        n_min, n_max = min(n_values), max(n_values)
        x_min, x_max = min(x_values), max(x_values)

        # Use log scale for x (like the web visualization)
        def log_scale(x):
            return math.log(x + 1, 3)  # log3(x+1)

        # Map to screen coordinates
        scale_x = 5.0 / (n_max - n_min + 2)
        max_log_x = log_scale(x_max)
        scale_y = 3.0 / max_log_x if max_log_x > 0 else 1.0

        def lattice_to_screen(n, x):
            screen_x = (n - n_min) * scale_x - 2.5
            screen_y = log_scale(x) * scale_y - 1.5
            return np.array([screen_x, screen_y, 0])

        # Create axes labels
        axes_label = VGroup(
            Text("n →", font_size=24).shift(DOWN * 3.5),
            Text("log₃(x+1) →", font_size=24).rotate(PI/2).shift(LEFT * 6)
        )
        self.play(FadeIn(axes_label))

        # Create all points
        points = {}
        for i, (n, x, branch) in enumerate(points_data):
            pos = lattice_to_screen(n, x)

            # Color by branch
            color = BLUE if branch == 'A' else RED

            # Create dot
            dot = Dot(pos, radius=0.05, color=color, fill_opacity=0.3)
            points[i] = dot

        # Add all points at once
        self.play(*[FadeIn(dot) for dot in points.values()], run_time=1)
        self.wait(0.5)

        # Animate through trajectory with wave effect
        # Position info text on right side below formulas
        # Initialize with a VGroup to match the structure we'll use
        info_text = VGroup(
            Text("", font_size=20),
            Text("", font_size=20),
            Text("", font_size=20)
        ).arrange(DOWN, aligned_edge=LEFT, buff=0.1)
        info_text.next_to(formulas, DOWN, aligned_edge=LEFT, buff=0.5)
        self.add(info_text)

        # Track wave dots to remove them each iteration
        wave_dots = []
        current_highlight = None

        for i, t in enumerate(trajectory):
            pos = lattice_to_screen(t['n'], t['x'])

            # Remove previous wave dots and highlight
            if wave_dots:
                self.remove(*wave_dots)
                wave_dots = []
            if current_highlight:
                self.remove(current_highlight)

            # Update info text - positioned on right side below formulas
            # Display on separate rows to avoid wrapping
            # Use Text with font matching (weight="BOLD" approximates the LaTeX look)
            new_info = VGroup(
                Text(f"Step {i}:", font_size=20, weight="NORMAL"),
                Text(f"{t['branch']}({t['n']},{t['x']}) = {t['value']}", font_size=20, weight="NORMAL"),
                Text(f"C({t['n']},{t['x']}) = {t['endpoint']}", font_size=20, weight="NORMAL")
            ).arrange(DOWN, aligned_edge=LEFT, buff=0.1)
            new_info.next_to(formulas, DOWN, aligned_edge=LEFT, buff=0.5)

            # Highlight current point (green, large)
            current_highlight = Dot(pos, radius=0.15, color=GREEN, fill_opacity=1.0)

            # Add wave effect to surrounding points
            for j in range(max(0, i-5), min(len(trajectory), i+6)):
                if j == i:
                    continue

                distance = abs(j - i)
                other_t = trajectory[j]
                other_pos = lattice_to_screen(other_t['n'], other_t['x'])

                # Size and color based on distance
                radius = max(0.05, 0.15 - distance * 0.02)

                if j > i:  # Successor - blue
                    intensity = max(0.3, 1.0 - distance * 0.1)
                    color = interpolate_color(BLUE, BLACK, 1 - intensity)
                else:  # Predecessor - red
                    intensity = max(0.3, 1.0 - distance * 0.1)
                    color = interpolate_color(RED, BLACK, 1 - intensity)

                wave_dot = Dot(other_pos, radius=radius, color=color, fill_opacity=0.8)
                wave_dots.append(wave_dot)

            # Add all wave dots and highlight at once (no fade animation)
            self.add(current_highlight, *wave_dots)

            # Only animate the info text update
            self.play(Transform(info_text, new_info), run_time=0.3)
            self.wait(0.2)

        # Clean up final highlights
        if wave_dots:
            self.remove(*wave_dots)
        if current_highlight:
            self.remove(current_highlight)

        # Final message - positioned on right side below formulas
        final_text = VGroup(
            Text(f"Trajectory complete:", font_size=20, weight="NORMAL"),
            Text(f"{len(trajectory)} steps", font_size=20, weight="NORMAL"),
            Text(f"Converged to 1", font_size=20, weight="NORMAL")
        ).arrange(DOWN, aligned_edge=LEFT, buff=0.1)
        final_text.next_to(formulas, DOWN, aligned_edge=LEFT, buff=0.5)
        self.play(Transform(info_text, final_text))
        self.wait(2)


class SteinerCircuitsStatic(Scene):
    """Static overview of the full trajectory"""
    def construct(self):
        start_value = 70055

        # Title
        title = Text("Steiner Circuits Lattice: m = 70055", font_size=36)
        title.to_edge(UP)
        self.play(Write(title))

        # Formulas on the right side, below title
        formulas = VGroup(
            MathTex(r"A(n,x) = \begin{cases} 3 \cdot 2^{n-1} + 2^{n+1} \cdot x - 1 & \text{if } n \text{ odd} \\ 2^{n-1} + 2^{n+1} \cdot x - 1 & \text{if } n \text{ even} \end{cases}", font_size=20),
            MathTex(r"B(n,x) = \begin{cases} 3 \cdot 2^n + 2^{n+2} \cdot x - 1 & \text{if } n \text{ odd} \\ 2^n + 2^{n+2} \cdot x - 1 & \text{if } n \text{ even} \end{cases}", font_size=20),
            MathTex(r"C(n,x) = 2 \cdot 3^n \cdot x + 4 \sum_{i=0}^{\lfloor(n-1)/2\rfloor} 9^i", font_size=20)
        ).arrange(DOWN, aligned_edge=LEFT, buff=0.3)
        formulas.to_edge(RIGHT, buff=0.5).shift(UP * 1.5)
        self.play(FadeIn(formulas))

        # Compute trajectory
        trajectory = compute_trajectory(start_value)

        # Extract points
        points_data = [(t['n'], t['x'], t['branch']) for t in trajectory]
        n_values = [p[0] for p in points_data]
        x_values = [p[1] for p in points_data]

        n_min, n_max = min(n_values), max(n_values)
        x_min, x_max = min(x_values), max(x_values)

        # Scaling functions
        def log_scale(x):
            return math.log(x + 1, 3)

        scale_x = 5.0 / (n_max - n_min + 2)
        max_log_x = log_scale(x_max)
        scale_y = 3.0 / max_log_x if max_log_x > 0 else 1.0

        def lattice_to_screen(n, x):
            screen_x = (n - n_min) * scale_x - 2.5
            screen_y = log_scale(x) * scale_y - 1.5
            return np.array([screen_x, screen_y, 0])

        # Plot all points
        dots = VGroup()
        for n, x, branch in points_data:
            pos = lattice_to_screen(n, x)
            color = BLUE if branch == 'A' else RED
            dot = Dot(pos, radius=0.08, color=color)
            dots.add(dot)

        # Draw path
        path_points = [lattice_to_screen(t['n'], t['x']) for t in trajectory]
        path = VMobject()
        path.set_points_as_corners(path_points)
        path.set_stroke(GREEN, width=2, opacity=0.5)

        # Animate
        self.play(Create(path), run_time=3)
        self.play(FadeIn(dots), run_time=2)

        # Stats - positioned on right side below formulas
        # Display on separate rows to avoid wrapping
        stats = VGroup(
            Text(f"Points: {len(trajectory)}", font_size=20, weight="NORMAL"),
            Text(f"n range: [{n_min}, {n_max}]", font_size=20, weight="NORMAL"),
            Text(f"x range: [{x_min}, {x_max}]", font_size=20, weight="NORMAL")
        ).arrange(DOWN, aligned_edge=LEFT, buff=0.1)
        stats.next_to(formulas, DOWN, aligned_edge=LEFT, buff=0.5)
        self.play(Write(stats))
        self.wait(3)
