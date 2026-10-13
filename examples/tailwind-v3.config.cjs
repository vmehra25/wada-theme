// Import theme.css in the application entry before using these classes.
module.exports = {
  content: ['./*.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        wada: {
          background: 'var(--wada-background)', surface: 'var(--wada-surface)',
          text: 'var(--wada-text)', muted: 'var(--wada-muted-text)',
          primary: 'var(--wada-primary)', 'on-primary': 'var(--wada-on-primary)',
          accent: 'var(--wada-accent)', 'on-accent': 'var(--wada-on-accent)',
          border: 'var(--wada-border)', focus: 'var(--wada-focus)',
        },
      },
    },
  },
};
