/**
 * ============================================================
 *	data.js  —  Personalized site content for Lukas Joy
 * ============================================================
 *
 *	Asset paths (optional — falls back to img/No_Texture.webp):
 *	  gif/{key}.gif        looping preview in project.exe
 *	  img/{key}.png        texture on the 3D floating icon
 *	  mesh/{key}.glb       custom 3D mesh for the floating icon
 *	  img/icon-projects.png  |  img/icon-about.png
 *	  img/icon-contact.png   |  img/icon-cv.png
 *	     desktop icon images (fallback: emoji)
 */

const SITE_DATA = {

	identity: {
		name: "Lukas Joy",
		tagline: "Designer | Game Developer",
		systemName: "LJSYS v2.0",
	},

	about: {
		paragraphs: [
			"Hi. I'm Lukas Joy, a designer and game developer.",
			"My work blends PSX aesthetics, low-poly 3D, and interactive experiences.",
			"I enjoy building experimental games, retro-inspired interfaces, and interactive objects.",
		],
		skills: ["GAME DESIGN", "INDUSTRIAL DESIGN", "3D", "PSX AESTHETIC", "GODOT", "UNREAL", "INTERACTIVE DESIGN"],
	},

	contact: {
		email: "designsbylukas@gmail.com",
		links: [
			{ label: "itch.io", icon: "🎮", url: "https://lukasjoy.itch.io", display: "lukasjoy.itch.io" },
			{ label: "YouTube", icon: "▶", url: "https://www.youtube.com/@LukasJoyDev", display: "@lukasjoy" },
			{ label: "GitHub", icon: "⌥", url: "https://github.com/Lukas-Joy", display: "github.com/lukasjoy" },
		],
		note: "Response time: eventually. Timezone: GMT+13.",
	},

	cv: {
		downloadUrl: "#",
		experience: [
			{
			},
		],
		education: [
			{ degree: "BDI Game and Industrial Design", institution: "Victoria University of Wellington", year: "2027" },
		],
		awards: [
			"Tangiwai Excellence Scholarship, 2023",
			"Faculty of Architecture and Design Innovation Deans List, 2024",
			"Prime Ministers Scholarship for Asia and Latin America, 2025",
		],
	},

	projects: [
		{
			key: "circle_means_orange",
			title: "CIRCLE_MEANS_ORANGE",
			icon: "🟠",
			year: "2025",
			type: "GAME",
			tags: ["UNREAL", "EXPERIMENTAL", "3D", "ATMOSPHERIC", "ABSTRACT", "JAM", "SURREAL", "NARRATIVE"],
			previewType: "abstract",
			shortDesc: "A surreal ritual about cones, color, and remembering what you were.",
			fullDesc: [
				"You were part of the circle once. You remember walking through these overgrown and forgotten places.",
				"Something is returning - and it might be you. The cones hum. The road breathes. You were something else once - weren’t you?",
				"Built in Unreal Engine as an experimental exploration of abstract space, and atmospheric storytelling. Made for Jame Gam #48",
			],
			playUrl: "https://lukasjoy.itch.io/circle-means-orange",
			platform: "Windows",
			duration: "Short",
		},

		{
			key: "crackdown",
			title: "CRACKDOWN",
			icon: "🥚",
			year: "2025",
			type: "GAME",
			tags: ["GODOT", "3D", "ACTION", "JAM", "CASUAL", "STEALTH"],
			previewType: "action",
			shortDesc: "A casual 3D stealth prototype focused on fast paced movement and time pressure.",
			fullDesc: [
				"In CrackDown, you’ll step into a chaotic world of artistic sabotage in a fast-paced, absurd environment.",
				" A mysterious client has hired you to egg rival artworks in a gallery, and you must hit as many targets as possible and escape before the police arrive.",
				"Every run is different. The client changes each night, so the artworks you need to egg are never the same.",
				"From chronically online internet references to ridiculous portraits of famous figures, no painting is safe.", 
				"Be quick, be precise, and get out! Made for Mini Jame Gam #47"
			],
			playUrl: "https://archiepvc.itch.io/crackdown",
			platform: "Windows",
			duration: "Short",
		},

		{
			key: "apple_crypt",
			title: "APPLE_CRYPT",
			icon: "🍎",
			year: "2025",
			type: "GAME",
			tags: ["GODOT", "3D", "PSX", "ATMOSPHERIC", "MEDIVAL", "EXPERIMENTAL", "JAM"],
			previewType: "horror",
			shortDesc: "PSX-inspired atmospheric horror experience set in a fragmented space.",
			fullDesc: [
				"Apple Crypt is a short-form atmospheric horror game inspired by PSX-era visuals and low-poly environments.",
				"Play as a hungry knight. Wake up and find apples for food in his non-Euclidean castle dungeon.",
				"Built in Godot with intentional focus on the retro PSX aesthetic. Made for Mini Jame Gam #50",
			],
			playUrl: "https://lukasjoy.itch.io/applecrypt",
			platform: "Browser, Windows, Linux",
			duration: "Short",
		},

		{
			key: "too_many_games",
			title: "TOO_MANY_GAMES",
			icon: "🕹️",
			year: "2025",
			type: "PROJECT",
			tags: ["PHYSICAL", "ARDUINO", "STEAM", "INTERFACE", "3D Printing"],
			previewType: "interface",
			shortDesc: "Interactive prototype exploring game library overload",
			fullDesc: [
				"Too Many Games is a smart object designed to help Steam users decide which game to play and which achievements to pursue by displaying relevant statistics.",
				"It uses two LCD displays and an encoder/button interface for navigation, with data sourced from the Steam API.",
				"Its retro aesthetics draw inspiration from VHS players, PS1 consoles, and classic Macintosh SE computers.",
			],
			playUrl: "#",
			platform: "Physical",
			duration: "Interactive",
		},

		{
			key: "lifese",
			title: "LIFESE",
			icon: "💾",
			year: "2025",
			type: "PROJECT",
			tags: ["PHYSICAL", "ARDUINO", "SIMULATION", "3D PRINTING", "INTERACTION"],
			previewType: "concept",
			shortDesc: "Interactive prototype simulating conways game of life within a retro form factor.",
			fullDesc: [
				"This physical computing project implements Conway's Game of Life on a 16x16 grid of NeoPixel LEDs, using an Arduino Uno, designed with a retro Macintosh SE aesthetic.",
				"User interaction is enabled via two potentiometer-connected dials for navigation when paused, and buttons hidden in SD card slots for pausing and toggling cell states.",
				"A reset button clears the grid or randomly populates it with approximately one-third of the cells alive.",
			],
			playUrl: "#",
			platform: "Physical",
			duration: "Interactive",
		},

		{
			key: "orbit",
			title: "ORBIT",
			icon: "🛋️",
			year: "2025",
			type: "PROJECT",
			tags: ["3D", "SPATIAL", "INTERACTION", "EXPERIMENTAL", "LIGHTING", "3D PRINTING"],
			previewType: "spatial",
			shortDesc: "Spatial interaction experiment focused on rotation, gravity, and digital movement.",
			fullDesc: [
				"Orbit is a lighting solution interaction project built around the interaction of rotation.",
				"The experience explores circular momvement, and loops, through environmental responsiveness.",
				"Developed as an study in spatial interaction and user experience.",
			],
			playUrl: "#",
			platform: "Physical",
			duration: "Interactive",
		},
	],

	bootLines: [
		{ text: "LUKAS JOY SYSTEMS  —  LJBIOS v2.04", style: "header" },
		{ text: "Copyright (C) 1994-2026 Lukas Joy Systems, Inc.", style: "dim" },
		{ text: "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━", style: "sep" },
		{ text: "", style: "gap" },
		{ text: "CPU  : VOID-486 DX4/100MHz  ·  FPU : Installed", style: "normal" },
		{ text: "CACHE: L1 8KB  L2 256KB     ·  BUS : VOID-ISA 33MHz", style: "normal" },
		{ text: "", style: "gap" },
		{ text: "MEMORY TEST", style: "normal" },
		{ text: "  Base Memory  :   640 KB  ......................  OK", style: "ok" },
		{ text: "  Extended Mem : 65,536 KB  ......................  OK", style: "ok" },
		{ text: "  Video RAM    :   1,024 KB  ......................  OK", style: "ok" },
		{ text: "  Shadow RAM   :   Enabled  ......................  OK", style: "ok" },
		{ text: "", style: "gap" },
		{ text: "HARDWARE DETECTION", style: "normal" },
		{ text: "  Video Adapter : PSX-VRAM 1MB  240p  ..............  OK", style: "ok" },
		{ text: "  Void I/O Port : /dev/null  ......................  CONNECTED", style: "ok" },
		{ text: "  Sound Device  : OPL2 FM Synthesizer  .............  OK", style: "ok" },
		{ text: "  3D Renderer   : Three.js r128 WebGL  ..............  OK", style: "ok" },
		{ text: "  CRT Filter    : Scanline mode 50Hz  ................  ACTIVE", style: "ok" },
		{ text: "", style: "gap" },
		{ text: "LOADING LJSYS DESKTOP ENVIRONMENT", style: "normal" },
		{ text: "  kernel.sys  ......................................  LOADED", style: "ok" },
		{ text: "  void.drv  ........................................  LOADED", style: "ok" },
		{ text: "  psx_renderer.drv  ...............................  LOADED", style: "ok" },
		{ text: "  desktop.exe  .....................................  LOADED", style: "ok" },
		{ text: "  project.exe  .....................................  READY", style: "ok" },
		{ text: "", style: "gap" },
		{ text: "All systems nominal. Starting desktop...", style: "dim" },
		{ text: "", style: "gap" },
		{ text: "C:\\LJSYS> _", style: "cursor" },
	],

};