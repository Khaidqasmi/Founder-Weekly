export function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#e4defa] border-t-[#ec4899]" />
    </div>
  )
}

export function LoadingPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f5f3fb]">
      <div className="text-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#e4defa] border-t-[#ec4899] mx-auto" />
        <p className="mt-4 text-sm text-[#6d64b8]">Loading...</p>
      </div>
    </div>
  )
}
