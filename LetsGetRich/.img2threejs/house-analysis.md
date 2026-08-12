# Stylized Chinese Property House — Intake and Quality Contract

## Suitability

- Reference: `.img2threejs/house-reference.png`, cropped from the approved in-project building atlas.
- Verdict: conditional pass. The three-quarter silhouette, palette, and main assemblies are clear; the rear face and exact roof-tile relief are hidden or below reliable resolution.
- Intended use: compact real-time mobile game building, viewed from a 45-degree board camera. This is a stylized reconstruction, not an architectural replica.

## Layered observation

1. Identification: a compact stylized Chinese residential/shop building; primary domain `object`, architectural hard-surface prop, confidence 0.95.
2. Overall form: rectangular plinth and plaster wall volume under a bilateral pitched roof. The roof is wider than the wall footprint and its eaves curl upward at both lateral ends.
3. Macro components: blue stone plinth, cream wall body, pitched roof shell, front entrance assembly.
4. Meso components: raised foundation band, gold fascia, ridge beam, curled end caps, front gable, arched wood door, door surround, entrance step, circular gable ornament, window group.
5. Micro systems: repeated blue roof-tile ribs, gold trim strips, door inset, door knob, window frame crossbars, corner pilasters, shallow sill and roof-edge bevels.
6. Spatial relationships: wall body sits on and slightly inside the plinth; roof overlaps the wall on all sides; fascia is attached along both roof slopes; door and windows are inset into the wall; step projects from the front threshold.
7. Materials: cream plaster is matte dielectric; blue base is satin painted stone; blue roof is glazed ceramic with moderate clearcoat; gold trim is painted metal/ceramic with lower roughness; door is warm brown satin wood; windows are dark teal glass.
8. Color: warm cream walls, saturated medium blue roof/base, warm gold trim, brown door, dark cyan window glazing.
9. Identity features: upturned blue eaves with gold edging, circular ridge-end caps, gold ridge line, arched front door, thick blue foundation.
10. Uncertainty: the rear facade and hidden roof side are not visible. They may be inferred symmetrically; no unseen decorative narrative detail should be invented.

## Quality contract

- Definition of done: at the active 45-degree gameplay camera, one, two, and three-house states must read as small Chinese-style buildings rather than a box plus pyramid. Near views must show roof thickness, eave curl, door and windows without intersecting or z-fighting.
- Minimum component depth: 4 macro assemblies, 8 meso assemblies, and 10 micro/detail features.
- Required repeated systems: 5–7 roof-tile ribs per slope; paired windows; four corner pilasters; paired eave end caps.
- Required material layers: plaster, glazed roof tile, gold trim, wood, window glass, stone/base.
- Required viewpoints: front three-quarter gameplay view, opposite three-quarter view, and side view.
- Performance: reusable materials and geometries where practical; fewer than 25k triangles per house; shadows only on silhouette-bearing meshes.
- Blocking failures: cone/pyramid roof silhouette, paper-thin eaves, no visible door/window framing, roof/wall intersection, detached parts, unreadable details at gameplay distance, or dice obscuring movement/dialogs.
