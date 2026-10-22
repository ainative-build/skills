# Design Taste — the reasoning protocol applied to UI/UX and frontend work

Deep Thinking's moves, applied to the one domain where models are most confidently
wrong about their own output: visual design. Code either passes tests or fails them;
design "looks fine" to the model that produced it, always, because the model never sees
it. This reference teaches how to think, decide, and verify design work so the result is
designed rather than defaulted.

## When to load this reference

Load BEFORE writing the first line of markup, styles, or component code — not after —
whenever the deliverable is a user-facing surface:

- building or restyling pages, components, dashboards, landing pages, emails, slides,
  HTML artifacts, TUIs, charts
- reviewing or critiquing UI code, screenshots, or live pages
- choosing colors, typography, spacing, layout, or a design system
- any task whose output a human will look at and judge, not just execute

The trigger is the deliverable type, not the words in the prompt. "Make a quick page for
X" is a design task; the word "design" need not appear.

## Know Your Own Defaults (why model-generated design converges on slop)

These are the design-domain instances of the failure modes in `reasoning-protocol.md`:

- **Mode collapse / template gravity** — with no strong brief, you emit the statistical
  mean of training data: one favorite palette, one favorite font, one favorite hero
  layout, identical card grids. The output is not wrong; it is the average, and average
  reads as machine-made. Distinctive requires a deliberate choice made early.
- **Decoration ≠ design** — when unsure, you add (gradients, shadows, glows, badges,
  ornaments) instead of removing. Good design is mostly subtraction: fewer colors, fewer
  weights, fewer boxes, more space. If an element encodes no information, it is noise.
- **Render blindness** — the design-domain form of surface blindness. You emit code and
  imagine the result; the imagined render is always flattering. Overflow, wrapping,
  contrast failures, misalignment, and collision are invisible in source form. A claim
  that a layout "works" is ASSUMED until the artifact is rendered and inspected, or the
  specific property is computed.
- **Uniform emphasis** — everything bold, everything colored, every section decorated.
  Hierarchy means choosing what loses. If every element shouts, the design says nothing.
- **Happy-path bias** — you design one state: medium-length content, loaded data, desktop
  width, light mode, mouse input. Real interfaces spend most of their life in the other
  states.
- **Completion pressure** — shipping the first composition that renders without errors.
  Rendering without errors is the floor of correctness, not evidence of quality.

## How to think (the moves, in design order)

1. **FRAME the screen's job.** One sentence: who is looking at this, and what is the ONE
   thing they must see or do first? Name the emotional register the content deserves —
   calm utility, dense data, bold marketing, editorial warmth — and let it be a decision,
   not a leftover. A dashboard and a landing page with the same styling means no decision
   was made.
2. **Rank before you draw.** List every element the surface must carry, ordered by
   importance to the user's job. The finished design's visual weight (size, contrast,
   position, whitespace) must reproduce that ranking. This list is the load-bearing fact
   of the whole task; most bad layouts are correct CSS applied to an unranked list.
3. **Choose the system before the parts.** Fix the design tokens first: one accent color
   plus a neutral ramp; at most two type families; a spacing scale; a radius and shadow
   scale. Then every value in the output comes from the scale. Ad-hoc values are how
   consistency dies one line at a time.
4. **Design with real content.** Use realistic longest-case and shortest-case content
   from the start — real names, real numbers, empty lists, missing images. Content is a
   constraint, not a filler; lorem ipsum defers every hard decision to the moment you can
   no longer make it.
5. **Subtract before delivering.** One deliberate pass: remove every element, color,
   border, shadow, and animation whose absence loses no information. What survives is
   the design.

## UX before UI (the flow decides what the screen must do)

Visual quality cannot rescue a surface whose flow is wrong. Decide the interaction before
styling it. Each rule below is evaluable, and each is a routine finding in UI reviews:

1. **Map the task flow first.** Lay out the user's path as steps: entry → decision →
   action → confirmation → exit. Count the steps and the decisions; each must earn its
   place. Design the screen for the step it sits on, not for everything the system knows.
