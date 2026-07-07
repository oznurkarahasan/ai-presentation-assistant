'use client';

import { motion } from 'framer-motion';

interface ScoreRadarChartProps {
    labels: string[];
    scores: number[];
}

const SIZE = 260;
const CENTER = SIZE / 2;
const RADIUS = 95;
const RINGS = [25, 50, 75, 100];

function pointFor(index: number, total: number, value: number) {
    const angle = -Math.PI / 2 + (index * 2 * Math.PI) / total;
    const r = (value / 100) * RADIUS;
    return {
        x: CENTER + r * Math.cos(angle),
        y: CENTER + r * Math.sin(angle),
    };
}

function scoreColor(score: number) {
    return score >= 75 ? '#22c55e' : score >= 50 ? '#f59e0b' : '#ef4444';
}

export default function ScoreRadarChart({ labels, scores }: ScoreRadarChartProps) {
    const total = labels.length;
    const dataPoints = scores.map((s, i) => pointFor(i, total, s));
    const dataPath = dataPoints.map((p) => `${p.x},${p.y}`).join(' ');

    return (
        <div className="bg-zinc-900/40 border border-white/5 rounded-2xl p-6 flex flex-col items-center">
            <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
                <defs>
                    <linearGradient id="radarFill" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#f97316" stopOpacity="0.55" />
                        <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.35" />
                    </linearGradient>
                </defs>

                {RINGS.map((ring) => (
                    <polygon
                        key={ring}
                        points={labels.map((_, i) => { const p = pointFor(i, total, ring); return `${p.x},${p.y}`; }).join(' ')}
                        fill="none"
                        stroke="rgba(255,255,255,0.08)"
                        strokeWidth={1}
                    />
                ))}

                {labels.map((_, i) => {
                    const p = pointFor(i, total, 100);
                    return (
                        <line
                            key={i}
                            x1={CENTER}
                            y1={CENTER}
                            x2={p.x}
                            y2={p.y}
                            stroke="rgba(255,255,255,0.08)"
                            strokeWidth={1}
                        />
                    );
                })}

                <motion.polygon
                    points={dataPath}
                    fill="url(#radarFill)"
                    stroke="#f97316"
                    strokeWidth={2}
                    strokeLinejoin="round"
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.5, ease: 'easeOut' }}
                    style={{ transformOrigin: `${CENTER}px ${CENTER}px` }}
                />

                {dataPoints.map((p, i) => (
                    <circle key={i} cx={p.x} cy={p.y} r={4} fill={scoreColor(scores[i])} stroke="#0a0a0a" strokeWidth={1.5} />
                ))}
            </svg>

            <div className="grid grid-cols-1 gap-y-2 mt-3 w-full">
                {labels.map((label, i) => (
                    <div key={label} className="flex items-center justify-between gap-2">
                        <span className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: scoreColor(scores[i]) }} />
                            {label}
                        </span>
                        <span className="text-xs font-black tabular-nums" style={{ color: scoreColor(scores[i]) }}>
                            {scores[i]}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
}
