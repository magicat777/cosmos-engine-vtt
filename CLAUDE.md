# CLAUDE.md - Cosmos Engine VTT Development Guide

This file provides guidance to Claude Code when working with the Cosmos Engine VTT project.

## Project Overview

Cosmos Engine VTT is a web-based virtual tabletop application for the Cosmos Engine RPG. This project was created specifically to avoid the architectural issues encountered in the cyberpunk-gm-screen project.

## Critical Architecture Rules

### File Organization (STRICT)

```
public/         # GitHub Pages deployment root
├── index.html  # ONLY entry point
├── assets/     # Compiled CSS/JS goes here
└── data/       # Static JSON data

src/            # Development files ONLY
├── components/ # Web Components (10 max)
├── styles/     # CSS source files
├── data/      # JSON source files
└── utils/     # Helper functions

docs/          # Documentation ONLY
└── *.md       # No code files here
```

### Component Rules

1. **Maximum 10 Core Components**
   - CharacterSheet
   - DiceRoller
   - CombatTracker
   - ScaleManager
   - RulesReference
   - PanelSystem
   - DataManager
   - AuthManager
   - ThemeManager
   - PerformanceMonitor

2. **No Fix Files**
   - NEVER create `component-fixed.js`
   - Fix issues in the original file
   - Use version control for history

3. **Single Responsibility**
   - Each component has ONE clear purpose
   - Public API must be documented
   - No circular dependencies

### Data Management

1. **JSON Data Files**
   - All game rules in JSON format
   - Fetched from main RPG repo when possible
   - Local cache for offline use

2. **Data Sources**
   ```javascript
   const COSMOS_RPG_REPO = 'https://raw.githubusercontent.com/magicat777/CosmosEngineRPG/main/';
   const LOCAL_DATA = './data/';
   ```

### Build Process

1. **Development**: `src/` files served directly
2. **Production**: `src/` → `public/` via build script
3. **Deployment**: `public/` → GitHub Pages

### Common Pitfalls to Avoid

1. **Multiple HTML Entry Points**
   - ❌ index.html, app.html, vtt.html
   - ✅ ONLY index.html with route-based navigation

2. **Scattered Configuration**
   - ❌ Config in multiple files
   - ✅ Single config.json or environment

3. **Component Explosion**
   - ❌ 60+ component files
   - ✅ 10 core components maximum

4. **Unclear Build/Deploy**
   - ❌ Mixed source and built files
   - ✅ Clear src → public pipeline

## Development Workflow

1. All development in `src/`
2. Test locally with `npm run dev`
3. Build to `public/` with `npm run build`
4. Deploy `public/` to GitHub Pages

## Technical Decisions

- **No Framework**: Vanilla JS with Web Components
- **No TypeScript**: Keep it simple initially
- **CSS Modules**: Scoped styling per component
- **ES6 Modules**: Native browser imports
- **PWA First**: Offline capability from day one

## Current Development Phase

Phase 1: Foundation (Active)
- Basic project structure ✅
- Core component shells
- Data pipeline design
- Development tooling

## Testing Strategy

- Unit tests for utilities
- Component tests for UI
- Integration tests for data flow
- Manual testing checklist

## Performance Targets

- First paint: <1 second
- Interactive: <3 seconds
- Offline capable
- Mobile responsive

## Next Steps

1. Create core component shells
2. Set up build pipeline
3. Implement data fetching
4. Create first working component (DiceRoller)