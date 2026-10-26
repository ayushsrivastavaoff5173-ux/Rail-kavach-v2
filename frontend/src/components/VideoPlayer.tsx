// src/components/VideoPlayer.tsx
'use client';

import React, { useState } from 'react';
import { CameraNode } from '@/types/telemetry';
import { Shield, Eye, Video, Volume2 } from 'lucide-react';
import { useAudioAlert } from '@/hooks/useAudioAlert';

interface VideoPlayerProps {
  node: CameraNode;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({ node }) => {
  const [showBoundingBoxes, setShowBoundingBoxes] = useState(true);
  const { playAnnouncement } = useAudioAlert();

  const handleManualAnnouncement = () => {
    playAnnouncement(
      `Attention please. High crowd density detected at ${node.name}. Please move towards exit routes.`,
      `कृपया ध्यान दें। ${node.name} पर भीड़ अधिक है। कृपया निकास द्वारों की ओर बढ़ें।`
    );
  };

  const getStatusColor = (status: CameraNode['status']) => {
    switch (status) {
      case 'CRITICAL': return 'bg-rose-500/20 text-rose-400 border-rose-500/50';
      case 'WARNING': return 'bg-amber-500/20 text-amber-400 border-amber-500/50';
      case 'ONLINE': return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50';
      default: return 'bg-slate-500/20 text-slate-400 border-slate-500/50';
    }
  };

  return (
    <div className="relative bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg group">
      
      {/* Top Header Overlay */}
      <div className="absolute top-0 inset-x-0 z-20 flex items-center justify-between p-3 bg-linear-to-b from-slate-950/90 to-transparent">
        <div className="flex items-center space-x-2">
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold border ${getStatusColor(node.status)}`}>
            {node.status}
          </span>
          <span className="text-xs font-medium text-slate-200 tracking-wide">{node.name}</span>
        </div>
        <div className="flex items-center space-x-2 font-mono text-[10px] text-slate-400">
          <span>{node.fps} FPS</span>
          <span>{node.resolution}</span>
        </div>
      </div>

      {/* Video Stream Mock / Canvas Viewport */}
      <div className="relative aspect-video bg-slate-950 flex items-center justify-center overflow-hidden">
        {/* Background Grid Pattern simulating CCTV feed */}
        <div className="absolute inset-0 bg-[radial-gradient(#334155_1px,transparent_1px)] bg-size-[16px_16px] opacity-30"></div>
        
        {/* Simulated CCTV Simulation Graphics */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center p-6">
            <Video className="w-12 h-12 mx-auto text-slate-700 mb-2 animate-pulse" />
            <span className="text-xs font-mono text-slate-500 uppercase tracking-widest">YOLOv8 Stream Inference Active</span>
          </div>
        </div>

        {/* Dynamic Bounding Boxes Overlay Simulation */}
        {showBoundingBoxes && (
          <div className="absolute inset-0 pointer-events-none">
            {/* Box 1 */}
            <div className="absolute top-[30%] left-[25%] w-16 h-28 border-2 border-rose-500/80 bg-rose-500/10 rounded flex flex-col justify-between p-1">
              <span className="text-[9px] font-mono bg-rose-600 text-white px-1 rounded w-max">person 98%</span>
            </div>
            {/* Box 2 */}
            <div className="absolute top-[40%] left-[45%] w-14 h-24 border-2 border-amber-500/80 bg-amber-500/10 rounded flex flex-col justify-between p-1">
              <span className="text-[9px] font-mono bg-amber-600 text-white px-1 rounded w-max">person 92%</span>
            </div>
            {/* Box 3 */}
            <div className="absolute top-[25%] left-[65%] w-16 h-28 border-2 border-emerald-500/80 bg-emerald-500/10 rounded flex flex-col justify-between p-1">
              <span className="text-[9px] font-mono bg-emerald-600 text-white px-1 rounded w-max">person 95%</span>
            </div>
          </div>
        )}

        {/* Density Meter Badge bottom-left */}
        <div className="absolute bottom-3 left-3 z-20 flex items-center space-x-2 bg-slate-900/80 backdrop-blur-md px-3 py-1.5 rounded-lg border border-slate-700">
          <Shield className="w-4 h-4 text-rose-500" />
          <div className="text-xs font-mono">
            <span className="text-slate-400">Density: </span>
            <strong className="text-white">{node.density}%</strong>
            <span className="text-slate-500 ml-2">({node.currentCount}/{node.maxCapacity})</span>
          </div>
        </div>
      </div>

      {/* Control Actions Footer */}
      <div className="flex items-center justify-between p-3 bg-slate-950/80 border-t border-slate-800 text-xs">
        <button
          onClick={() => setShowBoundingBoxes(!showBoundingBoxes)}
          className="flex items-center space-x-1.5 text-slate-400 hover:text-slate-200 transition-colors"
        >
          <Eye className="w-3.5 h-3.5" />
          <span>{showBoundingBoxes ? 'Hide YOLO Boxes' : 'Show YOLO Boxes'}</span>
        </button>

        <button
          onClick={handleManualAnnouncement}
          className="flex items-center space-x-1.5 px-2.5 py-1 bg-rose-600/20 border border-rose-500/40 text-rose-400 rounded-md hover:bg-rose-600/30 transition-colors font-medium"
        >
          <Volume2 className="w-3.5 h-3.5" />
          <span>Trigger PA Audio</span>
        </button>
      </div>

    </div>
  );
};