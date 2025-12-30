module.exports = {
  content: ['./index.html', './src/**/*.{ts,tsx,jsx,js}'],
  theme: {
    extend: {
      colors: {
        obsidian: {
          bg: '#09090b',
          panel: '#18181b',
          border: '#27272a',
          primaryText: '#e4e4e7',
          secondaryText: '#a1a1aa',
        },
        status: {
          processing: '#3b82f6',
          success: '#10b981',
          warning: '#f59e0b',
          critical: '#f43f5e',
          tool: '#a855f7',
        },
      },
      boxShadow: {
        glow: '0 0 0 1px rgba(255,255,255,0.04), 0 20px 50px -20px rgba(0,0,0,0.45)',
      },
    },
  },
  plugins: [],
};
