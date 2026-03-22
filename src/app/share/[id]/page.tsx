// ============================================================
// /share/[id] — Individual Avatar Share Page
// ============================================================
// Shows the guest's matched avatar image with social share
// buttons. Reached after face identification.

'use client';

import { use, useEffect, useState } from 'react';

interface GuestFace {
  id: string;
  image: string;
  timestamp: number;
  name?: string;
}

// ─── Particle ────────────────────────────────────────────────
const PARTICLE_COLORS = ['#8ff5ff', '#00deec', '#4ade80', '#facc15', '#f472b6'];
const PARTICLES = Array.from({ length: 30 }, (_, i) => ({
  id: i,
  x: Math.random() * 100,
  delay: Math.random() * 3,
  duration: 3 + Math.random() * 4,
  size: 3 + Math.random() * 7,
  color: PARTICLE_COLORS[Math.floor(Math.random() * PARTICLE_COLORS.length)],
}));

// ─── Main Page ────────────────────────────────────────────────
export default function SharePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  const [face, setFace] = useState<GuestFace | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>(
    'loading',
  );
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);

  // Load face data: sessionStorage first (set by IdentifyStation on match),
  // fall back to API fetch for direct URL access or refresh.
  useEffect(() => {
    let cancelled = false;

    (async () => {
      // ── 1. Try sessionStorage (instant, no network) ──────────
      try {
        const cached = sessionStorage.getItem(`jg_face_${id}`);
        if (cached) {
          const parsed = JSON.parse(cached) as GuestFace;
          if (!cancelled) {
            setFace(parsed);
            setStatus('ready');
            return; // done — no API call needed
          }
        }
      } catch {
        // sessionStorage unavailable (private mode, etc.) — fall through
      }

      // ── 2. Fallback: fetch from API ───────────────────────────
      try {
        const res = await fetch(`/api/faces/${encodeURIComponent(id)}`, {
          cache: 'no-store',
        });
        if (!res.ok) throw new Error('Not found');
        const data = await res.json();
        if (!cancelled) {
          setFace(data.face);
          setStatus('ready');
        }
      } catch {
        if (!cancelled) setStatus('error');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [id]);

  const shareUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/share/${encodeURIComponent(id)}`
      : `/share/${encodeURIComponent(id)}`;

  const shareText =
    '🎉 ¡Me encontraron en Junkie Generation! Mira mi avatar aquí:';

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      /* blocked */
    }
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Junkie Generation',
          text: shareText,
          url: shareUrl,
        });
      } catch {
        /* cancelled */
      }
    }
  };

  const handleDownload = async () => {
    if (!face?.image) return;
    setDownloading(true);
    try {
      const res = await fetch(face.image);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `junkie-generation-${id}.jpg`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      window.open(face?.image, '_blank');
    } finally {
      setDownloading(false);
    }
  };

  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(`${shareText} ${shareUrl}`)}`;
  const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`;

  // ── Loading ──
  if (status === 'loading') {
    return (
      <main
        className="min-h-[100dvh] w-full flex items-center justify-center"
        style={{
          background:
            'radial-gradient(ellipse at 50% 30%, rgba(143,245,255,0.07) 0%, #000 70%)',
        }}
      >
        <div className="flex flex-col items-center gap-4">
          <div className="relative w-16 h-16">
            <div
              className="absolute inset-0 rounded-full border-2 border-[#8ff5ff]/20 animate-ping"
              style={{ animationDuration: '1.4s' }}
            />
            <div className="absolute inset-2 rounded-full border-2 border-t-[#8ff5ff] border-r-transparent border-b-transparent border-l-transparent animate-spin" />
          </div>
          <p
            className="text-[10px] font-black tracking-[0.3em] uppercase"
            style={{ color: '#8ff5ff' }}
          >
            LOADING_AVATAR...
          </p>
        </div>
      </main>
    );
  }

  // ── Error / Not Found ──
  if (status === 'error' || !face) {
    return (
      <main
        className="min-h-[100dvh] w-full flex items-center justify-center"
        style={{ background: '#000' }}
      >
        <div
          className="flex flex-col items-center gap-5 px-8 py-8 rounded-2xl text-center max-w-xs mx-4"
          style={{
            border: '1px solid rgba(239,68,68,0.2)',
            background: 'rgba(239,68,68,0.05)',
          }}
        >
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center"
            style={{ border: '2px solid rgba(239,68,68,0.4)' }}
          >
            <span className="text-red-400 text-3xl font-black">!</span>
          </div>
          <p className="text-red-400 text-xs font-black tracking-widest uppercase">
            ID_NOT_FOUND
          </p>
          <p className="text-[#aaabad] text-[11px] leading-relaxed">
            Este avatar ya no está disponible. Los registros se borran cuando el
            servidor reinicia.
          </p>
          <a
            href="/identify"
            className="mt-1 px-6 py-3 rounded-xl font-black text-xs tracking-widest uppercase transition-all hover:scale-105"
            style={{
              background: 'linear-gradient(135deg, #8ff5ff, #00deec)',
              color: '#005d63',
            }}
          >
            VOLVER_A_ESCANEAR
          </a>
        </div>
      </main>
    );
  }

  // ── Ready ──
  return (
    <>
      <main
        className="min-h-[100dvh] w-full flex flex-col items-center overflow-y-auto"
        style={{
          background:
            'radial-gradient(ellipse at 50% 20%, rgba(143,245,255,0.09) 0%, #000 65%)',
          fontFamily: "'Inter', 'Geist', system-ui, sans-serif",
        }}
      >
        {/* Floating particles */}
        <div className="pointer-events-none fixed inset-0 overflow-hidden z-0">
          {PARTICLES.map((p) => (
            <div
              key={p.id}
              className="absolute rounded-full"
              style={{
                left: `${p.x}%`,
                bottom: '-12px',
                width: p.size,
                height: p.size,
                background: p.color,
                boxShadow: `0 0 ${p.size * 2}px ${p.color}`,
                animation: `floatUp ${p.duration}s ${p.delay}s ease-in infinite`,
                opacity: 0.65,
              }}
            />
          ))}
        </div>

        {/* Card */}
        <div
          className="relative z-10 mx-auto mt-8 mb-12 w-full max-w-sm flex flex-col rounded-2xl overflow-hidden"
          style={{
            border: '1px solid rgba(143,245,255,0.2)',
            background: 'linear-gradient(180deg, #0f1215 0%, #0c0e10 100%)',
            boxShadow:
              '0 0 80px rgba(143,245,255,0.08), 0 0 160px rgba(0,222,236,0.04)',
          }}
        >
          {/* Accent bar */}
          <div
            className="h-[3px] w-full flex-none"
            style={{
              background:
                'linear-gradient(90deg, transparent 0%, #8ff5ff 30%, #00deec 50%, #8ff5ff 70%, transparent 100%)',
            }}
          />

          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 flex-none">
            <div>
              <p
                className="text-[10px] font-black tracking-[0.25em] uppercase"
                style={{ color: '#8ff5ff' }}
              >
                JUNKIE_GENERATION
              </p>
              <p
                className="text-[8px] font-bold tracking-widest mt-0.5"
                style={{ color: '#46484a' }}
              >
                ID_CONFIRMED · #{id.slice(0, 8).toUpperCase()}
              </p>
            </div>
            {/* HUD dot */}
            <div
              className="w-2.5 h-2.5 rounded-full animate-pulse"
              style={{ background: '#4ade80', boxShadow: '0 0 10px #4ade80' }}
            />
          </div>

          {/* ── Avatar Image ── */}
          <div className="px-5 flex-none">
            <div
              className="relative w-full rounded-xl overflow-hidden"
              style={{
                aspectRatio: '3/4',
                border: '2px solid rgba(143,245,255,0.28)',
                background: '#0a0c0e',
                boxShadow:
                  '0 0 50px rgba(143,245,255,0.15), inset 0 0 30px rgba(143,245,255,0.03)',
              }}
            >
              {/* Corner brackets */}
              {[
                'top-2.5 left-2.5 border-t-2 border-l-2',
                'top-2.5 right-2.5 border-t-2 border-r-2',
                'bottom-2.5 left-2.5 border-b-2 border-l-2',
                'bottom-2.5 right-2.5 border-b-2 border-r-2',
              ].map((cls, i) => (
                <div
                  key={i}
                  className={`absolute z-10 w-6 h-6 pointer-events-none ${cls}`}
                  style={{ borderColor: '#8ff5ff' }}
                />
              ))}

              <img
                src={face.image}
                alt="Tu avatar de Junkie Generation"
                className="w-full h-full object-cover"
              />

              {/* Scan line overlay */}
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  background:
                    'linear-gradient(180deg, rgba(143,245,255,0.04) 0%, transparent 30%, transparent 70%, rgba(143,245,255,0.04) 100%)',
                }}
              />

              {/* Bottom badge */}
              <div
                className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-2 px-3 py-1.5 rounded-full whitespace-nowrap"
                style={{
                  background: 'rgba(0,0,0,0.72)',
                  border: '1px solid rgba(143,245,255,0.2)',
                  backdropFilter: 'blur(10px)',
                }}
              >
                <div
                  className="w-1.5 h-1.5 rounded-full animate-pulse"
                  style={{
                    background: '#4ade80',
                    boxShadow: '0 0 6px #4ade80',
                  }}
                />
                <span
                  className="text-[9px] font-black tracking-widest"
                  style={{ color: '#8ff5ff' }}
                >
                  MATCH_VERIFIED
                </span>
              </div>
            </div>
          </div>

          {/* ── Name (if present) ── */}
          {face.name && (
            <div className="px-5 pt-4 text-center">
              <p className="text-white font-black text-xl tracking-tight">
                {face.name}
              </p>
            </div>
          )}

          {/* ── Share section ── */}
          <div className="px-5 pt-5 pb-2">
            <p
              className="text-[9px] font-black tracking-[0.2em] uppercase mb-3"
              style={{ color: '#aaabad' }}
            >
              COMPARTIR_AVATAR
            </p>

            {/* Row 1 — WhatsApp + X */}
            <div className="grid grid-cols-2 gap-2.5 mb-2.5">
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                id="share-whatsapp"
                className="flex items-center justify-center gap-2 py-3.5 rounded-xl font-black text-[11px] tracking-widest transition-all hover:scale-[1.03] active:scale-[0.97] text-white"
                style={{
                  background:
                    'linear-gradient(135deg, #25d366 0%, #128c7e 100%)',
                  boxShadow: '0 4px 20px rgba(37,211,102,0.28)',
                }}
              >
                {/* WhatsApp icon */}
                <svg
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
                  <path d="M12 0C5.373 0 0 5.373 0 12c0 2.124.556 4.118 1.528 5.845L0 24l6.335-1.517A11.945 11.945 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.886 0-3.655-.491-5.19-1.349l-.372-.22-3.762.901.938-3.666-.242-.374A10 10 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z" />
                </svg>
                WHATSAPP
              </a>

              <a
                href={twitterUrl}
                target="_blank"
                rel="noopener noreferrer"
                id="share-twitter"
                className="flex items-center justify-center gap-2 py-3.5 rounded-xl font-black text-[11px] tracking-widest transition-all hover:scale-[1.03] active:scale-[0.97] text-white"
                style={{
                  background: 'linear-gradient(135deg, #1a1a1a 0%, #000 100%)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
                }}
              >
                {/* X icon */}
                <svg
                  width="13"
                  height="13"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.213 5.567zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
                X / TWITTER
              </a>
            </div>

            {/* Row 2 — Download + Copy/Share */}
            <div className="grid grid-cols-2 gap-2.5 mb-2.5">
              <button
                id="share-download"
                onClick={handleDownload}
                disabled={downloading}
                className="flex items-center justify-center gap-2 py-3.5 rounded-xl font-black text-[11px] tracking-widest transition-all hover:scale-[1.03] active:scale-[0.97] disabled:opacity-60"
                style={{
                  background: 'rgba(143,245,255,0.07)',
                  color: '#8ff5ff',
                  border: '1px solid rgba(143,245,255,0.22)',
                }}
              >
                {downloading ? (
                  <svg
                    className="animate-spin"
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path
                      d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      strokeOpacity="0.25"
                    />
                    <path d="M21 12c0-4.97-4.03-9-9-9" />
                  </svg>
                ) : (
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  >
                    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
                  </svg>
                )}
                {downloading ? 'SAVING...' : 'DOWNLOAD'}
              </button>

              <button
                id="share-copy"
                onClick={
                  typeof window !== 'undefined' && !!navigator.share
                    ? handleNativeShare
                    : handleCopyLink
                }
                className="flex items-center justify-center gap-2 py-3.5 rounded-xl font-black text-[11px] tracking-widest transition-all hover:scale-[1.03] active:scale-[0.97]"
                style={{
                  background: copied
                    ? 'rgba(74,222,128,0.1)'
                    : 'rgba(143,245,255,0.07)',
                  color: copied ? '#4ade80' : '#8ff5ff',
                  border: `1px solid ${copied ? 'rgba(74,222,128,0.25)' : 'rgba(143,245,255,0.22)'}`,
                }}
              >
                {copied ? (
                  <>
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                    >
                      <path d="M20 6L9 17l-5-5" />
                    </svg>
                    COPIADO!
                  </>
                ) : typeof window !== 'undefined' && !!navigator.share ? (
                  <>
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                    >
                      <circle cx="18" cy="5" r="3" />
                      <circle cx="6" cy="12" r="3" />
                      <circle cx="18" cy="19" r="3" />
                      <path d="M8.59 13.51l6.83 3.98M15.41 6.51L8.59 10.49" />
                    </svg>
                    COMPARTIR
                  </>
                ) : (
                  <>
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                    >
                      <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" />
                    </svg>
                    COPY_LINK
                  </>
                )}
              </button>
            </div>

            {/* Scan again */}
            <a
              href="/identify"
              id="action-scan-again"
              className="w-full flex items-center justify-center gap-3 py-4 rounded-xl font-black text-[12px] tracking-[0.12em] uppercase transition-all hover:scale-[1.02] active:scale-[0.98]"
              style={{
                background: 'linear-gradient(135deg, #8ff5ff 0%, #00deec 100%)',
                color: '#005d63',
                boxShadow: '0 4px 30px rgba(143,245,255,0.2)',
              }}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
              >
                <path d="M1 4v6h6M23 20v-6h-6" />
                <path d="M20.49 9A9 9 0 005.64 5.64L1 10M23 14l-4.64 4.36A9 9 0 013.51 15" />
              </svg>
              ESCANEAR_DE_NUEVO
            </a>
          </div>

          {/* Footer */}
          <div className="px-5 py-4 text-center flex-none">
            <p
              className="text-[8px] font-bold tracking-widest"
              style={{ color: '#2a2e32' }}
            >
              JUNKIE_GENERATION · BIOMETRIC_ID · {new Date().getFullYear()}
            </p>
          </div>
        </div>
      </main>

      {/* Animations */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap');

        @keyframes floatUp {
          0%   { transform: translateY(0) scale(1);   opacity: 0.7; }
          80%  { opacity: 0.3; }
          100% { transform: translateY(-95vh) scale(0.3); opacity: 0; }
        }
      `,
        }}
      />
    </>
  );
}
