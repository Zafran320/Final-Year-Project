# CareerTwin AI — cursor-tracking hero

A frame-based sprite animation driven by the mouse. The character's head and
eyes follow the cursor anywhere on the page, easing back to a resting pose when
the pointer leaves.

## Files

```
careertwin-site/
├── index.html                    markup
├── styles.css                    styling + responsive rules
├── script.js                     sprite renderer, tracking, spring easing
├── assets/
│   ├── room.jpg                  1920×1080 static background (117 KB)
│   ├── char-desktop.jpg          72 frames, 12×6 grid, 600×729 cells (4.0 MB)
│   ├── char-desktop-idle.jpg     resting pose
│   ├── char-mobile.jpg           same grid, 320×389 cells (1.6 MB)
│   └── char-mobile-idle.jpg      resting pose
└── README.md
```

## Running it

Serve the folder — opening `index.html` off disk will block the sprite loads:

```bash
cd careertwin-site
python3 -m http.server 8000
```

Then open `http://localhost:8000`. Any static host works with no build step.

## How the sheets were built

The clip was analysed per-pixel first, comparing every frame against the median
frame to find what actually moves. The answer: only a vertical strip covering
x 463–1352 of 1920. The room, the lamp, the plant, the sign — all completely
static.

That changes the economics. Packing whole 16:9 frames into one sheet forces
every frame down to a few hundred pixels, and scaling that back up to fill a
screen is what made earlier versions blurry. Spriting only the moving strip
spends the same pixel budget on 46% of the area, so the character renders near
native size, and the room ships once at full 1920×1080 and never gets scaled up
at all.

```
FFmpeg → 192 frames → motion analysis → crop to moving strip
       → resample sweep to 72 poses → tile into 12×6 sheet
```

72 poses over a full circle is 5° of gaze per frame, cross-dissolved between
neighbours at render time.

## How tracking works

`script.js` measures the angle from the character's eyes to the cursor,
converts it to a frame index, and scrubs there. Specifics:

- **Angle-space state.** The spring runs on the angle, not on the frame index,
  so travelling from far-left to far-right wraps the short way instead of
  unwinding backwards through every frame.
- **Critically damped spring** (`DAMPING = 2*sqrt(STIFFNESS)`). A 90° turn
  lands in about 280 ms with zero overshoot.
- **Sub-frame cross-dissolve.** The renderer keeps a fractional frame position
  and composites the current pose over the next one at fractional alpha.
- **Separate idle blend.** The resting pose sits outside the sweep, so it is
  blended in as its own layer rather than being mixed into the circular
  arithmetic — an earlier build got this wrong and the idle state never
  converged.
- **Dirty-flag repainting.** The canvas only repaints when the angle or blend
  actually changed, so a still page costs nothing.

## Responsive

- Under ~1200 device pixels the lighter sheet loads (1.6 MB instead of 4.0 MB).
- Cover-fit sizing keeps the composition intact at any viewport ratio; the
  character strip is drawn at exactly the fraction it was cut from, so it stays
  registered to the room at every size.
- The scrim flips horizontal → vertical on narrow screens and the hero copy
  moves to the bottom so it isn't sitting over the face.
- Canvas is DPR-aware, capped at 2×.
- If the sprite sheet fails to load, the room renders on its own rather than
  going black.
- Touch devices drift slowly, since there's no cursor. Dragging steers.
- `prefers-reduced-motion` disables the animation.

## Tuning

| Constant | Does what |
|---|---|
| `STIFFNESS` | How eagerly the head chases the cursor. Keep `DAMPING` at `2*sqrt(STIFFNESS)` or it will wobble. |
| `IDLE_EASE` | How fast it settles to the resting pose after the cursor leaves. |
| `EYE_X` / `EYE_Y` | The eyes' position within the frame. Nudge if the gaze lands slightly off. |
| `PARALLAX` | Pixels of background drift. `0` disables it. |
| `STRIP_X` / `STRIP_W` | Where the animated strip sits. Only change if you re-crop. |

## Regenerating from a new clip

The crop box and the sweep range are specific to this clip. For a new one:

1. Extract frames: `ffmpeg -i clip.mp4 -q:v 2 frames/f%03d.jpg`
2. Find the moving columns by diffing frames against the median, and pad the
   result generously.
3. Find the frames where the gaze sweep starts and ends (it should begin and
   end at the same pose so the circle closes).
4. Crop that strip from 72 evenly-spaced sweep frames and tile them 12×6.
5. Save an unmoved frame full-size as `room.jpg`, and its cropped strip as the
   idle pose.
6. Update `STRIP_X`, `STRIP_W`, `COLS`, `ROWS`, `FRAMES` in `script.js`.

If the strip is cropped too tight, you'll see a seam where the animated region
meets the static room.

## Content

All copy is plain text in `index.html`.
