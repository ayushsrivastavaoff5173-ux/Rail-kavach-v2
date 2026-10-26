// src/app/page.tsx
'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowRight, Video, Map, Bell, BarChart3, Sliders, Activity } from 'lucide-react';

export default function LandingPage() {
  const features = [
    {
      title: '4-Node Camera Grid',
      desc: 'Real-time YOLOv8 object detection tracking crowd density across high-risk railway bottlenecks.',
      icon: Video,
      href: '/cameras',
    },
    {
      title: 'Digital Twin Map',
      desc: 'Interactive SVG blueprint providing real-time spatial heatmaps and congestion indicators.',
      icon: Map,
      href: '/map',
    },
    {
      title: 'Incident Alert Terminal',
      desc: 'Automated threshold monitoring with instant severity classification and audit logs.',
      icon: Bell,
      href: '/alerts',
    },
    {
      title: 'Advanced Analytics',
      desc: 'Comprehensive Recharts reporting tracking peak rush hours and historical inflow trends.',
      icon: BarChart3,
      href: '/analytics',
    },
    {
      title: 'Scenario Lab (Simulation)',
      desc: 'Test emergency crowd control maneuvers by adjusting inflow/outflow rates in real time.',
      icon: Sliders,
      href: '/simulation',
    },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between">
      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
        <div className="inline-flex items-center space-x-2 px-3 py-1 bg-rose-500/10 border border-rose-500/30 rounded-full text-rose-400 text-xs font-mono mb-6">
          <Activity className="w-3.5 h-3.5 animate-pulse" />
          <span>Hacktoberfest Hack Day • Autonomous Crowd AI System</span>
        </div>

        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight mb-6 bg-linear-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
          RailKavach Command Center
        </h1>

        <p className="max-w-2xl mx-auto text-slate-400 text-base sm:text-lg mb-10">
          Next-generation railway platform crowd monitoring and stampede early warning architecture powered by computer vision and real-time telemetry.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-4">
          <Link
            href="/dashboard"
            className="flex items-center space-x-2 px-6 py-3 bg-rose-600 hover:bg-rose-700 text-white font-medium rounded-xl shadow-lg shadow-rose-600/20 transition-all"
          >
            <span>Launch Command Center</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="/about"
            className="flex items-center space-x-2 px-6 py-3 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 font-medium rounded-xl transition-all"
          >
            <span>Architecture & Team</span>
          </Link>
        </div>
      </div>

      {/* Feature Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feat) => {
            const Icon = feat.icon;
            return (
              <Link
                key={feat.title}
                href={feat.href}
                className="group bg-slate-900/60 border border-slate-800/80 hover:border-rose-500/50 p-6 rounded-2xl transition-all duration-300 hover:shadow-xl hover:shadow-rose-500/5 flex flex-col justify-between"
              >
                <div>
                  <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl w-max mb-4 group-hover:bg-rose-500/20 transition-colors">
                    <Icon className="w-6 h-6 text-rose-500" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-200 mb-2 group-hover:text-rose-400 transition-colors">
                    {feat.title}
                  </h3>
                  <p className="text-sm text-slate-400 leading-relaxed">{feat.desc}</p>
                </div>
                <div className="flex items-center space-x-2 text-xs font-mono text-rose-400 mt-6 pt-4 border-t border-slate-800/60 group-hover:translate-x-1 transition-transform">
                  <span>Explore Module</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-8 text-center text-xs font-mono text-slate-500">
        <p>RailKavach Frontend Architecture • Built with Next.js App Router, Tailwind CSS & TypeScript</p>
      </footer>
    </div>
  );
}