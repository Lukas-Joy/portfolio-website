## Portfolio Website

MDDN242 2026 - Lukas Joy

This project is a personal portfolio website made to represent the style of my game design and industrial design works as a whole. It does this through emulation of the retro aesethic as my projects tend to lean towards this aesthetic.

The project was created using AI coding asistance and is made using a combination of Javascript, HTML and css with assets being made by hand by me in blender.

---

## Design Intent

### The goal

The main intent of this project is too be an accessiable website made to resprent the sytle of my overall design works too be able too house all my projects, some information about me, my CV, and my contact details. The intent of the design of the website was to create a both very game design feeling website but also incorporate aspects of industrial design into the language of the website.

### Why this direction

This is what I wanted to make as I feel that it represents my work as a whole. The retro style of the website is both in response to the visual styles and aesethitcs that I enjoy as well as the visual styles and aesethtics of the projects I make in both game design and industrail design. All creative control of the website design process was handled by me I decided on how I wanted each section and researched how the best way to do each thing would be before writing complex and technical prompt for the AI to get exactly what I was looking for with out any addition features.

### Who is this for

This is made for potential employers and others in the industrial as well as anyone interested in the work that I have created. I want them to instantly have an understanding of the type of the work that I create before they have even begun naviagting the site. I want them to leave the website with an udnerstanding of both my work and who I am as a person.

---

## Inspiration & References

### Visual references

- [Chudy](https://www.bychudy.com/) - Emulated desktop layout with pop up windows.
- [Mike Klubnika](https://mikeklubnika.com/) - 3D icons to represent projects and video preview of projects.
- [Wriks](https://www.wriks.motorcycles/) - Vibes also made Mike Klubnika's website.
- [Eneme](https://3denemy.neocities.org/) - Vibes
- [Patch3](https://patch3.neocities.org/) - Emulated desktop layout sat within 3D monitor.

### Movements or aesthetics

- Playstation 1 aesthetics
- 2000s era computer technology aesthetics
- Linux OS terminal aesthetics

---

## Design Decisions

### Colour

I made all colour choices based on what felt retro to me aswell as from looking at what colours where used in my inspirations.

### Typography

- Libertinus Serif
- Ubuntu
- Ubuntu Mono
- Pixelify Sans
- VT323

I chose these fonts specifically becasue of there relationship with being well know linux OS typefaces.

### Layout & structure

- About Me
- CV
- Projects
- Contact

I organised the four pages of my website with equal easy of accessiablity but used some hierarchy proincples in the placement of the desktop icons placing them in an order that makes the user read them in the order of: About Me, Projects, Contact, CV.

### Interaction & motion

- Boot sequence - On load, the terminal text types itself in line by line. This was added to reinforce the retro BIOS aesthetic and give the site a sense of booting into a real system before the desktop appears.

- 3D scene & monitor - The Three.js scene renders a 3D monitor model as the centrepiece. Floating 3D icons representing each project orbit around it. This was added so the projects feel like they inhabit a space rather than just being items in a list.

- Desktop icons & windows - Clicking a desktop icon opens a pop-up window for that section (About, Projects, Contact, CV). Windows can be opened, closed and maximise, mimicking a real OS. This was chosen to make navigation feel like using a computer rather than scrolling a webpage.

- CRT effects - Scanlines and a flicker layer are always active over the whole screen. These are purely aesthetic, added to commit to the retro monitor illusion.

---

## AI & Prompting Process

### Tools used

- ChatGPT
- Claude
- Github Co-Pilot
- gwen3-coder:30b

### How you used them

ChatGPT was used via https://chatgpt.com/ copying and pasting in and out of google docs.

Claude was used via https://claude.ai/ with copying and pasting in and out of VS Code.

Github Co-Pilot was used via the Github Co-Pilot plugin for VS Code.

gwen3-coder:30b was used via Ollama app run locally.

### What you used AI for

ChatGPT was used to make sure my intial structuring prompts were clear by asking it if there where holes in what the prompts were asking.

Claude was used to build the base overall stuructre of the code base using the prompts engineered with assistance from ChatGPT.

Github Co-Pilot was used to make assist in making smaller changes to various parts of the code.

gwen3-code:30b was used for code review to suggest large restructures and performance/sustainabilty improvements.

### What worked

Prompts that specified specific coding princples, structures or functions for the AI to follow allowing little to no room for intreptation worked best as they gave the AI no room to decide to do other things or get confused with exactly what I was asking.

### What didn't work

Prompts that were vague or used little or no technical language didn't work well as they gave the AI too much more to intrepret the prompt causing the AI to change, edit, add or remove parts of the code/project that the AI was not intended to be working on.

---

## What I Tried That Didn't Work

### Attempt: PSX overlay system

**What I tried:**
I built a full PSX-style UI post-processing system using shaders, `html2canvas`, and a WebGL overlay to simulate CRT effects (dithering, scanlines, colour quantisation, vignette) on the entire project at once not seperated for 3D scene and 2D UI.

**Why it didn't work:**
It caused instability and complexity. I had to repeatedly revert and reapply commits, showing it wasn’t integrating cleanly with the rest of the system. The overlay conflicted with other parts of the rendering pipeline and added unnecessary performance bottleneck.

**What I learned:**
Complex visual systems need to fit into the rendering pipeline. If something requires constant reverts, it’s probably wrong.

### Attempt: Fallback preview system

**What I tried:**
I implemented multiple preview types (canvas renderers, GIF fallbacks, different preview modes) for project windows.

**Why it didn't work:**
It added unnecessary complexity and I later removed it entirely. Maintaining multiple previews made the system harder to debug and build upon.

**What I learned:**
A simple solution is better than supporting every possible issue.

### Attempt: Random desktop icon layout

**What I tried:**
I used seeded/random positioning and grid-based placement for desktop icons.

**Why it didn't work:**
It made layout unpredictable and hard to control visually and eventually switching to explicit positioning.

**What I learned:**
For UI systems, manual control is better than random generation.

### Attempt: Separate project app

**What I tried:**
I built the project viewer as a standalone `project-app.js` instead of integrating it into the pop out window system.

**Why it didn't work:**
It created duplication of entire systems and awkward interactions between systems, leading to a refactor where it was merged into the main window/UI system.

**What I learned:**
If a feature is meant to be the same as another system, it should be built inside that system from the start.

---

## Technical Notes

### Tools & libraries

| Tool | Purpose |
|------|---------|
|three.js|canvas drawing|
|Google Fonts|typography|
|blender|3D modeling|

### Browser & mobile testing

- Tested on: Chrome, Edge, Safari
- Mobile tested on: e.g. iPhone, Android — any issues?
- Known issues: if something breaks in a specific browser, note it here. That's fine.

---

## Accessibility

- **Colour contrast:** pass all- (f0c677) 13.04:1 | pass except WCAG AAA normal text- (f0c677b7) 6.75:1
- **Alt text on images:** added
- **Keyboard navigation:** works

---

## Sustainability

Uses a HTML + CSS + JS with no backend a low-carbon architecture.

- **Fonts:** Web fonts
- **Images:** compressed WEBP format
- **Video / animation:** autoplay, looping compressed WEBP format

---

## Reflection

Too be added
