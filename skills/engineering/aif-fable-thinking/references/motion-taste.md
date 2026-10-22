# Motion Taste — the reasoning protocol applied to animation and motion graphics

Fable Thinking's moves, applied to the domain where a model is doubly blind: it never sees
the render, and it never sees time. A keyframe list reads fine and plays as jank; a
transition that "should feel smooth" teleports, stutters, or drags. Motion done well is
information — where something came from, what just happened, what to look at next. Motion
done by default is decoration that costs attention, battery, and accessibility.
`references/design-taste.md` governs the still frame; this reference governs everything
between frames: UI transitions and micro-interactions, animated data, motion graphics and
video sequences, and code-driven animation on any stack (CSS and the Web Animations API,
JavaScript timelines, Lottie or Rive, SVG, canvas, shader, or a compositing tool).

## When to load this reference

Load BEFORE writing the first keyframe, transition, timeline, or storyboard whenever the
deliverable moves: page and view transitions, hover and press feedback, loading and
progress states, list and layout changes, animated charts, onboarding and explainer
sequences, title cards, product videos, slide builds, recorded demos, or a review of any
of these. The trigger is the deliverable type, not the word "animate" in the ask.

## Know Your Own Defaults (motion failure modes)

- **Motion as decoration** — it moves because it can; no information is carried.
- **Timing by guess** — every duration is 300 milliseconds or one second; easing is
  whatever the framework defaults to; the result reads floaty or abrupt.
- **Time blindness** — the playback is imagined, never watched; the imagined version is
  always smooth.
- **Everything moves** — no still ground, so the eye has nowhere to rest and nothing
  reads as primary.
- **Uniform easing** — linear or ease-in-out on entrances, exits, and moves alike.
- **Continuity loss** — elements appear and vanish instead of arriving and leaving;
  states are not connected; the user loses where things went.
- **Performance blindness** — animating layout and paint properties (width, top,
  box-shadow) instead of transform and opacity; long frames nobody measured.
- **Accessibility skipped** — no reduced-motion path; parallax, zoom, and spin served to
  people they make ill.
- **Story-less motion graphics** — a sequence of effects with no message beat; the
  viewer sees movement and learns nothing.

## How to think (the moves, in motion order)

1. **FRAME each motion's job.** Exactly one of: orient (where did it come from or go),
   feedback (acknowledge the action), continuity (connect two states), attention (direct
   focus), explain (show a mechanism or data over time), or brand (a signature moment,
   used sparingly). A motion that fits none is removed. In motion graphics, write the beat
   sheet first: what the viewer should understand at each second, then what moves to say
   it.
2. **Choreograph before keyframing.** Which elements move, in what order, and — more
   important — what stays still. Stillness is the ground that makes motion legible. One
   primary motion at a time; secondary motion supports it or waits.
3. **Fix the motion system before the parts** (tokens, like design tokens). A duration
   scale: roughly 100–150 milliseconds for micro feedback, 200–300 for small transitions,
   300–500 for large or full-view changes, almost never above 700 in an interface; longer
   is for narrative, timed to voice or music. An easing set: decelerate (ease-out) for
   entrances, accelerate (ease-in) for exits, standard ease-in-out for moves, springs for
   physical or playful brands, linear only for constant processes like progress and
   spinners. Distance scales duration, but sublinearly. Staggers of 20–50 milliseconds per
   item with a cap on the total; delays only with a reason.
4. **Apply the principles that carry information.** Slow in and slow out; staging (one
   thing at a time); anticipation and follow-through where weight matters, sparingly;
   arcs for natural movement; timing as weight — heavy things move slowly, light things
   quickly; exaggeration in motion graphics, never in utility interfaces; squash and
   stretch only for character or playful brands.
5. **Keep continuity and physics.** Exits faster than entrances; related elements move
   together; shared elements travel between states instead of being replaced; direction
   encodes hierarchy (forward goes one way, back returns the same way); nothing teleports.
6. **Build for the compositor.** Animate transform and opacity; avoid layout and paint
   properties; promote layers deliberately, not everywhere; prefer the platform's
   animation primitives over per-frame timers; budget sixteen milliseconds per frame at
   sixty frames per second and measure it. Lottie and vector: simple shapes, no
   expensive masks and effects. Video: constant frame rate, export settings chosen for
   the destination, captions and safe areas planned.
7. **Design the reduced-motion path first-class.** Honor the reduced-motion preference:
   replace movement with a fade or an instant change, keep feedback but drop parallax,
   zoom, and spin; no flashing above three times per second; motion is never the only
   signal; autoplaying video has controls.
8. **Make it interruptible.** Every animation can be cancelled or reversed mid-flight
   by the next user action without snapping; the end state equals the static design of
   that state; the first frame never flashes unstyled or hidden content.
9. **Watch it, then deliver with Claim Discipline.** "Played at normal speed and at a
   quarter speed, frame-stepped the first and last frames, held sixty frames per second
   under a fourfold CPU throttle" is a different claim from "should feel smooth".

## What good motion is (evaluable, not vibes)

