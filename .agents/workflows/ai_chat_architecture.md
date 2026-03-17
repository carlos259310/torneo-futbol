---
description: AI Chat Architecture and Guidelines
---

# AI Chat Architecture

This document describes the architecture of the AI Chat feature for the Torneo de Fútbol project.

## Overview
The chat feature acts as an AI Technical Assistant (DT IA) for the "Tránsito de Girón" team. It uses the official Google Gen AI SDK (`@google/genai`) to communicate with Gemini models.

## Backend (`src/pages/api/chat.ts`)
- **API Framework**: Astro APIRoute
- **Model SDK**: `@google/genai`
- **Data Context**:
  - The backend loads JSON data from `/public/data/` (`roster.json`, `results.json`, `tournament_info.json`).
  - This data is minified and injected directly into the Gemini `systemInstruction`.
- **Memory (Supabase)**:
  - The API uses Supabase to persist user conversations (`ai_memory` table) so the AI remembers past interactions.
  - It uses a "smart fetch" mechanism matching normalized player names inside the user's prompt to inject relevant past context.

## Frontend (`public/ai-chat.js`)
- **Vanilla JS**: The frontend is a vanilla JS class `AIChat`.
- **UI Elements**: Toggles chat visibility, sends messages, and renders Markdown responses.
- **Provider**: Hardcoded to `gemini` (supporting multiple model versions like Flash and Pro).
- **History Management**: Keeps a maximum sequence of the last 10 messages before sending them to the backend to conserve context token limits.

## How to Work on the Chat
1. **Changing the Prompt**: Edit the `systemContext` variable in `src/pages/api/chat.ts`.
2. **Changing the Model**: The frontend `updateModelSelector()` holds the available list of models.
3. **Database Changes**: The AI writes to exactly one table `ai_memory`. It expects the following columns: `user_query`, `ai_response`, `players` (array of text), `created_at`.