2. **One primary action per screen.** Exactly one visually dominant call to action;
   secondary actions quieter; destructive actions separated, visibly different, and
   reversible. Undo beats a confirmation dialog, which users click through; reserve
   confirmation for the genuinely irreversible.
3. **Progressive disclosure and defaults.** Show what most users need now; put the rest
   behind a step, an accordion, or an "advanced" section. Every choice ships with a sane
   default. A form the user can submit unchanged is an achievement, not a shortcut.
4. **Feedback at the right timing.** Under about 100 ms reads as instant; around one
   second needs a visible state change; longer needs progress, an estimate, or a way to
   leave and come back. Every action produces a visible result where the user is looking.
5. **Prevent errors, then recover from them.** Constrain inputs (pickers, masks, typed
   fields) before validating them; validate inline on blur, not only on submit; an error
   message says what happened and what to do next, beside the field; entered data is
   never discarded on an error, a refresh, or a back navigation.
6. **Forms.** Visible labels (a placeholder is not a label); logical grouping and tab
   order; the right input type and autocomplete attribute; one column; required versus
   optional stated once; a submit button never silently disabled — enable it and say what
   is missing.
7. **Navigation and consistency.** The user always knows where they are, how they got
   here, and how to go back. Same action, same word, same place, everywhere. Follow
   platform conventions before inventing.
8. **Accessibility is correctness, not polish.** Keyboard reachability and visible focus;
   an accessible name on every control; contrast per the readability rules below;
   reduced-motion respected; information never carried by color alone; touch targets at
   or above ~44px.
9. **First-run, empty, and recovery states.** The empty state teaches the next action;
   the first run offers one thing to do, not a tour; recovery (session expired, offline,
   permission denied) explains and preserves work.
10. **Perceived performance.** Optimistic updates where safe, skeletons over spinners for
    content, progressive loading — and never a layout that jumps under the cursor.

## What good design is (evaluable, not vibes)

A surface is well designed when each of these holds and can be shown to hold:

- **Legible hierarchy** — a viewer squinting at it (or seeing it for three seconds) can
  point at the most important element, and it is the intended one.
- **One voice of emphasis** — a single accent does all the "look here" work; neutrals do
  everything else. Emphasis spent everywhere is emphasis spent nowhere.
- **Rhythm** — spacing values come from one scale; edges align to a grid; equal-status
  elements are visually equal. The eye notices misalignment before the mind does.
- **Readable text** — body contrast meets WCAG AA (4.5:1; 3:1 for large text), line
  length stays in the 45–75 character range, line height gives dense scripts and
  diacritics room. These are computable properties, not opinions.
- **Designed states** — hover, focus, active, disabled, empty, loading, error, and
  overflowing content all have an intended appearance, chosen rather than inherited.
- **Fit** — the styling belongs to THIS content, audience, and brand. The test: swap in a
  different product's copy; if the design fits it just as well, the design fit nothing.

## What to avoid (the slop catalog — matches are failed gates, not style choices)

- The default-everything stack: the same overused font on the same neutral panel behind
  a violet-to-blue gradient hero with three equal feature cards.
- Glassmorphism, neon glows, and gradient text as substitutes for a composition.
- Emoji as icons or bullets in professional surfaces.
- Decoration stacking: shadow + border + gradient + rounded + glow on one element.
- Center-aligned paragraphs; full-viewport-width text lines.
- Gray-on-gray body text that fails a contrast computation.
- Five font sizes where three steps would do; arbitrary values off the spacing scale.
- Animating everything; motion that communicates nothing; parallax by default.
- Placeholder tells: lorem ipsum, "John Doe", obvious stock imagery, fake logos.
- Uniform card grids regardless of whether the content is uniform.

## Details models habitually miss

Enumerate these deliberately — negative-space scanning, because absence is invisible:

- Focus visibility and tab order; hover-only affordances that break on touch; touch
  targets below ~44px.
- The longest realistic string: an unbroken URL, a German compound, a 40-character name —
  where does it wrap, clip, or push the layout?
- Non-Latin and diacritic-heavy text (Vietnamese stacked marks, CJK) clipped by tight
  line heights or wrong font fallbacks.
