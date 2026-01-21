---
name: Supabase Development
description: Guidelines and best practices for Supabase development (RPCs, Edge Functions, Migrations).
---

# Supabase Development

This skill provides a standard workflow for interacting with Supabase in the DartStreak project.

## Database Migrations

### Creating a Migration
1.  Navigate to `supabase/migrations/`.
2.  Create a new file with a timestamp prefix: `YYYYMMDDHHMMSS_description.sql`.
3.  Add your SQL changes (tables, constraints, functions, RLS policies).

### Important Considerations
- **Permissions**: If a migration fails due to permissions, verify that you are using the correct role or that the migration is being applied through the Supabase CLI/UI with sufficient privileges.
- **Constraints**: Always add unique constraints where appropriate (e.g., `UNIQUE(tournament_id, seed)` in `tournament_participants`) to prevent data inconsistency.

## Edge Functions

### Creating an Edge Function
1.  Navigate to `supabase/functions/`.
2.  Create a new directory for your function.
3.  Add `index.ts` with your Deno-based function logic.

### Invoking Edge Functions
Use the Supabase client:
```typescript
const { data, error } = await supabase.functions.invoke('function-name', {
  body: { foo: 'bar' }
});
```

## RPCs (Remote Procedure Calls)
Use RPCs for complex logic that should run on the server side to avoid race conditions or unnecessary data transfer.

### Creating an RPC
Define the function in a migration:
```sql
CREATE OR REPLACE FUNCTION handle_walkover(match_id UUID)
RETURNS VOID AS $$
BEGIN
  -- Logic here
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Invoking an RPC
```typescript
const { error } = await supabase.rpc('handle_walkover', { match_id: '...' });
```

## Security
- **RLS (Row Level Security)**: Ensure every new table has RLS enabled and appropriate policies defined.
- **Security Definer**: Use `SECURITY DEFINER` for RPCs that need to bypass RLS or perform admin-level actions, but use it sparingly and carefully.
