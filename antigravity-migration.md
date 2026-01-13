# Antigravity Migration Guide: DartStreak

This document provides a comprehensive overview of the DartStreak codebase and instructions for moving away from Lovable.dev to a local development environment and a standalone Supabase instance.

## Codebase Overview

DartStreak is a Fantasy Darts application built with:
- **Frontend**: React (with TypeScript), Vite, and Shadcn UI.
- **Styling**: Tailwind CSS.
- **State Management**: React Query (TanStack Query).
- **Backend/Database**: Supabase.
- **Internationalization**: i18next.

### Key Directories
- `src/components`: UI components, many of which are from Shadcn UI.
- `src/pages`: Main application views.
- `src/hooks`: Custom React hooks, including Supabase-related queries.
- `src/integrations/supabase`: Supabase client configuration and auto-generated types.

---

## Local Development Setup

To run this project on your local machine, follow these steps:

### 1. Prerequisites
- **Node.js**: Version 18 or higher is recommended.
- **Package Manager**: `npm` or `bun` (the codebase contains a `bun.lockb` but also a `package-lock.json`).

### 2. Installation
Clone the repository and install dependencies:
```bash
npm install
```

### 3. Environment Variables
Create a `.env` file in the root directory (if it doesn't exist) and add your Supabase credentials:
```env
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_PUBLISHABLE_KEY=your-supabase-anon-key
```

### 4. Running the App
Start the development server:
```bash
npm run dev
```
The app will typically be available at `http://localhost:8080`.

---

## Moving from Lovable Cloud to Standalone Supabase

If you want to move your backend from the Lovable-managed Supabase to your own project, follow these steps:

### 1. Create a New Supabase Project
1.  Go to [Supabase.com](https://supabase.com/) and create a new project.
2.  Note down the `URL` and `Anon Key` from the API settings.

### 2. Migrate Database Schema
You have two main options:

#### Option A: Using the Supabase CLI (Recommended)
1.  **Initialize Supabase locally**:
    ```bash
    npx supabase init
    ```
2.  **Pull the schema from Lovable**:
    Since Lovable managed the database, you might need to use the Supabase CLI to `db pull` if you have access to the Lovable-provided connection string, OR manually export the schema.
3.  **Push to new project**:
    ```bash
    npx supabase login
    npx supabase link --project-ref your-new-project-id
    npx supabase db push
    ```

#### Option B: Manual Export/Import
1.  In the Lovable Supabase Dashboard (if accessible), go to **SQL Editor** or **Database** settings.
2.  Export the table definitions (DDL).
3.  Run the exported SQL in your new Supabase project's SQL Editor.

### 3. Update Application Credentials
Update your `.env` file with the new `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`.

---

## Post-Migration Cleanup

This codebase has been cleaned of Lovable dependencies. The following changes were made:
1.  Removed `lovable-tagger` from `package.json`.
2.  Removed the `componentTagger` plugin from `vite.config.ts`.
3.  Cleaned up `index.html` metadata.

> [!TIP]
> To keep your types in sync with your new Supabase database, run:
> `npx supabase gen types typescript --project-id your-new-project-id > src/integrations/supabase/types.ts`
