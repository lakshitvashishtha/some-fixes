# Codefiesta 5.0 - Flagship National Level 24-Hour Hackathon

Official platform for **Codefiesta 5.0**, hosted at Global Institute of Technology (GIT), Jaipur.

## 🚀 Overview

Codefiesta 5.0 is an annual national 24-hour hackathon bringing together over 1000+ developers, designers, and innovators across India. This repository contains the complete frontend landing platform with interactive 3D voxel typography, Three.js Saturn cosmic scenes, animated timeline arcs, floating asteroid track rings, glimpse gallery, ₹7,00,000+ prize pool, and official coordinators roster.

---

## 🛠️ Tech Stack

- **Core**: React 19, Vite, React Router DOM v7
- **Styling**: Tailwind CSS v4, custom retro cyberpunk arcade theme
- **3D Graphics & Shaders**: Three.js (Saturn planet textures, atmospheric glow, particle starfields, 14 asteroid theme rocks)
- **Audio Engine**: Web Audio API (real-time 8-bit square wave chiptune synth with frequency ramps and toggle controls)
- **Physics & Motion**: Framer Motion, Lenis smooth scroll engine, velocity-based custom spaceship particle cursor
- **Icons**: Lucide React

---

## 🗺️ Architecture

| Route | View | Description |
|---|---|---|
| `/` | Landing Experience | 6 interactive sections: 3D Mouse-tilt Hero, Marquee, 3D Saturn Themes Carousel (14 Tracks), Milestone Timeline, Glimpse Polaroid Gallery, ₹7,00,000+ Prize Pool, Conveners & Coordinators Team Grid, and Concise Official Transmission Footer |

---

## 💻 Development & Build

### Prerequisites
- Node.js (v18+)
- npm or yarn or pnpm

### Installation
```bash
npm install
```

### Run Local Development Server
```bash
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

### Build for Production
```bash
npm run build
```
Generates an optimized, minified production build in the `dist/` folder.

### Preview Production Build
```bash
npm run preview
```

---

## 🎮 Easter Eggs & Controls
- **Spacebar**: Press `Space` anywhere on the home screen to trigger the Codefiesta 5.0 Arena launch notification.
- **Retro Audio**: Click the speaker icon in the top header to toggle the 8-bit chiptune sound effects.
- **Mouse Tilt**: Move your cursor or swipe on mobile across the hero section to tilt the 3D voxel `CODE FIESTA 5.0` title and dynamically cast extruded shadows.
- **Spaceship Cursor**: Move your mouse across desktop screens to pilot a particle-emitting spaceship cursor with physics thrusters.

