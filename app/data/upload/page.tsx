'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Label } from '@/components/ui/label'
import { parseCSV, validateColumns, REQUIRED_COLUMNS } from '@/lib/csv/parser'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import Link from 'next/link'

const UPLOAD_TYPES = [
  { value: 'orders', label: 'Orders' },
  { value: 'ads', label: 'Ads' },
  { value: 'leads', label: 'Leads' },
  { value: 'inventory', label: 'Inventory' },
]

export default function UploadPage() {
  const [uploadType, setUploadType] = useState('orders')
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<Record<string, string>[]>([])
  const [headers, setHeaders] = useState<string[]>([])
  const [errors, setErrors] = useState<string[]>([])
  const [uploading, setUploading] = useState(false)
  const [done, setDone] = useState(false)

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    setFile(f)
    setDone(false)

    const result = await parseCSV(f)
    setHeaders(result.headers)
    setPreview(result.data.slice(0, 5))
    setErrors(result.errors)

    const missingCols = validateColumns(result.headers, uploadType)
    if (missingCols.length > 0) {
      setErrors((prev) => [`Missing required columns: ${missingCols.join(', ')}`, ...prev])
    }
  }

  async function handleUpload() {
    if (!file || preview.length === 0) return
    setUploading(true)

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setUploading(false); return }

    const { data: member } = await supabase
      .from('workspace_members')
      .select('workspace_id')
      .eq('user_id', user.id)
      .single()

    if (!member) { setUploading(false); return }

    const fullResult = await parseCSV(file)
    const rows = fullResult.data

    const tableName = uploadType === 'inventory' ? 'inventory' : uploadType
    const mapped = rows.map((row) => {
      const cleaned: Record<string, unknown> = { workspace_id: member.workspace_id }
      for (const [key, val] of Object.entries(row)) {
        const k = key.trim().toLowerCase().replace(/\s+/g, '_')
        if (['quantity', 'selling_price', 'revenue', 'ad_spend', 'impressions', 'reach',
          'clicks', 'purchases', 'purchase_revenue', 'lead_value', 'current_stock',
          'reorder_level', 'cost_price'].includes(k)) {
          cleaned[k] = Number(val) || 0
        } else {
          cleaned[k] = val
        }
      }
      if (uploadType === 'orders' && !cleaned.revenue) {
        cleaned.revenue = (Number(cleaned.quantity) || 0) * (Number(cleaned.selling_price) || 0)
      }
      return cleaned
    })

    const { error } = await supabase.from(tableName).insert(mapped)

    await supabase.from('csv_uploads').insert({
      workspace_id: member.workspace_id,
      file_name: file.name,
      upload_type: uploadType,
      row_count: mapped.length,
      status: error ? 'failed' : 'success',
      error_message: error?.message || '',
    })

    if (error) {
      toast.error(`Upload failed: ${error.message}`)
    } else {
      toast.success(`${mapped.length} rows uploaded successfully!`)
      setDone(true)
    }
    setUploading(false)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      
      <div className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Upload CSV Data</h1>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Download Sample Files</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              <Link href="/sample-csv/orders-sample.csv" className="text-sm text-blue-600 hover:underline" download>Orders Sample</Link>
              <Link href="/sample-csv/ads-sample.csv" className="text-sm text-blue-600 hover:underline" download>Ads Sample</Link>
              <Link href="/sample-csv/leads-sample.csv" className="text-sm text-blue-600 hover:underline" download>Leads Sample</Link>
              <Link href="/sample-csv/inventory-sample.csv" className="text-sm text-blue-600 hover:underline" download>Inventory Sample</Link>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6 space-y-4">
            <div>
              <Label>Upload Type</Label>
              <Select value={uploadType} onValueChange={(v: string | null) => v && setUploadType(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {UPLOAD_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500 mt-1">
                Required columns: {REQUIRED_COLUMNS[uploadType]?.join(', ')}
              </p>
            </div>

            <div>
              <Label>CSV File</Label>
              <input type="file" accept=".csv" onChange={handleFileSelect} className="block mt-1 text-sm" />
            </div>

            {errors.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded p-3">
                {errors.map((e, i) => <p key={i} className="text-sm text-red-700">{e}</p>)}
              </div>
            )}

            {preview.length > 0 && (
              <div>
                <h3 className="text-sm font-medium mb-2">Preview (first 5 rows)</h3>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {headers.map((h) => <TableHead key={h}>{h}</TableHead>)}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {preview.map((row, i) => (
                        <TableRow key={i}>
                          {headers.map((h) => <TableCell key={h}>{row[h]}</TableCell>)}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}

            {preview.length > 0 && !done && (
              <Button onClick={handleUpload} disabled={uploading || errors.some((e) => e.startsWith('Missing'))}>
                {uploading ? 'Uploading...' : 'Upload All Rows'}
              </Button>
            )}

            {done && <p className="text-green-600 font-medium">Upload complete! Your dashboard will update automatically.</p>}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
