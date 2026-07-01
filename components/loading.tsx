export function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-white/10 border-t-amber-500" />
    </div>
  )
}

export function LoadingPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950">
      <div className="text-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-white/10 border-t-amber-500 mx-auto" />
        <p className="mt-4 text-sm text-zinc-400">Loading...</p>
      </div>
    </div>
  )
}
