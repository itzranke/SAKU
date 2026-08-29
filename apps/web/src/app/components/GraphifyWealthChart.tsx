'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';

export function GraphifyWealthChart() {
  const [selectedNode, setSelectedNode] = useState<string | null>(null);

  const nodes = [
    { id: 'income', label: 'Gaji & Income', type: 'SOURCE', val: 'Rp 35.000.000', x: 50, y: 50, color: '#10B981' },
    { id: 'bca', label: 'Bank BCA', type: 'BANK', val: 'Rp 185.000.000', x: 220, y: 30, color: '#3B82F6' },
    { id: 'mandiri', label: 'Bank Mandiri', type: 'BANK', val: 'Rp 60.000.000', x: 220, y: 110, color: '#3B82F6' },
    { id: 'mt5', label: 'MT5 Forex Broker', type: 'TRADING', val: '$25,400 USD', x: 390, y: 30, color: '#F59E0B' },
    { id: 'idx', label: 'IDX Equities', type: 'ASSET', val: 'Rp 450.000.000', x: 390, y: 110, color: '#8B5CF6' },
    { id: 'fire', label: 'Net Worth SAKU', type: 'TARGET', val: 'Rp 1.450.230.000', x: 550, y: 70, color: '#6366F1' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.2 }}
      className="rounded-2xl border border-indigo-500/20 bg-[#111827] p-6 shadow-xl relative overflow-hidden"
    >
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xl">🕸️</span>
            <h3 className="text-lg font-bold text-white tracking-wide">Graphify Wealth Flow Network</h3>
            <span className="rounded-full bg-purple-500/10 px-2.5 py-0.5 text-xs font-semibold text-purple-400 border border-purple-500/20">
              Graph Visualizer
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Peta graf aliran dana & jaringan koneksi antar akun finansial SAKU secara visual.
          </p>
        </div>
        {selectedNode && (
          <span className="text-xs text-emerald-400 font-mono font-semibold">
            Node Terpilih: {selectedNode}
          </span>
        )}
      </div>

      {/* SVG Network Graph Canvas */}
      <div className="mt-5 relative w-full h-44 bg-slate-900/60 rounded-xl border border-slate-800 p-2 overflow-hidden flex items-center justify-center">
        <svg className="w-full h-full">
          {/* Connection Lines */}
          <line x1="120" y1="60" x2="220" y2="40" stroke="#334155" strokeWidth="2" strokeDasharray="4" />
          <line x1="120" y1="60" x2="220" y2="120" stroke="#334155" strokeWidth="2" strokeDasharray="4" />
          <line x1="280" y1="40" x2="390" y2="40" stroke="#6366F1" strokeWidth="2" />
          <line x1="280" y1="120" x2="390" y2="120" stroke="#6366F1" strokeWidth="2" />
          <line x1="450" y1="40" x2="550" y2="80" stroke="#10B981" strokeWidth="2" />
          <line x1="450" y1="120" x2="550" y2="80" stroke="#10B981" strokeWidth="2" />

          {/* Interactive Nodes */}
          {nodes.map((node) => (
            <g
              key={node.id}
              onClick={() => setSelectedNode(`${node.label} (${node.val})`)}
              className="cursor-pointer group"
            >
              <circle
                cx={node.x}
                cy={node.y}
                r="18"
                fill={node.color}
                fillOpacity="0.2"
                stroke={node.color}
                strokeWidth="2"
                className="transition-all group-hover:r-22"
              />
              <circle cx={node.x} cy={node.y} r="6" fill={node.color} />
              <text x={node.x} y={node.y + 28} textAnchor="middle" fill="#CBD5E1" fontSize="9" fontWeight="600">
                {node.label}
              </text>
            </g>
          ))}
        </svg>
      </div>
    </motion.div>
  );
}
