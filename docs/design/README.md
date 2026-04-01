# IVR Flow Builder — design & interaction artifacts

These files are **not Figma**, but they are standard formats you can open in free tools and extend into high-fidelity UI in Figma, Penpot, or Sketch by tracing or importing.

| File | Format | Open with |
|------|--------|-----------|
| `ivr-flow-builder-interactions.drawio` | diagrams.net XML | [diagrams.net](https://app.diagrams.net) (File → Open from → Device), **VS Code** “Draw.io Integration” extension, Confluence draw.io |
| `ivr-flow-builder-interactions.mmd` | Mermaid | [Mermaid Live Editor](https://mermaid.live), GitHub/GitLab (renders in `.md`), Notion, Obsidian |
| `ivr-flow-builder-interactions.svg` | SVG | Any browser, Illustrator, Inkscape, Figma (Import) |

## What’s mapped

- **Hash routes** (`#/login`, `#/dashboard`, `#/admin/...`, `#/project/:projectId`)
- **Auth redirects** (guest vs logged-in vs admin-only)
- **Editor** layout (toolbar, sidebar, canvas, config panel) and **non-route overlays** (mock API panel, IVR tester, template gallery, validation)
- **Dashboard** actions (new IVR dialog, template gallery → create project + navigate, theme, admin)
- **Autosave** behaviour (interval + save on leave editor)

## Importing into a visual design tool

1. **Figma**: Import `ivr-flow-builder-interactions.svg` as a starting frame, or place the `.drawio` export as PNG/SVG from diagrams.net (File → Export as → SVG).
2. **Penpot**: Import SVG, or recreate frames using this doc as a checklist.
3. **FigJam / Miro**: Paste Mermaid output from [mermaid.live](https://mermaid.live) as a screenshot, or use the SVG.
