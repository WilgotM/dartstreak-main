---
name: UI Scaffolding
description: Templates and patterns for consistent UI development using React, Tailwind CSS, and shadcn/ui.
---

# UI Scaffolding

This skill provides boilerplate code and layout patterns to speed up the development of new pages and components.

## New Page Template

Use this template for new route components in `src/pages/`.

```tsx
import React from 'react';
import { useTranslation } from 'react-i18next';
import MobileHeader from '@/components/MobileHeader';
import AppLayout from '@/components/AppLayout';

const NewPage: React.FC = () => {
  const { t } = useTranslation();

  return (
    <AppLayout>
      <div className="flex flex-col h-full bg-background pb-16 md:pb-0">
        <MobileHeader title={t('nav.newpage_title')} />
        <main className="flex-1 overflow-y-auto p-4">
          <div className="max-w-4xl mx-auto space-y-6">
            <h1 className="text-2xl font-bold">{t('newpage.welcome')}</h1>
            {/* Content goes here */}
          </div>
        </main>
      </div>
    </AppLayout>
  );
};

export default NewPage;
```

## Component Patterns

### Basic Component with Tailwind
```tsx
import { cn } from "@/lib/utils";

interface MyComponentProps {
  className?: string;
  children: React.ReactNode;
}

export const MyComponent = ({ className, children }: MyComponentProps) => {
  return (
    <div className={cn("p-4 rounded-lg bg-secondary", className)}>
      {children}
    </div>
  );
};
```

### Using shadcn/ui
Always prefer shadcn/ui components for primitives like buttons, dialogs, and cards.
```tsx
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
```

## Design Guidelines
- **Mobile First**: Design for mobile devices first, then add responsive classes for larger screens.
- **Consistency**: Use the design system defined in `tailwind.config.ts` and `src/index.css`.
- **Interactivity**: Add hover effects and micro-animations to make the interface feel "alive".
- **Glassmorphism**: Use `bg-background/80 backdrop-blur-sm` for overlays and sticky headers.
