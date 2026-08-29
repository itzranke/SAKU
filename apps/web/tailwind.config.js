module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: '#090D16',
        surface: '#111827',
        border: '#1E293B',
        accent: {
          green: '#10B981',
          red: '#F43F5E',
          yellow: '#F59E0B',
          blue: '#6366F1',
        },
      },
    },
  },
  plugins: [],
};