- Dark mode as a re-decision, not an inversion: shadows stop working, borders must take
  over, saturated accents need re-tuning.
- Empty, loading, and error states — the states users actually meet first.
- Tables: numeric columns right-aligned with tabular figures; header alignment matching
  the data; horizontal overflow contained in its own scroll region.
- Optical versus box alignment: icons beside text, play buttons in circles — centered
  boxes that look off-center.
- Layout shift while fonts and images load; sticky elements covering content; z-index
  collisions; mobile safe-area insets.
- Print/export appearance when the artifact is a document or slide.
- Motion: every transition has a named job, a duration and easing from a scale, a
  reduced-motion fallback, and was watched, not imagined — `references/motion-taste.md`.

## Verify (render blindness makes this mandatory, not optional)

Apply the Harness Leverage rule: anything a granted capability can check must be checked
with it, as a loop, until a full pass over the final artifact is clean.

1. **Render it.** If the harness grants a browser, screenshot, or preview capability,
   render the artifact and look at it — at a phone width, a tablet width, and a desktop
   width. Judging design from source code is reasoning about a render you never saw:
   ASSUMED wearing OBSERVED grammar.
2. **Squint test on the render.** Blur or shrink it: does the intended #1 element win?
   Does the reading order match the importance ranking from FRAME?
3. **Stress the content.** Swap in the longest realistic strings, an empty collection, a
   large collection, missing images. Re-render; look again.
4. **Compute the computable.** Contrast ratios, line length, type scale steps, spacing
   values against the scale — these are arithmetic. Compute or script them; never
   eyeball a number a formula settles.
5. **Walk the states.** Tab through with a keyboard; trigger hover, focus, disabled,
   loading, error, empty. Every state either has a designed appearance or is a finding.
6. **Scan against the slop catalog and the missed-details list**, item by item, as a
   checklist — not from memory of having "kept them in mind".
7. **Repair and re-verify.** Fixes change layout; a fix can break a neighbor. Loop until
   one complete pass over the final artifact is clean.

Where the harness grants no renderer, say so in the delivery, downgrade every visual
claim to DERIVED or ASSUMED, and compensate by computing everything computable (step 4)
and hand-tracing the layout with concrete content lengths.

## Evaluate before delivering (act-backed, per the Self-Review Gate)

Each verdict must point to the act that proved it:

| Dimension | Passes when | Proven by |
|-----------|-------------|-----------|
| Hierarchy | #1 element wins the squint test | rendered inspection |
| Consistency | all values on the token scales | token audit / grep |
| Readability | contrast, measure, line height in range | computation |
| States | interaction + data states designed | state walk |
| Robustness | survives longest/empty/overflow content | stress render |
| Distinctiveness | zero slop-catalog matches; fits this brief | checklist scan |

Deliver with Claim Discipline: "verified at three widths with stressed content" is a
different — and honest — claim than "this should look good". If a dimension was not
verified, name it as the weakest link instead of letting fluent delivery imply it.

## Do / Don't

| Don't | Instead |
|-------|---------|
| Start typing markup from the prompt | FRAME the job, rank the elements, fix the tokens first |
| Judge the design from its source code | Render it and look, or downgrade the claim honestly |
| Add decoration when a section feels weak | Subtract noise; strengthen hierarchy or content |
| Emphasize everything that seems important | Pick what loses; one accent voice |
| Design with lorem ipsum and medium-length data | Use real longest/shortest/empty content from the start |
| Eyeball contrast, measure, and spacing | Compute them — they are arithmetic |
| Ship the first error-free render | Run the stress + states + slop passes, then loop repairs |
| Restyle what the brief did not ask about | Scope line from Move 1: flag adjacent issues, one sentence |
| Guard a destructive action with a confirm dialog | Make it reversible; offer undo; confirm only the irreversible |
| Label a field with its placeholder | Give it a visible label; use the placeholder for an example |
| Show every option and setting at once | Ship defaults; disclose the rest progressively |
| Encode state or meaning in color alone | Pair color with text, icon, or position |
| Design the happy path and ship | Design empty, loading, error, offline, and recovery states too |
