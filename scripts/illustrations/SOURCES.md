# Project illustrations

These three editable SVGs depict the projects in the selected profile.
They are vector interpretations of the portfolio photographs,
not dimensioned engineering drawings. Hardware colors remain consistent across
the surrounding profile themes.

Audience: readers evaluating Pratinav's hardware and software projects.
Value: make the three project cards recognizable as the actual builds.
Primary proof: the local portfolio's project photographs and descriptions.
First action: identify the build, then follow the existing portfolio link.
Visual theme: technical specimens with clear silhouettes and material details.

## References

The saved portfolio HTML and its supporting files are the primary references.
The portfolio's public address is
<https://pratinaa.github.io/>.

| SVG | Portfolio photos | Defining details |
| --- | --- | --- |
| `atlas.svg` | `robot competition.jpg`, `robot construction.jpg` | Low chassis, blue 2854 bumper, three intake rollers, blue shooter wheels, angled black side plates and metal rails |
| `macropad.svg` | `macropad construction.png`, `pcb design.png` | Nine exposed red-stem switches, clear housings, blue Pro Micro at left, black plate, unpopulated display header and reset area |
| `air65.svg` | `final drone.jpg`, `motor assembly.jpeg` | Pale blue ducts, three-blade propellers, brushless motors, central flight controller, clear canopy, black camera lens and antenna |

The macropad follows the photographed assembly stage; it does not add keycaps or
an installed display. The Air65 drawing omits the loose batteries beside the
drone. Small hardware details are simplified to stay legible in the README.

## Production

Palette: charcoal `#17232b` / `#283841`, steel `#a8bac3` / `#e5eef0`, and the
photographed hardware colors. Shape: consistent fine outlines and material
facets, with a `600 × 400` transparent source canvas. Typography: system fonts
only. Motif: actual exposed hardware. Composition: one specimen per card.

`scripts/render_profile.py` inlines each SVG and namespaces its IDs in the desktop
and mobile build boards. No fonts, images, scripts, or remote resources are
required by the SVGs.
