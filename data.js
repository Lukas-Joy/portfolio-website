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
		skills: ["GAME DESIGN", "3D", "UI/UX", "PSX AESTHETIC", "GODOT", "UNREAL"],
	},

	contact: {
		email: "lukasjoygames@gmail.com",
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
			year: "2024",
			type: "GAME",
			tags: ["GODOT", "EXPERIMENTAL", "SYSTEMS", "MINIMAL"],
			previewType: "abstract",
			shortDesc: "Abstract systems-driven game built around rule interpretation and constraint.",
			fullDesc: [
				"Circle Means Orange is a minimalist experimental game about systems and rule perception.",
				"The player navigates an abstract space where visual symbols define mechanical logic. Meaning is not explained — it must be inferred.",
				"Built in Godot as an exploration of constraint-based design and authored rule systems.",
			],
			playUrl: "#",
			platform: "PC",
			duration: "~15–25 min",
		},

		{
			key: "crackdown",
			title: "CRACKDOWN",
			icon: "🔒",
			year: "2024",
			type: "GAME",
			tags: ["UNITY", "3D", "ACTION", "EXPERIMENTAL"],
			previewType: "action",
			shortDesc: "Tight 3D action prototype focused on movement and environmental pressure.",
			fullDesc: [
				"Crackdown is a fast-paced 3D action prototype exploring spatial control and movement tension.",
				"The game focuses on player positioning, restricted environments, and escalating mechanical pressure.",
				"Built as an experiment in clarity, impact feedback, and constrained level design.",
			],
			playUrl: "#",
			platform: "PC",
			duration: "Prototype",
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
			playUrl: "#",
			platform: "PC",
			duration: "~20 min",
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
			platform: "Web",
			duration: "Interactive",
		},

		{
			key: "lifese",
			title: "LIFESE",
			icon: "◼",
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
			platform: "Concept / Digital",
			duration: "Ongoing",
		},

		{
			key: "orbit",
			title: "ORBIT",
			icon: "🛰",
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
			platform: "3D Interactive",
			duration: "Prototype",
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