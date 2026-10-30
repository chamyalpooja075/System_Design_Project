# UI/UX Pro Max — Design Intelligence Rule

All user interfaces developed in this project must adhere to the UI/UX Pro Max design system guidelines:

## Core Directives

1. **Visual Style**:
   - Style: **Dark Mode (OLED) + Developer Tool Precision**.
   - Backgrounds: Rich deep slate (`#0B0F19`, `#0F172A`), card backgrounds (`#1B2336`, `#0C101A`).
   - Accent & Feedback: Emerald green (`#22C55E`), Cyan (`#06B6D4`), Indigo (`#6366F1`), Amber warning (`#F59E0B`), Crimson error (`#EF4444`).
   - Glassmorphism & Micro-animations: `backdrop-blur-xl`, subtle border rings (`border-slate-800/80`), smooth transitions (`150ms-300ms`).

2. **Accessibility & Usability (Non-Negotiable)**:
   - Text contrast minimum 4.5:1 against backgrounds.
   - **No raw emojis as icons**: Always use SVG vector icons (`lucide-react`, `react-icons`).
   - Interactive targets: `cursor-pointer` on all buttons, nodes, badges, and tabs.
   - Visible keyboard focus rings (`focus:ring-2 focus:ring-indigo-500`).
   - Smooth hover states on all interactive elements.

3. **Master Reference**:
   - Master design token specification: `design-system/system-design-studio/MASTER.md`.
