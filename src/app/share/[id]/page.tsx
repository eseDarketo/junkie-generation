// ============================================================
// /share/[id] — Individual Avatar Share Page — DEV B owns this file
// ============================================================

export default function SharePage({ params }: { params: { id: string } }) {
  return (
    <main className="min-h-screen flex items-center justify-center bg-black text-white">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-4">Your PartyFace</h1>
        <p className="text-gray-400">Guest ID: {params.id}</p>
        <p className="text-gray-500 mt-2">
          TODO (Dev B): Implement share page — avatar preview, GIF export,
          social share.
        </p>
      </div>
    </main>
  );
}
