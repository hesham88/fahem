# Implementation Plan — Structured Layout Block Viewer (Ingestion v2)

Completely remove the legacy regex-based string parser `renderPremiumContent` from the book viewer in `LibraryPanel.tsx`. Replace it with a robust, visual block-tree layout renderer that natively consumes the schema-typed `blocks` lists and translation `i18n` overlays produced by the Ingestion v2 pipeline.

---

## User Review Required

> [!IMPORTANT]
> - **Zero On-The-Fly Parsing**: Page rendering moves entirely away from parsing raw page text strings. The layout is determined upfront by the ingestion pipeline blocks.
> - **Interactive Multiple-Choice Questions**: MCQ blocks will be fully interactive. Clicking an option bubble dynamically evaluates correctness, rendering beautiful success/error feedback.
> - **Backward Compatibility**: For books processed under legacy ingestion (which lack the `blocks` property), the viewer will fall back gracefully to a clean, standard text layout.

---

## Proposed Changes

### Web Frontend Reader Component

#### [MODIFY] [LibraryPanel.tsx](file:///C:/Users/hesh1/Desktop/fahem/web/src/components/dashboard/LibraryPanel.tsx)

1. **Delete `renderPremiumContent`**:
   - Completely delete the custom `renderPremiumContent` function (currently lines 180–800) along with its custom pattern matches and hardcoded text transformations.

2. **Add Interactive MCQ State**:
   - Add a new React state `selectedMcqAnswers` (`Record<string, string>`) to store user-selected options for interactive textbook questions.

3. **Implement Block Field Localization Helper**:
   - Add a property resolver helper `getBlockProp(block, propName)`:
     ```typescript
     const getBlockProp = (b: any, propName: string) => {
       if (
         activePage.i18n &&
         activePage.i18n[b.id] &&
         activePage.i18n[b.id][translationLanguage] &&
         activePage.i18n[b.id][translationLanguage][propName] !== undefined
       ) {
         return activePage.i18n[b.id][translationLanguage][propName];
       }
       return b[propName];
     };
     ```

4. **Implement Block-Tree Construction**:
   - For pages with blocks, construct an $O(N)$ nested tree at render time:
     - Root blocks where `parent === ""` or `!parent`.
     - A mapping of parent IDs to their child blocks.

5. **Create Premium Block-Type Renderers**:
   - **`heading`**: Dynamically sizes heading tags (`h1`-`h4`) with premium RTL/LTR side borders.
   - **`paragraph`**: Perfect typography, line-height, and padding.
   - **`definition`**: Soft gold/amber-gradient definition cards.
   - **`list`**: Stylized list bullet/number elements.
   - **`table`**: Glassmorphic data grid with sticky-style headers.
   - **`equation`**: Centered LaTeX mathematical container styled beautifully.
   - **`code`**: Premium syntax-highlighted code block in terminal dark mode with a quick copy button.
   - **`figure`**: Premium graphic canvas detailing labeling reference cards (`ref`) and detailed visual captions (`caption`).
   - **`question`**: Interactive multiple-choice cards with option buttons that check answers on click.
   - **`callout`**: Colorful glassmorphic boxes (blue for note, amber for warning, emerald for tip) with icons.
   - **`example`**: Golden study example banner boxes nesting child steps or solutions.
   - **`step`**: Sequential numerical instruction indicators supporting nested children.

6. **Implement TTS Page Text Compiler**:
   - Add a helper `compilePageTextForTts(blocks, lang)` to compile structured blocks into a flat, readable text flow for the Text-to-Speech engine. This ensures audio playback continues to function seamlessly with the new blocks structure.

7. **Implement Inline Styles Parser**:
   - Provide a clean, robust inline markdown style formatter supporting standard highlights (`==text==`), bolding (`**text**`), italics (`*text*`), and underlines (`__text__`).

8. **Fallbacks**:
   - Ensure a robust fallback to render simple raw content paragraphs if `activePage.blocks` is undefined.

---

## Verification Plan

### Automated Verification
- Run Next.js compilation (`npm run build`) to ensure TypeScript types and component props are perfectly aligned.

### Manual Verification
- View newly-ingested books on the dashboard, toggle between Arabic and English translations, select options in MCQs, and verify that the layout displays flawlessly, looking gorgeous and perfectly organized without any inline markdown leaking.
