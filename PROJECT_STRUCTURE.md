# Project Structure and Rules

## Overview
This workspace contains a Finance Progressive Web Application (PWA) with a dedicated tracker module. The project is built using modern web technologies focusing on performance, local-first data privacy, and a premium user experience.

## Directory Structure

### Root: `finance_pwa`
The main application shell and logic.

- **`src/`**: Core source code for the main PWA.
  - **`components/`**: Reusable UI components.
  - **`pages/`**: Route components (Dashboard, Transactions, etc.).
  - **`db/`**: Local database configuration (SQLite/IndexedDB).
  - **`services/`**: External service integrations.
  - **`utils/`**: Helper functions and parsers.
  - **`hooks/`**: Custom React hooks (e.g., `useDriveSync`).
- **`dist/`**: Production build artifacts.
- **`ownfinance-tracker/`**: A nested, standalone React application (intended for separate deployment/repo).
- **`public/`**: Static assets.

### Module: `ownfinance-tracker`
A self-contained tracker application (likely for marketing or simplified tracking).

- **`App.tsx`**: Main entry point and router configuration.
- **`pages/`**: Application pages (`Landing`, `Dashboard`, `Transactions`, `Upload`, `EmailSetup`).
- **`components/`**: Specific components like `AIChat`.
- **`index.css`**: Global styles and Tailwind theme configuration.

## Technology Stack

- **Framework**: React 19 + TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS v4 (Alpha/Beta)
- **AI Integration**: Google GenAI SDK (`@google/genai`)
- **Routing**: React Router DOM v7
- **Charts**: Recharts

## Development Rules & Guidelines

### 1. Code Style & Quality
- **TypeScript**: Use strict typing. Avoid `any` wherever possible. Define interfaces for all data models (Transaction, Category, etc.).
- **Components**: Functional components only. Keep components small or focused on a single responsibility.
- **Styling**: Use utility classes (Tailwind) for styling. Define core colors/fonts in the CSS theme/variables for consistency.
- **State Management**: Use React Context for global state (e.g., `FinanceContext`) and local state for UI interactions.

### 2. File Organization
- Place components used in multiple pages in `components/`.
- Place page-specific logic in `pages/`.
- Keep utility functions pure and testable in `utils/`.

### 3. Data & Privacy (Critical)
- **Local-First**: User data (transactions, credentials) must remain on the client-side (IndexedDB/SQLite or LocalStorage).
- **No Remote Storage**: Do not send financial data to external servers unless explicitly for AI processing (and ensure privacy/anonymity).

### 4. Git & Version Control
- The `ownfinance-tracker` directory contains its own `.git` folder, indicating it is managed as a separate repository. Ensure changes are committed purely within that scope when working on the tracker.

### 5. UI/UX Principles
- **Aesthetics**: Focus on "rich aesthetics"—gradients, glassmorphism, micro-animations, and clean typography (Manrope).
- **Responsiveness**: All pages must be fully responsive (Mobile/Desktop).
- **Feedback**: Provide immediate visual feedback for user actions (buttons, form submissions).

## Architecture Notes
- The `ownfinance-tracker` appears to use a simpler state management (Context API with Mock Data/State) compared to the main `finance_pwa` which uses a more robust DB approach (`initDB`).
- When extracting code for the "separate github repo" (the tracker), ensure dependencies on the parent `node_modules` are resolved or that the tracker's `package.json` is self-sufficient.
