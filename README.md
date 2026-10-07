# Slop Blindbox Collectible

A minimal Three.js / WebGL experience: translucent holographic packaging rotates slowly in front of an Instrument Serif title on a white background.

The animation loops through **box → organic form → pyramid → cylinder → box**. Each shape holds for five seconds, followed by a three-second morph. Reduced-motion preferences disable rotation and replace animated morphs with immediate transitions.

## Local preview

From this directory, run:

```sh
python3 -m http.server 4187 --bind 127.0.0.1 --directory dist
```

Open http://127.0.0.1:4187/ in a browser that supports WebGL 2. No build step or package installation is needed.

## Files

- `dist/index.html`: page layout and Instrument Serif font loading.
- `dist/scene.js`: geometry, materials, lighting, and animation.
- `dist/shape-cycle.js`: shape sequence and timing.
- `dist/vendor/`: vendored Three.js 0.180.0 modules.
- `.openai/hosting.json`: existing Sites hosting configuration.

The static site can be served from `dist/`. Instrument Serif loads from Google Fonts and requires an internet connection.
