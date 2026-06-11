# Owner Eyeball Checklist — Final-Run-3 (2026-06-11)

> Gate-green is the floor; this is the gate. Run in order. Report `#N PASS` or `#N FAIL: <one note>`.
> Each item names the builder + what it proves, so a FAIL routes straight to the right lane.

## 1 — Ingestion actually starts (B2, FC3.B — do FIRST)
- **Do:** Curriculum Studio → Ingest Console → pick Library + Curriculum + Subject → **Direct Ingest** one
  PDF (or **Bulk Ingest** a selected book).
- **Pass if:** progress moves **past 5%**, logs populate, and the book reaches **`completed`/`embedded`**
  (not stuck at "queued"/5%).
- **Fail looks like:** stays "queued", 5%, no logs.

## 2 — Crawler harvest + REAL page counts (B2, FC3.C)
- **Do:** run a catalog crawl (e.g. an OpenStax listing). Watch found vs harvested.
- **Pass if:** found ≈ harvested (e.g. ~122/122) **AND** the discovered books show **real page numbers**
  next to them (not blank/"unknown").
- **Watch (known risk):** harvested now always equals found by design — the real test is **page numbers
  actually appear**, not just the tally.

## 3 — Practice: specs + launch + LANGUAGE (B3, FC3.A — the big one)
- **Do:** open the companion, set UI language **English**, type: **"make me an MCQ practice for 5 minutes in
  math"**.
- **Pass if ALL:** (a) the reply is **in English** (not Arabic); (b) the card shows **MCQ** mode + Math
  scope; (c) clicking it **navigates to Practice AND the quest is actually running/launched** (not the empty
  setup form); (d) the **book/subject it acts on matches** what it said.
- **Known limitation:** "5 minutes" maps to no field — acceptable if it says so; a FAIL is silent drop +
  wrong language + empty form.

## 4 — Zatona: current concept + renders (B3, FC3.A)
- **Do:** type **"make me a Zatona summary on photosynthesis"** (use a concept you can recognize).
- **Pass if:** the card concept = **photosynthesis** (NOT a stale topic like "freediving"/"Newton"), it
  navigates, and the **report shown is about photosynthesis**.

## 5 — Assignment: collect + deploy (B3, FC3.A)
- **Do:** as teacher, type **"create an assignment titled 'Algebra Quiz' for the math group with one MCQ:
  what is 2+2, options 3/4/5, correct 4"**.
- **Pass if:** it fills Title (EN+AR) + an anchor (subject/book) + the question, then **deploys/broadcasts**
  and the assignment **appears** in the group (not a 400, not an empty form).

## 6 — Flying Explain/Summarize (B3, FC3.E)
- **Do:** open a book, **select a sentence** → click the floating **Explain** (then retry **Summarize**).
- **Pass if:** the companion **opens primed on that exact passage** and gives a grounded answer — reliably,
  both buttons, a few times.

## 7 — UI quick-sweep (B4, FC3.D) — 60 seconds
- **7a Output-Pacing gone:** the Instant/Pedagogical toggle is **absent** from the chat. ☐
- **7b Library dropdown:** the "All Libraries (N Books)" dropdown opens **clean** (no overlap/clipping). ☐
- **7c Mobile "Core":** on a phone width, the **5 pages render under "Core"**. ☐
- **7d Token widget:** the side panel shows **real token usage + budget** (not "CLT Budget"). ☐
- **7e Hover-intent:** moving the cursor onto a "Core" sub-page **doesn't collapse** the menu. ☐

---
**Routing if a FAIL:** #1/#2 → B2 · #3/#4/#5/#6 → B3 · #7x → B4 · language(#3a) also → B1 D-LANG gate.
