# 🌐 Fahem AI: Interactive Web Frontend

Welcome to the frontend application of **Fahem AI**. This is a highly optimized, premium **Next.js App Router** application built using **TypeScript** and **Vanilla CSS Variables** for responsive design. It is deployed and hosted on **Firebase App Hosting** with continuous deployment.

---

## 🎨 Visual System & Localization

The web application is designed to offer a fluid, gorgeous visual aesthetic while fully supporting localized student curricula in bilingual settings (English and Arabic).

### 1. Bidirectional Layout Mirroring (LTR / RTL)
* The entire design layout is dynamic. When a user switches languages (e.g. English `en` or Arabic `ar`):
  - Typographic flow, flex direction, margins, grid columns, and absolute positionings adjust automatically.
  - The document root triggers standard direction tokens (`dir="ltr"` or `dir="rtl"`).
  - Mirroring occurs dynamically through native CSS logical properties (e.g., `margin-inline-start` instead of `margin-left`).

### 2. Premium Dark-Mode & Glassmorphic Finishes
* Uses beautifully harmonized CSS variable palettes (no ad-hoc styling) to paint deep indigo, violet, and high-contrast charcoal backgrounds.
* Employs fine frosted-glass backdrops (`backdrop-filter: blur()`) to create premium, layered dashboard interfaces.
* Incorporates elegant hover scale transformations and micro-animations, breathing life into progress cards and buttons.

---

## 🚀 Key Learning Modules

The frontend is packed with specialized panels designed to maximize student engagement and comprehension:

```
  Student Browser
         │
         ├──► [Dashboard] ──► Progress telemetry, retention curves, recent chapters
         │
         ├──► [Tutor Conversation] ──► Multi-agent chat panel, SSE log streams, subagent tags
         │
         └──► [Interactive Reading Room] ──► Side-by-side textbook reader, auto-focused pages
```

* **Interactive Reading Room**: Provides a side-by-side split screen showing the tutor chat and an embedded high-fidelity textbook viewer.
* **Clickable Deep-Link Citations**: When the backend agent references content, it includes tokens like `[book_id:p24]`. The frontend parses these patterns and transforms them into interactive anchors. Clicking them instantly scrolls the textbook viewer to page 24.
* **Student Dashboard**: Visualizes rolling learning metrics, practice history scores, and cognitive retention forecasts.
* **Assessment Room**: A dedicated quiz interface displaying dynamic questions with interactive inputs and feedback indicators.

---

## 🔒 Security Integrations & Handshakes

The frontend serves as the secure gateway to the private backend agent container, implementing strict compliance verifications:

1. **Firebase Authentication (Google Sign-In)**:
   - Restricts application usage to registered, authenticated student profiles.
   - Restricts anonymous access through identity middleware checkpoints.

2. **Google OIDC Token Handshake**:
   - The frontend acts as a trusted proxy. When dispatching a user's question, it fetches a fresh Google OIDC identity token on behalf of the signed-in user and forwards it to the private Cloud Run endpoint (`fahem-agent`).

3. **reCAPTCHA Enterprise Protection**:
   - To defend against scrapers and automated rate-abuse, crucial endpoints (e.g., user onboarding, feedback submit) are gated with reCAPTCHA Enterprise server-side score assessments.

4. **GCP Model Armor Pre-flight Sweeper**:
   - Every message sent by a student is audited at the API router level. Model Armor sanitizes user prompts and blocks toxic constructs or jailbreak attempts before they reach the core multi-agent state.

5. **Focus Lock Enforcement**:
   - To prevent academic dishonesty during active, assigned exams, the frontend locks and suppresses the conversational tutor companion. Active assignment states throw a standard `423 Locked` response, guiding the user back to their independent test interface.

---

## 📁 Directory Structure

```
web/
├── src/
│   ├── app/                 # Next.js App Router Pages and Routes
│   │   ├── [locale]/        # Localized LTR/RTL page layouts (en/ar)
│   │   └── api/             # API Router integration points
│   │       ├── agent/       # Central agent SSE stream API gateway
│   │       ├── chat/        # Session retrieval and management
│   │       └── localDbHelper.ts # Offline local database JSON orchestrator
│   ├── components/          # Reusable UI cards, chat bubbles, textbook panels
│   ├── context/             # Global states for auth, session, and locale
│   ├── dictionaries/        # JSON translation files for localization
│   ├── lib/                 # Standardized MongoDB / Firebase admin initializers
│   └── middleware.ts        # Route authentication and localization middleware
├── public/                  # SVG assets, logos, fonts, and static vectors
├── apphosting.yaml          # Firebase App Hosting configuration settings
├── playwright.config.ts     # End-to-end integration test setup
└── tsconfig.json            # TypeScript type rules
```

---

## 💻 Local Development

### 1. Installation
In the `web/` directory, install all required Node dependencies:
```bash
npm install
```

### 2. Configure Local Environment (`.env.local`)
Create a `.env.local` file inside the `web/` folder:
```env
# Gemini API Key (Local fallback)
GEMINI_API_KEY="your-gemini-key"

# MongoDB Database URI (Local target)
MONGODB_URI="mongodb+srv://user:pass@cluster.mongodb.net/fahem"

# Target Python Agent Cloud Run Base URL
MONGODB_AGENT_URL="http://localhost:8080" # local Python instance
# Or Cloud Run target in production
# MONGODB_AGENT_URL="https://fahem-agent-xxxxxx.a.run.app"
```

### 3. Run Development Server
```bash
npm run dev
```
Open **[http://localhost:3000](http://localhost:3000)** in your browser.

### 4. Code Quality & Formatting
Verify your files conform to Next.js guidelines and translation files are synchronized:
```bash
# Run linting check
npm run lint

# Synchronize bilingual translation dictionaries
npm run validate-i18n
```

---

## 🧪 Testing

We utilize **Playwright** for complete End-to-End (E2E) smoke and authentication tests:

```bash
# Run E2E Integration Suite
npx playwright test
```

Test results, screenshots, and logs are automatically organized under `web/test-results/`.
