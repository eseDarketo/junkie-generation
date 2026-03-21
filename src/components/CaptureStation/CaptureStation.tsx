'use client';

import React, { useEffect, useState } from 'react';
import { useWebcam } from './useWebcam';
import { toast } from 'sonner';

// Custom colors mapped to arbitrary tailwind values to avoid dirtying global configs
const colors = {
  background: 'bg-[#0c0e10]',
  surface: 'bg-[#0c0e10]', // same as background based on spec
  surfaceHigh: 'bg-[#232629]',
  surfaceMed: 'bg-[#171a1c]',
  surfaceLow: 'bg-[#111416]',
  surfaceLowest: 'bg-[#000000]',
  primary: 'text-[#8ff5ff]',
  bgPrimary: 'bg-[#8ff5ff]',
  borderPrimary: 'border-[#8ff5ff]',
  primaryDim: 'to-[#00deec]', // for gradient
  onSurface: 'text-[#f1f0f3]',
  onSurfaceVariant: 'text-[#aaabad]',
  outlineVariant: 'border-[#46484a]',
};

// Font imports through google fonts from layout
// But we can just use normal sans if they aren't loaded, or standard tailwind classes 
// for the cyber feel we use uppercase, tracking-widest, font-mono or sans.

export function CaptureStation() {
  const { videoRef, stream, isInitializing, error, startWebcam, stopWebcam } = useWebcam();
  const [status, setStatus] = useState<'idle' | 'starting' | 'active' | 'error'>('idle');

  useEffect(() => {
    if (isInitializing) setStatus('starting');
    else if (error) setStatus('error');
    else if (stream) setStatus('active');
    else setStatus('idle');
  }, [isInitializing, stream, error]);

  const toggleWebcam = () => {
    if (stream) {
      stopWebcam();
    } else {
      startWebcam();
    }
  };

  useEffect(() => {
    if (error) {
      toast.error('Error con la cámara', {
        description: error.message || 'No se pudo acceder.',
      });
    }
  }, [error]);

  return (
    <div className={`min-h-screen ${colors.background} ${colors.onSurface} font-sans selection:bg-[#8ff5ff] selection:text-[#005d63] relative overflow-x-hidden`}>
      
      {/* TopAppBar */}
      <header className="fixed top-0 w-full z-50 flex justify-between items-center px-6 h-14 bg-[#0c0e10]/80 backdrop-blur-xl border-b border-[#8ff5ff]/10 shadow-[0_0_20px_rgba(143,245,255,0.04)]">
        <div className="flex items-center gap-4">
          <span className="text-[#8ff5ff] font-bold tracking-tighter text-xl">SYS_REF_04</span>
          <div className="h-4 w-px bg-[#46484a]/30"></div>
          <span className="uppercase tracking-[0.05em] text-sm font-bold text-[#8ff5ff]">TERMINAL_ACTIVE</span>
        </div>
        <div className="hidden md:flex gap-8 items-center h-full">
          <nav className="flex gap-6 h-full items-center">
            <span className="text-[#8ff5ff] border-b-2 border-[#8ff5ff] h-full flex items-center text-[10px] uppercase font-bold tracking-widest">LIVE_SCAN</span>
          </nav>
        </div>
      </header>

      {/* Main Content Canvas (No Sidebar) */}
      <main className="pt-14 min-h-screen relative overflow-hidden">
        
        {/* Status Bar */}
        <div className={`w-full h-8 ${colors.surfaceHigh} flex items-center justify-between px-6 border-b ${colors.outlineVariant}/20`}>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <div className={`w-1.5 h-1.5 rounded-full ${colors.bgPrimary} ${stream ? 'animate-pulse' : 'opacity-30'} shadow-[0_0_8px_#8ff5ff]`}></div>
              <span className={`text-[10px] ${colors.onSurfaceVariant} font-medium tracking-tight`}>
                {status === 'active' ? 'LATENCY: 12ms' : 'LATENCY: N/A'}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-4 hidden sm:flex">
            <span className="text-[10px] text-[#8ff5ff] font-bold tracking-widest uppercase">ENCRYPTION: AES-256_ACTIVE</span>
            <span className={`text-[10px] ${colors.onSurfaceVariant}`}>UTC: {new Date().toISOString().substring(11,19)}</span>
          </div>
        </div>

        <div className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 max-w-[1600px] mx-auto">
          
          {/* Central Capture Area */}
          <div className="lg:col-span-8 space-y-4">
            <div className={`relative aspect-video ${colors.surfaceLowest} border ${colors.borderPrimary}/20 rounded-lg overflow-hidden group`}>
              
              {!stream && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-[#46484a] z-10">
                  <span className="text-xl mb-2 font-mono uppercase tracking-widest">
                    {status === 'idle' ? 'CAMERA_OFFLINE' : status === 'starting' ? 'INITIALIZING...' : 'ERROR'}
                  </span>
                </div>
              )}

              {/* Video Element replacing img */}
              <video 
                ref={videoRef}
                autoPlay 
                playsInline 
                muted 
                className={`w-full h-full object-cover transform scale-x-[-1] transition-opacity duration-1000 ${stream ? 'opacity-80 grayscale' : 'opacity-0'}`}
              />
              
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#8ff5ff]/5 to-transparent h-[2px] w-full animate-[scan_3s_linear_infinite]"></div>

              {/* HUD Overlay */}
              <div className="absolute inset-0 p-4 sm:p-8 flex flex-col justify-between pointer-events-none">
                <div className="flex justify-between items-start">
                  <div className="flex flex-col gap-1">
                    <div className="w-8 h-8 border-t-2 border-l-2 border-[#8ff5ff]"></div>
                    <div className="text-[#8ff5ff] text-xs font-bold tracking-widest">
                      {stream ? 'SCAN_ACTIVE [L_77]' : 'SCAN_OFFLINE'}
                    </div>
                  </div>
                  <div className="flex flex-col gap-1 items-end">
                    <div className="w-8 h-8 border-t-2 border-r-2 border-[#8ff5ff]"></div>
                    <div className="text-[#aaabad] text-[10px]">CAM_ID: SEC_401</div>
                  </div>
                </div>

                {/* Central Bounding Box */}
                {stream && (
                  <div className="self-center w-48 h-64 sm:w-64 sm:h-80 border border-[#8ff5ff]/30 relative flex items-center justify-center">
                    <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-[#8ff5ff]"></div>
                    <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-[#8ff5ff]"></div>
                    <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-[#8ff5ff]"></div>
                    <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-[#8ff5ff]"></div>
                    
                    {/* Bounding Box HUD */}
                    <div className="grid grid-cols-3 gap-8 opacity-40">
                      {[...Array(6)].map((_, i) => (
                        <div key={i} className="w-1 h-1 bg-[#8ff5ff] rounded-full"></div>
                      ))}
                    </div>
                    
                    <div className="absolute -bottom-6 left-0 text-[#8ff5ff] text-[10px] font-black tracking-widest bg-[#0c0e10]/60 px-2 py-1 backdrop-blur-sm">
                      AWAITING_SUBJECT
                    </div>
                  </div>
                )}

                <div className="flex justify-between items-end">
                  <div className="w-8 h-8 border-b-2 border-l-2 border-[#8ff5ff]"></div>
                  <div className="w-8 h-8 border-b-2 border-r-2 border-[#8ff5ff]"></div>
                </div>
              </div>
            </div>

            {/* Footer Action */}
            <div className={`flex flex-col sm:flex-row gap-4 items-center justify-between ${colors.surfaceMed} p-6 rounded-lg border ${colors.outlineVariant}/10`}>
              <div>
                <h3 className="text-[#8ff5ff] text-sm font-bold tracking-widest mb-1">OPERATIONAL_CONTROL</h3>
                <p className={`${colors.onSurfaceVariant} text-xs max-w-sm`}>
                  Ensure subject face is within the primary bounding box before initializing sequence.
                </p>
              </div>
              <button 
                onClick={toggleWebcam}
                disabled={isInitializing}
                className={`bg-gradient-to-r ${stream ? 'from-red-900 to-red-800 text-red-100' : `from-[#8ff5ff] ${colors.primaryDim} text-[#005d63]`} font-black px-8 py-4 rounded-lg tracking-[0.15em] shadow-[0_0_20px_rgba(143,245,255,0.2)] hover:scale-105 transition-all outline-none`}
              >
                {isInitializing ? 'LOADING_LINK...' : stream ? 'TERMINATE_LINK' : 'INITIALIZE_CAPTURE'}
              </button>
            </div>
          </div>

          {/* Right Processing Panel */}
          <div className="lg:col-span-4 space-y-6">
            
            <div className={`${colors.surfaceMed} border ${colors.outlineVariant}/10 rounded-lg p-6 flex flex-col gap-6`}>
              <div className={`flex items-center justify-between border-b ${colors.outlineVariant}/10 pb-4`}>
                <span className="text-[#8ff5ff] font-bold text-xs tracking-widest">PROCESSING PIPELINE</span>
              </div>
              
              {/* RAW SOURCE */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className={`text-[10px] ${colors.onSurfaceVariant} font-bold`}>RAW_SOURCE</span>
                  <span className="text-[10px] text-[#8ff5ff]">{stream ? 'LIVE' : 'STANDBY'}</span>
                </div>
                <div className={`h-32 ${colors.surfaceLowest} rounded border ${colors.outlineVariant}/20 overflow-hidden relative`}>
                  {stream ? (
                    <div className="w-full h-full bg-slate-800 animate-pulse">
                        {/* Placeholder for raw preview of face extraction */}
                        <div className="absolute bottom-2 left-2 flex gap-1">
                          <div className="w-1 h-3 bg-[#8ff5ff]/40"></div>
                          <div className="w-1 h-5 bg-[#8ff5ff]/40"></div>
                          <div className="w-1 h-2 bg-[#8ff5ff]/40"></div>
                        </div>
                    </div>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[#46484a] text-xs font-mono">NO_SIGNAL</div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0c0e10]/80 to-transparent"></div>
                </div>
              </div>

              {/* BIOMETRIC OUTPUT */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className={`text-[10px] ${colors.onSurfaceVariant} font-bold`}>BIOMETRIC_OUTPUT</span>
                  <span className="text-[10px] text-[#8ff5ff]">WAITING</span>
                </div>
                <div className={`h-48 ${colors.surfaceLowest} rounded border border-[#8ff5ff]/20 overflow-hidden relative group`}>
                    <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-[#8ff5ff]/50 font-mono text-[10px] tracking-widest">PENDING_FACE_DATA</span>
                    </div>
                  
                  {/* Digital Artifacts */}
                  <div className="absolute inset-0 pointer-events-none border-2 border-[#8ff5ff]/10"></div>
                  <div className="absolute top-4 right-4 text-[8px] font-mono text-[#8ff5ff] bg-[#0c0e10]/80 p-1 border border-[#8ff5ff]/20">
                    FR_ID: ---
                  </div>
                  {/* Tracking Overlays */}
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3/4 h-3/4 border border-dashed border-[#8ff5ff]/30 rounded-full"></div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className={`${colors.surfaceLow} p-3 rounded border ${colors.outlineVariant}/10`}>
                  <p className={`text-[8px] ${colors.onSurfaceVariant} font-bold uppercase tracking-widest mb-1`}>CONFIDENCE</p>
                  <p className="text-lg font-black text-[#8ff5ff]">0.0%</p>
                </div>
                <div className={`${colors.surfaceLow} p-3 rounded border ${colors.outlineVariant}/10`}>
                  <p className={`text-[8px] ${colors.onSurfaceVariant} font-bold uppercase tracking-widest mb-1`}>SAMPLES</p>
                  <p className="text-lg font-black text-[#8ff5ff]">0</p>
                </div>
              </div>
            </div>

            {/* Status Indicators */}
            <div className={`${colors.surfaceMed} border ${colors.outlineVariant}/10 rounded-lg p-4 space-y-3`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${stream ? 'bg-[#8ff5ff] shadow-[0_0_8px_#8ff5ff]' : 'bg-[#46484a]'}`}></div>
                  <span className="text-[10px] font-bold tracking-widest">SENSOR_CONNECT</span>
                </div>
                <span className={`text-[9px] font-bold ${stream ? 'text-[#8ff5ff]' : 'text-[#46484a]'}`}>{stream ? 'ONLINE' : 'OFFLINE'}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-[#8ff5ff] shadow-[0_0_8px_#8ff5ff]"></div>
                  <span className="text-[10px] font-bold tracking-widest">MODEL_LOAD</span>
                  <div className={`w-16 h-1 ${colors.surfaceLowest} rounded-full overflow-hidden`}>
                    <div className="h-full bg-[#8ff5ff] w-full"></div>
                  </div>
                </div>
                <span className="text-[9px] text-[#8ff5ff] font-bold">READY</span>
              </div>
            </div>

          </div>
        </div>

      </main>

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes scan {
          0% { transform: translateY(-100%); }
          100% { transform: translateY(100vh); }
        }
      `}} />
    </div>
  );
}
