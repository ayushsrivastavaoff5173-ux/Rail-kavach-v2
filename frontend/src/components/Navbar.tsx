// src/components/Navbar.tsx
'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ShieldAlert, Video, Map, Bell, BarChart3, Camera, BellRing, Info, LayoutDashboard, Radio, Cpu } from 'lucide-react';
import { useCrowdState } from '@/hooks/useCrowdState';

export const Navbar: React.FC = () => {
  const pathname = usePathname();
  const { telemetry, alerts, isLiveWs, toggleWsMode } = useCrowdState();
  const unacknowledgedAlerts = alerts.filter(a => !a.acknowledged).length;

  const navLinks = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Cameras', href: '/cameras', icon: Video },
    { name: 'Digital Map', href: '/map', icon: Map },
    { name: 'Alerts', href: '/alerts', icon: Bell, badge: unacknowledgedAlerts },
    { name: 'Analytics', href: '/analytics', icon: BarChart3 },
    { name: 'Live Detection', href: '/live', icon: Camera },
    { name: 'Demo Alert', href: '/demo-alert', icon: BellRing },
    { name: 'About', href: '/about', icon: Info },
  ];

  return (
    <header className="sticky top-0 z-50 bg-slate-950/90 backdrop-blur-md border-b border-slate-800 text-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo & Brand */}
          <Link href="/" className="flex items-center space-x-3 group">
            <div className="p-2 bg-rose-600/20 border border-rose-500/40 rounded-xl group-hover:bg-rose-600/30 transition-colors">
              <ShieldAlert className="w-6 h-6 text-rose-500 animate-pulse" />
            </div>
            <div>
              <span className="font-bold text-lg tracking-tight bg-linear-to-r from-white to-slate-400 bg-clip-text text-transparent">
                RailKavach
              </span>
              <span className="block text-[10px] text-rose-400 font-mono tracking-widest uppercase">
                Autonomous Crowd AI
              </span>
            </div>
          </Link>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center space-x-1">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.name}
                  href={link.href}
                  className={`relative flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30 shadow-sm shadow-rose-500/10'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-rose-400' : 'text-slate-500'}`} />
                  <span>{link.name}</span>
                  {link.badge !== undefined && link.badge > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-600 text-[10px] font-bold text-white animate-bounce">
                      {link.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Engine Mode Toggle & Status */}
          <div className="flex items-center space-x-3">
            <button
              onClick={toggleWsMode}
              className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg border text-xs font-mono transition-all ${
                isLiveWs
                  ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400'
                  : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-slate-200'
              }`}
            >
              {isLiveWs ? <Radio className="w-3.5 h-3.5 animate-pulse text-emerald-400" /> : <Cpu className="w-3.5 h-3.5" />}
              <span>{isLiveWs ? 'Live WS Connected' : 'Mock Simulator Engine'}</span>
            </button>

            <div className="hidden lg:flex items-center space-x-2 pl-3 border-l border-slate-800 font-mono text-xs text-slate-400">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>Total Crowd: <strong className="text-white">{telemetry.totalCrowdCount}</strong></span>
            </div>
          </div>

        </div>
      </div>
    </header>
  );
};