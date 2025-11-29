import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class", "class"],
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
  	screens: {
  		'xs': '475px',
  		'sm': '640px',
  		'md': '768px',
  		'lg': '1024px',
  		'xl': '1280px',
  		'2xl': '1536px',
  	},
  	extend: {
  		fontFamily: {
  			sans: [
  				'var(--font-inter)',
  				'var(--font-geist-sans)',
  				'system-ui',
  				'sans-serif'
  			],
  			geist: [
  				'var(--font-geist-sans)',
  				'system-ui',
  				'sans-serif'
  			],
  			mono: [
  				'var(--font-geist-mono)',
  				'monospace'
  			],
  			ibm: [
  				'var(--font-ibm-plex)',
  				'system-ui',
  				'sans-serif'
  			],
  			screenplay: [
  				'var(--font-courier-prime)',
  				'"Courier New"',
  				'Courier',
  				'monospace'
  			]
  		},
  		colors: {
  			background: 'hsl(var(--background))',
  			foreground: 'hsl(var(--foreground))',
  			card: {
  				DEFAULT: 'hsl(var(--card))',
  				foreground: 'hsl(var(--card-foreground))'
  			},
  			popover: {
  				DEFAULT: 'hsl(var(--popover))',
  				foreground: 'hsl(var(--popover-foreground))'
  			},
  			primary: {
  				DEFAULT: 'hsl(var(--primary))',
  				foreground: 'hsl(var(--primary-foreground))'
  			},
  			secondary: {
  				DEFAULT: 'hsl(var(--secondary))',
  				foreground: 'hsl(var(--secondary-foreground))'
  			},
  			muted: {
  				DEFAULT: 'hsl(var(--muted))',
  				foreground: 'hsl(var(--muted-foreground))'
  			},
  			accent: {
  				DEFAULT: 'hsl(var(--accent))',
  				foreground: 'hsl(var(--accent-foreground))'
  			},
  			destructive: {
  				DEFAULT: 'hsl(var(--destructive))',
  				foreground: 'hsl(var(--destructive-foreground))'
  			},
  			border: 'hsl(var(--border))',
  			input: 'hsl(var(--input))',
  			ring: 'hsl(var(--ring))',
  			sidebar: {
  				DEFAULT: 'hsl(var(--sidebar-background))',
  				foreground: 'hsl(var(--sidebar-foreground))',
  				primary: 'hsl(var(--sidebar-primary))',
  				'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
  				accent: 'hsl(var(--sidebar-accent))',
  				'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
  				border: 'hsl(var(--sidebar-border))',
  				ring: 'hsl(var(--sidebar-ring))'
  			}
  		},
  		borderRadius: {
  			'2xl': 'calc(var(--radius) + 0.5rem)',
  			xl: 'calc(var(--radius) + 0.25rem)',
  			lg: 'var(--radius)',
  			md: 'calc(var(--radius) - 0.25rem)',
  			sm: 'calc(var(--radius) - 0.375rem)'
  		},
  		boxShadow: {
  			xs: 'var(--shadow-xs)',
  			sm: 'var(--shadow-sm)',
  			md: 'var(--shadow-md)',
  			lg: 'var(--shadow-lg)',
  			xl: 'var(--shadow-xl)',
  			'2xl': 'var(--shadow-2xl)',
  			inner: 'var(--shadow-inner)'
  		},
  		transitionDuration: {
  			fast: 'var(--duration-fast)',
  			normal: 'var(--duration-normal)',
  			slow: 'var(--duration-slow)',
  			slower: 'var(--duration-slower)'
  		},
  		transitionTimingFunction: {
  			'ease-out': 'var(--ease-out)',
  			'ease-in': 'var(--ease-in)',
  			'ease-in-out': 'var(--ease-in-out)',
  			spring: 'var(--ease-spring)',
  			bounce: 'var(--ease-bounce)'
  		},
  		keyframes: {
  			'fade-in': {
  				from: {
  					opacity: '0'
  				},
  				to: {
  					opacity: '1'
  				}
  			},
  			'fade-out': {
  				from: {
  					opacity: '1'
  				},
  				to: {
  					opacity: '0'
  				}
  			},
  			'slide-up': {
  				from: {
  					opacity: '0',
  					transform: 'translateY(8px)'
  				},
  				to: {
  					opacity: '1',
  					transform: 'translateY(0)'
  				}
  			},
  			'slide-down': {
  				from: {
  					opacity: '0',
  					transform: 'translateY(-8px)'
  				},
  				to: {
  					opacity: '1',
  					transform: 'translateY(0)'
  				}
  			},
  			'scale-in': {
  				from: {
  					opacity: '0',
  					transform: 'scale(0.95)'
  				},
  				to: {
  					opacity: '1',
  					transform: 'scale(1)'
  				}
  			}
  		},
  		animation: {
  			'fade-in': 'fade-in var(--duration-normal) var(--ease-out)',
  			'fade-out': 'fade-out var(--duration-normal) var(--ease-out)',
  			'slide-up': 'slide-up var(--duration-normal) var(--ease-out)',
  			'slide-down': 'slide-down var(--duration-normal) var(--ease-out)',
  			'scale-in': 'scale-in var(--duration-normal) var(--ease-spring)'
  		}
  	}
  },
  plugins: [],
};

export default config;
