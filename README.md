# Slop Blindbox Collectible

A minimal Three.js experience featuring the supplied Slop GLB model. It floats and gently rocks as a translucent, pearlescent shell. Hover paints lasting, textured flat-brush strokes onto the model. Paint stays attached while rotating and remains after the pointer leaves; Escape clears the strokes. Click the model to lock its full color on; click again to return to your painted strokes, or press Escape to restore a clean shell. Drag horizontally between the front logo face and character-list side, with hard stops at each face. Vertical tilt and roll are limited to ±30 degrees. Shift-drag horizontally to roll. The initial three-quarter angle matches the supplied reference. Dragging does not toggle color. Touch supports drag and tap. Keyboard users can press Enter/Space to toggle persistent color and arrow keys to rotate. Reduced-motion preferences disable movement.

## Local preview

```sh
python3 server.py
```

Open http://127.0.0.1:4187/. No build step is needed.

## Files

- `dist/index.html`: page layout and font loading.
- `dist/scene.js`: model loading, materials, hover detection, lighting, and animation.
- `dist/assets/slop.glb`: replacement `Slop Blindbox.glb` model with embedded textures (approximately 64 MiB).
- `dist/vendor/`: Three.js 0.180.0 and matching GLTF loader utilities.

Instrument Serif loads from Google Fonts. Model and rendering dependencies are served locally.

Lighting uses a warm key, cool fill, rim light, softened studio reflections, mesh self-shadows, and a transparent floor with a cast shadow plus soft contact shading.

After the first click/tap (or Enter/Space) reveals the box, scrolling tears the white paper vertically down the center, peeling both halves outward to expose a black background with live, pointer-driven silver ASCII halftones. The title shrinks and fades; the model scales down to 50%. Claim mine remains fixed. Scrolling upward reverses the transition. On touchscreens, swipe outside the model to scroll, and drag the model to rotate.

The ASCII background is rendered procedurally on a canvas with no image source. Moving the pointer creates glowing silver character ribbons that fade over three seconds. Reduced-motion preferences disable ripple drift.

The black stage showcases eight supplied GLB collectibles in one horizontal line, with four figures on either side of the center blindbox and no visible gallery labels, which remains visible at 50% size. Each model supports drag and arrow-key rotation. Gallery GLBs are optimized local derivatives of the originals, with simplified geometry and 1024px textures; source files in Downloads are unchanged. A single scissored WebGL canvas renders all cards, with two concurrent loads and offscreen cards skipped.


### Hand unboxing

After Claim mine, click the box to start the three-second shake. Camera access is requested automatically after the shake and collectible loading finish. Show an open palm, then close it once: the entire lid-and-panel opening animation completes even if the hand relaxes or leaves view. Camera instructions are red. A Retry camera button appears only if camera access fails or is interrupted. The live preview sits in the top-right corner; Escape stops the camera. Camera tracks stop when opening completes, when stopped with Escape, when the tab is hidden, or on page exit.

MediaPipe Tasks Vision 0.10.14 and the float16 Hand Landmarker model are served locally from `dist/vendor/mediapipe`. Camera frames are processed in a local worker; they are not uploaded or recorded. Camera access requires localhost or HTTPS and browser permission. See https://ai.google.dev/edge/mediapipe/solutions/vision/hand_landmarker/web_js for upstream documentation.

Validation: `node tests/hand-curl.test.mjs` checks open/curled hands and rotation/scale invariance. Local worker initialization and blank-frame inference were checked in the browser, as was the complete tear sequence before removal of the optional fallback. Live camera gesture accuracy still needs a real-hand device test.


### Lucky draw

Claim mine selects and loads one of the eight local GLB figures inside the box. The figurine stays concealed until the lid lifts and panels separate, then rises into the center. The secret uses its original colored model for the reveal.

Approved overall odds: secret 1/16 (6.25%); each regular 15/112 (approximately 13.39%). A no-repeat Markov transition preserves these marginal odds while preventing consecutive duplicates in the same tab. Conditional per-refresh odds necessarily differ: after the secret, choose uniformly among the regulars; after a regular, secret has 1/15 and each other regular has 7/45. Session storage remembers the last claimed draw across refreshes. If browser storage is unavailable, draws remain random but no-repeat history cannot persist.

Run `node tests/draw-selection.test.mjs` to verify distribution sums, excluded repeats, and stationary probabilities.


### Reveal controls and copy

Revealed figures support pointer/touch dragging and left/right arrow keys, clamped to 100 degrees in either direction; Home resets the rotation. Desktop reveals use a figure-left/copy-right layout, with stacked copy on small screens. The title uses Instrument Serif and body copy uses Helvetica Neue. Each description is two sentences.