- **Purposeful** — each motion names its job; the rest was removed.
- **Hierarchical** — one primary motion per moment; a still ground exists.
- **Systematic** — every duration and easing comes from the scale.
- **Continuous** — states connect; shared elements travel; nothing teleports.
- **Performant** — transform and opacity only; measured frame budget held.
- **Accessible** — a reduced-motion path exists and was toggled on and watched.
- **Interruptible** — cancel and reverse mid-flight without a snap.
- **In character** — the motion personality (snappy, calm, playful) is one decision,
  applied everywhere.

## What to avoid (the slop catalog — matches are failed gates)

- Everything fading and sliding up on scroll; a parallax hero by default.
- A one-second ease-in-out on a button hover; bounce on everything.
- A spinner where a skeleton or progress belongs; a loading animation longer than the
  load.
- Stagger applied to fifty items; typewriter text; text that must be read while moving.
- Motion graphics: whoosh transitions with no message, lens flares, camera shake,
  kinetic typography on every word, stock "tech" overlays, a loop with a visible seam.
- Animating width, height, top, left, or box-shadow.
- Motion that ignores the reduced-motion preference.

## Details models habitually miss

- The reduced-motion preference, and testing with it on.
- Interruption and reversal: a click mid-transition, a fast double toggle, a route change
  while an exit plays.
- The first paint state: a flash of hidden or unstyled content before the entrance runs.
- The end state must match the static design pixel for pixel; z-order during the
  transition.
- Layout shift caused by the animation itself; scrollbars appearing mid-motion.
- Looping seams; idle animations that never settle and burn battery.
- Motion graphics: timing to voice-over and music beats; frame-rate mismatches (24, 30,
  60); color and gamma shifts on export; font rendering; captions, safe areas, and the
  version watched without sound.
- File size and decode cost for animated assets (Lottie, GIF palettes, video bitrate).
- Touch has no hover: hover-only motion needs a press or focus equivalent.
- Right-to-left layouts mirror directional motion.

## Verify (time blindness makes this mandatory)

Apply Harness Leverage: if the runtime can render, record, screenshot, or measure, it
must — as a loop over the final artifact.

1. **Play it.** Render and watch at normal speed; record a short video or GIF when the
   harness allows, and watch that.
2. **Frame-step.** Inspect the first frame, a mid frame, and the last frame: no flash, no
   teleport, end state equals the static design.
3. **Slow it down.** Play at a quarter speed; easing errors and overlaps hide at full
   speed.
4. **Measure.** Frame times under a CPU throttle on a low-end profile; long frames are
   findings; confirm only transform and opacity are animated.
5. **Toggle reduced motion** and watch again; feedback survives, movement does not.
6. **Interrupt.** Trigger the next action mid-animation; reverse it; change route during
   an exit.
7. **Stress.** Long lists, slow network (loading states), small screens, right-to-left.
8. **Motion graphics:** watch once without sound for message clarity, once with sound
   for timing; check every beat lands where the beat sheet says.
9. **Repair and re-watch the whole**, not the edited segment — timing changes ripple.

Where nothing can render, say so, downgrade every motion claim to DERIVED or ASSUMED,
and compensate by computing the computable: durations against the scale, easing curves
named, property lists checked, reduced-motion branch present in code.

## Evaluate before delivering (act-backed, per the Self-Review Gate)

| Dimension | Passes when | Proven by |
|-----------|-------------|-----------|
| Purpose | each motion has a named job; none decorative | motion inventory |
| System | durations and easings from the scale | token audit |
| Continuity | no teleports; shared elements travel; end state matches | frame-step |
| Performance | transform and opacity only; frame budget held under throttle | measurement |
| Accessibility | reduced-motion path watched; no flashing | toggle test |
| Interruptibility | cancel and reverse without a snap | interrupt test |
| Message (motion graphics) | every beat lands with and without sound | beat check |

## Motion spec template

```text
Motion: <name>                       Job: orient | feedback | continuity | attention | explain | brand
Elements: <what moves> / Still: <what does not>
Order: <sequence, staggers, delays>
Duration: <from scale>  Easing: <named curve>  Distance: <px or %>
Properties animated: transform, opacity (only)
Reduced motion: <fade | instant | keep feedback only>
Interrupt: <cancel | reverse | queue>   End state: <matches static design of state X>
Verified: <played 1x, 0.25x; frame-stepped; fps under throttle; reduced-motion toggled>
```

## Do / Don't

| Don't | Instead |
|-------|---------|
| Animate because the element can move | Name the job, or remove the motion |
| Guess durations and default the easing | Take both from the motion scale |
| Move everything at once | One primary motion; keep a still ground |
| Replace elements between states | Let shared elements travel; exits faster than entrances |
| Animate width, top, or shadow | Animate transform and opacity; measure frames |
| Ship without a reduced-motion path | Design it first-class; toggle it and watch |
| Judge motion from the keyframes | Play it, frame-step it, slow it down, interrupt it |
| Cut motion graphics as a chain of effects | Write the beat sheet; make every beat carry the message |
