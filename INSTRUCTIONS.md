# Lukas Joy — Retro Desktop 3D Hub

Interactive 3D portfolio. Push to GitHub Pages root — no build step needed.

## File Structure

```
index.html          Entry point (all CSS inline)
data.js             ← ALL CONTENT LIVES HERE
js/
  scene.js          Three.js scene (monitor, starfield, 3D icons)
  desktop.js        Desktop icons, taskbar, clock (GMT+13)
  windows.js        Popup windows (about / contact / cv)
  project-app.js    project.exe app + canvas/gif previews
  main.js           Boot sequence + bootstrap
gif/                Looping preview GIFs for project.exe
img/                Textures for 3D icons + desktop icon images
mesh/               Custom 3D meshes for project icons (.glb)
```

## Asset Folders

### `gif/`  — preview animations inside project.exe
Name by project key: `gif/game1.gif`, `gif/game2.gif`, etc.
Falls back to canvas animation if not found.

### `img/`  — textures and icon images
```
img/game1.png           texture on spinning 3D card for "game1"
img/icon-projects.png   desktop icon for project.exe
img/icon-about.png      desktop icon for about.html
img/icon-contact.png    desktop icon for contact.txt
img/icon-cv.png         desktop icon for CV.pdf
img/No_Texture.webp     REQUIRED fallback (checkerboard or ? image)
```

### `mesh/`  — custom 3D meshes  (.glb format)
```
mesh/game1.glb          replaces default spinning box for "game1"
```
Falls back to low-poly box if not found.

## Editing Content

Open `data.js` — everything is in there: about, contact, cv, projects, boot sequence.

### Adding a Project
```js
{
  key: "mygame",        // unique, no spaces — drives all asset filenames
  title: "MY GAME",
  icon: "🎮",
  year: "2025",
  type: "GAME",
  tags: ["UNITY","PSX"],
  previewType: "platformer",  // "platformer"|"horror"|"corridor"|"brand"
  shortDesc: "One-liner.",
  fullDesc: ["Para 1.", "Para 2."],
  playUrl: "https://itch.io/...",
  platform: "Browser",
  duration: "~20 min",
}
```
Then add `gif/mygame.gif`, `img/mygame.png`, and optionally `mesh/mygame.glb`.
Icons auto-position in a grid either side of the monitor.

## GitHub Pages
Settings → Pages → Deploy from branch → main → / (root)