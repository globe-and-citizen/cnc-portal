/** @type {import('tailwindcss').Config} */
import daisyui from 'daisyui'
export default {
  content: ['./index.html', './src/**/*.{vue,js,ts,jsx,tsx}'],
  theme: {
    extend: {}
  },
  plugins: [daisyui],
  daisyui: {
    themes: [
      {
        light: {
          primary: '#00BF7A',
          secondary: '#3366FF',
          accent: '#00B8D9',
          neutral: '#0f3d2e',
          'base-100': '#f3fcf9',

          info: '#00B8D9',
          success: '#36B37E',
          warning: '#FFAB00',
          error: '#FF5630'
        },
        dark: {
          primary: '#42ffba',
          secondary: '#2227bf',
          accent: '#242291',
          neutral: '#0f3d2e',
          'base-100': '#030c09'
        },
        mytheme: {
          primary: '#0097d6',
          secondary: '#0058ff',
          accent: '#b89000',
          neutral: '#091d15',
          'base-100': '#fdffff',
          info: '#0096fc',
          success: '#7dc000',
          warning: '#ffa600',
          error: '#e13c58'
        }
      }
    ]
  }
}
