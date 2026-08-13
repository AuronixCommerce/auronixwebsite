'use client';

import { motion } from 'framer-motion';

const NODES = [
  { label: 'Suppliers', y: 0 },
  { label: 'Auronix', y: 1, highlight: true },
  { label: 'Procurement', y: 2 },
  { label: 'Marketplaces', y: 3 },
  { label: 'Customers', y: 4 },
];

export function CommerceFlow() {
  return (
    <div className="relative w-full max-w-md mx-auto">
      <div className="relative rounded-2xl border border-border bg-card/50 backdrop-blur-sm p-8 shadow-premium-lg">
        {/* Header bar */}
        <div className="flex items-center justify-between mb-8 pb-4 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-green-500/80" />
            <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/80" />
            <div className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
          </div>

          <span className="text-[10px] font-mono text-foreground-muted tracking-wider">
            COMMERCE FLOW
          </span>
        </div>

        {/* Flow nodes */}
        <div className="relative space-y-3">
          {/* Vertical connecting line */}
          <div className="absolute left-[27px] top-2 bottom-2 w-px bg-gradient-to-b from-accent/40 via-accent/20 to-accent/40" />

          {NODES.map((node, i) => (
            <motion.div
              key={node.label}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{
                duration: 0.5,
                delay: 0.3 + i * 0.12,
                ease: [0.22, 1, 0.36, 1],
              }}
              className="relative flex items-center gap-4"
            >
              {/* Node */}
              <div
                className={`relative z-10 w-14 h-14 rounded-xl flex items-center justify-center shrink-0 ${
                  node.highlight
                    ? 'bg-primary text-primary-foreground shadow-glow'
                    : 'bg-secondary border border-border'
                }`}
              >
                {node.highlight ? (
                  <span className="font-bold text-lg tracking-tight">A</span>
                ) : (
                  <span className="text-[10px] font-mono text-foreground-muted">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                )}
              </div>

              {/* Label */}
              <div className="flex-1">
                <div
                  className={`text-sm font-medium ${
                    node.highlight
                      ? 'text-foreground'
                      : 'text-foreground-muted'
                  }`}
                >
                  {node.label}
                </div>

                {!node.highlight && (
                  <div className="text-[10px] text-foreground-muted/60 font-mono mt-0.5">
                    {node.label.toLowerCase().replace(/ /g, '_')}.active
                  </div>
                )}
              </div>

              {/* Status indicator */}
              <div className="flex items-center gap-1.5">
                <motion.div
                  animate={{ opacity: [0.4, 1, 0.4] }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    delay: i * 0.3,
                  }}
                  className="w-1.5 h-1.5 rounded-full bg-green-500"
                />
              </div>
            </motion.div>
          ))}
        </div>

        {/* Footer stats */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: 0.5,
            delay: 1,
          }}
          className="mt-8 pt-4 border-t border-border grid grid-cols-3 gap-4"
        >
          {[
            { label: 'Pipeline', value: 'Active' },
            { label: 'Status', value: 'Operational' },
            { label: 'Network', value: 'Connected' },
          ].map((stat) => (
            <div key={stat.label}>
              <div className="text-[9px] font-mono text-foreground-muted uppercase tracking-wider">
                {stat.label}
              </div>

              <div className="text-xs font-medium text-foreground mt-1">
                {stat.value}
              </div>
            </div>
          ))}
        </motion.div>
      </div>

      {/* Floating accent */}
      <motion.div
        animate={{ y: [0, -8, 0] }}
        transition={{
          duration: 6,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        className="absolute -top-4 -right-4 w-24 h-24 rounded-full bg-accent/10 blur-2xl"
      />

      <motion.div
        animate={{ y: [0, 8, 0] }}
        transition={{
          duration: 5,
          repeat: Infinity,
          ease: 'easeInOut',
          delay: 1,
        }}
        className="absolute -bottom-4 -left-4 w-32 h-32 rounded-full bg-primary/5 blur-2xl"
      />
    </div>
  );
}