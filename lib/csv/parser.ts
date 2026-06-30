import Papa from 'papaparse'

export interface ParseResult {
  data: Record<string, string>[]
  errors: string[]
  headers: string[]
}

export function parseCSV(file: File): Promise<ParseResult> {
  return new Promise((resolve) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete(results) {
        const headers = results.meta.fields || []
        const errors = results.errors.map((e) => `Row ${e.row}: ${e.message}`)
        resolve({ data: results.data as Record<string, string>[], errors, headers })
      },
      error(err) {
        resolve({ data: [], errors: [err.message], headers: [] })
      },
    })
  })
}

export const REQUIRED_COLUMNS: Record<string, string[]> = {
  orders: ['order_date', 'product_name', 'quantity', 'selling_price'],
  ads: ['date', 'campaign_name', 'ad_spend'],
  leads: ['date', 'lead_name'],
  inventory: ['product_name', 'current_stock', 'reorder_level'],
}

export function validateColumns(headers: string[], type: string): string[] {
  const required = REQUIRED_COLUMNS[type] || []
  return required.filter((col) => !headers.includes(col))
}

export function mapRow(row: Record<string, string>, mapping: Record<string, string>): Record<string, string> {
  const mapped: Record<string, string> = {}
  for (const [target, source] of Object.entries(mapping)) {
    mapped[target] = row[source] || ''
  }
  return mapped
}
