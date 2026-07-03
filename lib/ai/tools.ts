import { ALLOWED_TABLE_NAMES } from '@/lib/ai/db-reader'

/**
 * OpenAI-compatible tool/function definition exposed to the model. This is
 * the only "database access" the model ever gets — a narrow, read-only,
 * pre-validated lookup. See lib/ai/db-reader.ts for the enforcement.
 */
export const AI_TOOLS = [
  {
    type: 'function' as const,
    function: {
      name: 'query_workspace_data',
      description:
        'Read additional read-only records from this workspace when the summary context is not enough to answer accurately (e.g. listing specific low-stock products, recent orders, or leads). ' +
        'Automatically scoped to the current workspace only — you cannot access other workspaces, and only a fixed, non-sensitive set of columns is ever returned. ' +
        `Allowed tables: ${ALLOWED_TABLE_NAMES.join(', ')}.`,
      parameters: {
        type: 'object',
        properties: {
          table: {
            type: 'string',
            enum: ALLOWED_TABLE_NAMES,
            description: 'Which table to read from.',
          },
          from: {
            type: 'string',
            description: 'Optional start date, YYYY-MM-DD.',
          },
          to: {
            type: 'string',
            description: 'Optional end date, YYYY-MM-DD.',
          },
          limit: {
            type: 'number',
            description: 'Max rows to return (default 20, hard-capped at 50).',
          },
        },
        required: ['table'],
      },
    },
  },
]
