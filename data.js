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
			"Hi. I'm Lukas Joy, a designer and game developer exploring digital space, 3D environments, and authored systems.",
			"My work blends PSX aesthetics, low-poly 3D, and interactive experiences that play with perception and interface.",
			"I enjoy building experimental games, retro-inspired interfaces, and interactive identities that push design.",
		],
		skills: ["GAME DESIGN", "INDUSTRIAL DESIGN", "3D", "UI/UX", "PSX AESTHETIC", "GODOT", "UNREAL"],
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
			tags: ["UNREAL", "EXPERIMENTAL", "SYSTEMS", "MINIMAL"],
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
			tags: ["GODOT", "3D", "ACTION", "EXPERIMENTAL"],
			previewType: "action",
			shortDesc: "Tight 3D action prototype focused on movement and environmental pressure.",
			fullDesc: [
				"Crackdown is a fast-paced 3D action prototype exploring spatial control and movement tension.",
				"The game focuses on player positioning, restricted environments, and escalating mechanical pressure.",
				"Built as an experiment in clarity, impact feedback, and constrained level design.",
			],
			playUrl: "https://archiepvc.itch.io/crackdown",
			platform: "Windows",
			duration: "Short",
		},

		{
			key: "apple_crypt",
			title: "APPLE_CRYPT",
			icon: "🍎",
			year: "2023",
			type: "GAME",
			tags: ["GODOT", "HORROR", "PSX", "ATMOSPHERIC"],
			previewType: "horror",
			shortDesc: "PSX-inspired atmospheric horror experience set in a fragmented space.",
			fullDesc: [
				"Apple Crypt is a short-form atmospheric horror game inspired by PSX-era visuals and low-poly environments.",
				"The experience focuses on mood, spatial unease, and subtle environmental storytelling.",
				"Built in Godot with intentional vertex instability and texture distortion to emulate retro rendering artifacts.",
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
			tags: ["WEB", "SYSTEMS", "ARCHIVE", "INTERFACE"],
			previewType: "interface",
			shortDesc: "Interactive system exploring game overload and digital excess.",
			fullDesc: [
				"Too Many Games is an interactive project examining digital saturation and content overload.",
				"The work presents a dense archive-like interface where games compete for attention.",
				"Explores navigation friction, interface noise, and the psychology of endless choice.",
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
			tags: ["SPECULATIVE", "SYSTEMS", "DESIGN", "WORLD-BUILDING"],
			previewType: "concept",
			shortDesc: "Speculative system design project exploring alternate structures of living.",
			fullDesc: [
				"LifeSE is a speculative design project exploring alternate systemic structures for everyday life.",
				"The project investigates constraint, optimisation, and how systems shape behaviour.",
				"Developed as a conceptual framework combining visual identity, documentation, and interactive elements.",
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
			tags: ["3D", "SPATIAL", "INTERACTION", "EXPERIMENTAL"],
			previewType: "spatial",
			shortDesc: "Spatial interaction experiment focused on rotation, gravity, and digital movement.",
			fullDesc: [
				"Orbit is a spatial interaction project built around rotation, gravity, and controlled movement.",
				"The experience explores circular logic, looping motion, and environmental responsiveness.",
				"Developed as an experimental 3D study in digital space and player orientation.",
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