Origin references for the established meme characters: https://apnews.com/article/7600d1faea12be53609f3c2092e02eb7, https://en.wikipedia.org/wiki/Tung_Tung_Tung_Sahur, and https://en.wikipedia.org/wiki/Chill_Guy. Niu Lai, Strawberlina, Bananito, and the secret character use collection/design descriptions rather than an unverified creator attribution. Personality lines are editorial collection copy, not claims of canonical lore.

`node tests/reveal-spin.test.mjs` verifies the rotation clamp; the browser layout test also confirmed both -100 and +100 degree stops.


### Interaction audio

`dist/sound-effects.js` synthesizes brush rustles, paper tears, hover tones, grass steps, bird chirps, a cloud-flight swoosh, and a reveal sparkle using Web Audio. A shared low-volume bus and compressor limit overlap, and frequently repeated effects are throttled. Sound unlocks after the first click/tap/key press; browsers may keep initial hover-only painting silent until then. Hidden tabs suspend audio. No microphone permission or downloaded audio is used.

The camera preview now includes a small caption: “Raise your hand” when no hand is detected, and “Close your palm to tear” when it is in view.


### Saved collectible wallpapers

Get wallpaper opens a modal showing the saved portrait matching the selected draw, with a PNG download. Eight imagegen wallpapers are stored in `dist/assets/wallpapers`, one per collectible slug, generated from renders of the actual models. The prompt is preserved in `wallpaper-prompts.txt`. No runtime generation service or camera access is needed for wallpapers.

The email form POSTs the recipient and selected collectible slug to the local Python server. The server attaches only the corresponding saved wallpaper and sends through Gmail over TLS. Addresses are not logged or stored. The server serves only dist/, and email requests are restricted to the local site with basic rate limits. This local server is not a production hosting configuration.

Verified all eight images decode in-browser, portrait aspect ratios, popup framing, and existing draw/spin tests.


### Gmail setup (local preview)

1. In `.env.local`, paste the Gmail app password after `GMAIL_APP_PASSWORD=` and save. This private file is outside dist/ and ignored by Git. Never put it in browser JavaScript or commit it.
2. Run `python3 server.py`, then open http://127.0.0.1:4187/. Settings are reread per request, so no restart is needed after saving the password.
3. After a reveal, use Get wallpaper → Send to myself, enter a recipient, and press Send wallpaper. It sends from jenn.creativespace@gmail.com.

`python3 tests/wallpaper-email.test.py` checks all eight attachments, input validation, TLS transport wiring with a mocked SMTP connection, and throttling. No real email is sent by tests. A public deployment would need its own backend, secret environment setting, and stronger abuse controls.


### Enter world and initial loading screen

The initial page stays hidden and inert behind a SLOP loading screen until the box GLB has been rendered once. Download progress advances the indicator; failed model/module loading offers a retry. Reduced motion disables the breathing animation.

Enter world opens a full-window, same-origin viewer with the selected character and the provided World Labs world. Back/Escape closes it and preserves the collectible reveal. The underlying scene pauses while the world is open. Up/down arrows run forward/backward and left/right arrows turn. WASD independently tilts/orbits the camera; pointer dragging also orbits, wheel zooms, and R resets. Touch has directional controls. World-only rigs in assets/world-characters play walk by default and crossfade to run while arrows are held. Horizontal root motion is stripped from cloned clips so keyboard movement controls position without sliding or looping jumps. The original collectibles remain unchanged for the meadow, box reveal, and wallpaper references.

The standard view uses the supplied 500k-splat export for responsiveness; desktop High detail loads the full export. Both files are stored locally for static hosting, with Spark 0.1.10 and its MIT license bundled in vendor/. World coordinate rotation matches Marble's public viewer.

No collider mesh was included in the embed. navigation.json is an approximate ground map extracted from the supplied splat data; movement rejects missing ground and abrupt height changes. Camera raycasts avoid nearby splat surfaces. This is not a complete physics/collision model for the ruined building, stairs, walls, or overhangs; a World Labs collider GLB would enable more accurate traversal.

World source: https://marble.worldlabs.ai/world/da013e01-6b95-4b17-9cd4-9363509a00db
Spark: https://sparkjs.dev/
Validation: `node tests/world-movement.test.mjs`, existing draw/spin checks, browser world rendering, and loading-screen-to-box reveal.


### Interaction polish and animated world rigs

The first loader shows only Loading and a progress bar (with error/retry copy only on failure). Once ready, the title fades, rises, and unblurs into place; reduced motion shows it immediately. Independent [Tap me] hints in the meadow disappear after the first successful flower planting or bird launch, respectively. Flower planting plays a soft 0.23-second sparkle. Wallpaper downloads are centered in the popup.

All eight supplied animated GLBs were checked in-browser for walk/run transitions, stable horizontal hips, and valid skinned bounds. `node tests/world-input.test.mjs` checks that arrow inputs trigger running while WASD affects only the camera. Ground movement tests also pass.
