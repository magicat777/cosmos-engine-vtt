# Cosmos Engine VTT

A modern web-based Virtual Tabletop (VTT) implementation for the Cosmos Engine RPG system.

## Overview

Cosmos Engine VTT provides digital tools and interactive components for playing Cosmos Engine RPG online or in-person with digital assistance. Built with a focus on clean architecture, performance, and avoiding the pitfalls of previous VTT development attempts.

## Features

- **Character Sheet Management**: Interactive character sheets with auto-calculations
- **2d10 Dice System**: Specialized dice roller with advantage/disadvantage
- **Scale Integration**: Seamless personal → vehicle → starship → capital combat
- **Rules Reference**: Searchable, indexed rules database
- **Combat Tracker**: Multi-scale initiative and damage tracking
- **Progressive Web App**: Offline capable, installable

## Technology Stack

- **Frontend**: Vanilla JavaScript (ES6+) with Web Components
- **Styling**: CSS Custom Properties, CSS Grid/Flexbox
- **Data**: JSON-based, fetched from main RPG repository
- **Deployment**: GitHub Pages, static site
- **Build**: Vite for development, Rollup for production

## Project Structure

```
cosmos-engine-vtt/
├── public/              # Static files for GitHub Pages
│   ├── index.html      # Single entry point
│   ├── manifest.json   # PWA configuration
│   └── service-worker.js
├── src/
│   ├── components/     # Web components (max 10 core)
│   ├── data/           # Local JSON data files
│   ├── styles/         # CSS modules
│   ├── utils/          # Helper functions
│   └── lib/            # Third-party libraries
├── tests/              # Test suites
├── docs/               # Technical documentation
├── scripts/            # Build and deployment scripts
└── build/              # Build output (gitignored)
```

## Development Guidelines

### Core Principles

1. **Single Responsibility**: Each component does one thing well
2. **Data-Driven**: Rules and content in JSON, not hardcoded
3. **Clean Architecture**: Clear separation of concerns
4. **Mobile-First**: Responsive design from the start
5. **Performance**: Lazy loading, efficient rendering

### Component Discipline

- Maximum 10 core components
- No "fix" files - fix the original
- Clear public API for each component
- Comprehensive documentation

### File Organization

- `src/` - Development files only
- `public/` - Deployment-ready files
- `docs/` - Documentation only (no code)
- Clear build pipeline: src → public

## Quick Start

```bash
# Install dependencies
npm install

# Development server
npm run dev

# Build for production
npm run build

# Deploy to GitHub Pages
npm run deploy
```

## Links

- [Cosmos Engine RPG Rules](https://github.com/magicat777/CosmosEngineRPG)
- [Live VTT](https://magicat777.github.io/cosmos-engine-vtt)
- [API Documentation](./docs/api.md)

## License

[License details to be determined]

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for development guidelines.