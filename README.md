# Exotel IVR Flow Builder

A visual, drag-and-drop IVR (Interactive Voice Response) flow builder built on top of **Exotel CPaaS APIs**. Design, test, and deploy complex IVR call flows without writing code.

**Live Demo:** [https://utsuksrivastava-neo.github.io/ivr-flow-builder/](https://utsuksrivastava-neo.github.io/ivr-flow-builder/)

Login with `demo` / `demo123`

---

## Features

### Flow Builder
- **Drag-and-drop canvas** — Build IVR flows visually with 15+ node types
- **Auto-layout** — One-click Dagre-based automatic arrangement
- **Undo / Redo** — Full history with Ctrl+Z / Ctrl+Y (50 steps)
- **Autosave** — Automatically saves every 30 seconds; also saves on navigate-away
- **Snap-to-grid** — 16px grid alignment for clean layouts
- **MiniMap** — Bird's-eye view for large flows
- **Validation engine** — Real-time checks for orphan nodes, dead ends, and missing connections
- **Export** — Excel (.xlsx), Word (.docx), or JSON formats
- **Import** — Load flows from JSON files

### Node Types (Boxes)

| Category | Nodes |
|----------|-------|
| **Call Flow** | IVR Menu, Gather Digits, Transfer, End Call |
| **Media** | Message, Play Audio, Say (TTS) |
| **Recording** | Start Recording, Stop Recording, Voicemail |
| **AI / Bot** | Voicebot (WebSocket streaming) |
| **Integration** | Sync API Call, Async API Call |

### IVR Tester
- Interactive phone-style simulator
- DTMF keypad with full digit collection
- Barge-in support (input during playback)
- Countdown timers for timeouts
- Step-by-step call log with node numbering

### Mock API Console
- Simulates Exotel CPaaS v2 API calls
- Shows ExoML payloads, HTTP requests/responses, and events
- Full event lifecycle (leg_lifecycle_event, leg_action_event)

### Templates
7 pre-built industry templates:
- Banking IVR (ICICI/HDFC style)
- Insurance IVR
- E-Commerce IVR
- Customer Onboarding
- Order Confirmation
- Feedback Collection
- KYC Verification

### Project Management
- **Dashboard** — View, search, sort, and filter all IVR projects
- **Search** — Find projects by name
- **Filter** — By call type (Inbound / Inbound+Outbound) and environment (UAT / Production)
- **Sort** — By last modified, date created, or name
- **Duplicate** — Clone any project with one click
- **Environments** — UAT and Production with Push-to-Prod workflow

### Environments (UAT / Production)
- All new projects start in **UAT**
- **Push to Production** — Freezes the current flow as the live version
- **Revert to UAT** — Move back to development mode
- Environment badges visible on all project cards

### User Management
- Login with username/password (SHA-256 hashed)
- Brute-force protection (5 attempts, 30s lockout)
- Session expiry (24 hours)
- Admin panel for adding/deleting users
- Role-based access (Admin / User)

### Security
- SHA-256 password hashing (Web Crypto API)
- Content Security Policy (CSP) headers
- Input sanitization and validation
- No plaintext passwords stored

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Framework** | React 18 + Vite |
| **Flow Editor** | React Flow v11 |
| **State Management** | Zustand |
| **Design System** | @exotel-npm-dev/signal-design-system (Material UI) |
| **Styling** | CSS custom properties (Exotel brand palette) |
| **Icons** | Lucide React |
| **Layout** | Dagre (automatic graph layout) |
| **Export** | ExcelJS, docx, file-saver |
| **Testing** | Vitest + @testing-library/react + jsdom |
| **CI/CD** | GitHub Actions → GitHub Pages |

---

## Getting Started

### Prerequisites
- Node.js 18+ and npm

### Installation

```bash
git clone https://github.com/utsuksrivastava-neo/ivr-flow-builder.git
cd ivr-flow-builder
npm install
```

### Development

```bash
npm run dev
```

Opens at [http://localhost:5173/ivr-flow-builder/](http://localhost:5173/ivr-flow-builder/)

### Build

```bash
npm run build
```

Output in `dist/` — static files ready for deployment.

### Preview Production Build

```bash
npm run preview
```

### Run Tests

```bash
npm test          # single run
npm run test:watch  # watch mode
```

---

## Project Structure

```
src/
├── App.jsx                  # App shell: routing, autosave, editor layout
├── App.css                  # Global styles (3600+ lines, Exotel theme)
├── main.jsx                 # Entry point (Exotel theme provider)
├── assets/
│   └── exotel-logo.svg
├── components/
│   ├── AdminPage.jsx        # User management (admin only)
│   ├── ConfigPanel.jsx      # Node configuration sidebar
│   ├── CustomNodes.jsx      # 16 React Flow node components
│   ├── Dashboard.jsx        # Project list with search/filter/sort
│   ├── ExotelLogo.jsx       # Brand logo components
│   ├── FlowCanvas.jsx       # React Flow canvas wrapper
│   ├── IvrTester.jsx        # Interactive IVR simulator
│   ├── LoginPage.jsx        # Authentication UI
│   ├── MockApiPanel.jsx     # Mock API console
│   ├── Sidebar.jsx          # Draggable node palette
│   ├── TemplateGallery.jsx  # Template picker modal
│   ├── Toolbar.jsx          # Editor toolbar (undo/redo, save, export)
│   └── ValidationPanel.jsx  # Flow validation results
├── data/
│   └── templates.js         # 7 industry IVR templates
├── store/
│   ├── authStore.js         # Auth + user management (Zustand)
│   ├── flowStore.js         # Flow state + undo/redo + autosave (Zustand)
│   └── projectsStore.js     # Project CRUD + environments (Zustand)
├── utils/
│   ├── exportUtils.js       # Excel/Word/JSON export
│   ├── layoutUtils.js       # Dagre auto-layout
│   ├── mockApi.js           # Exotel CPaaS API mock layer
│   └── validationUtils.js   # Flow graph validation
└── __tests__/               # 291+ Vitest tests
    ├── setup.js
    ├── authStore.test.js
    ├── exportUtils.test.js
    ├── flowStore.test.js
    ├── mockApi.test.js
    ├── nodeDefaults.test.js
    ├── projectsStore.test.js
    ├── templates.test.js
    └── validationUtils.test.js
```

---

## Exotel CPaaS API Compatibility

This project is designed to work exclusively with [Exotel CPaaS APIs v2](https://developer.exotel.com/). All mock API calls generate valid:

- **ExoML** — XML-based markup for call actions (`<Say>`, `<StartPlay>`, `<Gather>`, `<StartRecording>`, `<Dial>`, `<StartStream>`, `<Hangup>`, `<Voicemail>`, etc.)
- **REST endpoints** — `/v2/accounts/{AccountSID}/legs`, `/v2/accounts/{AccountSID}/legs/{LegSID}/actions`, `/v2/accounts/{AccountSID}/bridges`
- **Events** — `leg_lifecycle_event` and `leg_action_event` with correct payloads

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+Z` / `Cmd+Z` | Undo |
| `Ctrl+Y` / `Cmd+Shift+Z` | Redo |
| `Ctrl+S` / `Cmd+S` | Save |
| `Delete` / `Backspace` | Delete selected node |

---

## Deployment

### GitHub Pages (automatic)

Every push to `main` triggers the GitHub Actions workflow (`.github/workflows/deploy.yml`) which:

1. Installs dependencies (`npm ci`)
2. Builds the project (`npm run build`)
3. Deploys `dist/` to GitHub Pages

### Manual Deployment

Build and serve the `dist/` folder with any static hosting (Netlify, Vercel, S3, etc.):

```bash
npm run build
# Upload dist/ to your hosting provider
```

---

## License

Internal project — Exotel.

---

## Contributing

1. Create a feature branch from `main`
2. Make changes, ensure `npm test` passes
3. Submit a pull request with a clear description
