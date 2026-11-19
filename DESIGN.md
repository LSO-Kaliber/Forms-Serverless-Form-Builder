# DESAIN VISUAL KALIBER

## Ringkasan Identitas Visual
Karakter: Modern, profesional, cybersecurity, inovatif  
Mood: Dinamis, teks, fokus, teknologi  
Kata Kunci: Cybersecurity, Inovasi, Profesional, Kontribusi, Organisasi

## Tech Stack Visual
- Framework: Vue 3 (Vue CLI)
- Styling: Tailwind CSS 3.2.4
- Font: AgencyFB (headings), Hack-Regular/Bold (monospace), PTSans (body), Stop (monospace)
- Ikon: Font Awesome 6 (solid)
- Animasi: CSS transitions, marquee animations, hover effects

## Color Tokens
| Nama | Hex | Fungsi | Sumber |
|---|---|---|---|
| Primary Red | #E5383B | Buttons, highlights, focus states, error indicators | AdminView, EventDetailView, EventView, RegisterView |
| Secondary Red | #C83338 | Gradient start, hover states, active buttons | Cards, Navbar, Footer, Buttons |
| Gradient Start | #C83338 | Card backgrounds, gradients | Cards.vue, ContentCard.vue, Cards.vue |
| Gradient End | #291C33 | Card backgrounds, gradients | Cards.vue, ContentCard.vue, Cards.vue |
| Dark Background | #101316 | Form fields, content cards, containers | AdminView, EventDetailView, EventView |
| Dark Surface | #1d2226 | Input fields, hover states, borders | AdminView, EventView, RegisterView |
| Text Primary | #FFFFFF | Main text, headings, links | All components |
| Text Secondary | #b8bec4 | Description text, metadata, placeholders | EventDetailView, AdminView, EventView |
| Text Tertiary | #9ea5ad | Placeholder text, tertiary info | AdminView, EventView, RegisterView |
| Warning/Error | #ff6b6d | Validation errors, warnings, danger states | Input validation, error messages |
| Border Color | white/15, white/40 | Card borders, form borders, separators | All cards, inputs |

## Typography
- **Font Family**:
  - AgencyFB (Bold) - Headings, hero titles, branding
  - Hack-Regular - Nav text, labels, code blocks, metadata
  - Hack-Bold - Emphasized monospace text
  - PTSans-Regular - Body text, descriptions
  - PTSans-Bold - Bold body text, card titles
  - Stop - Footer text, legal info
- **Skala Ukuran**:
  - H1 (Hero): text-[40px] md:text-[48px] md:text-8xl (font-agencyfb)
  - H2 (Section): text-[20px] md:text-[60px] (font-pt-sans-bold)
  - H3 (Card Title): text-[20px] md:text-[30px] (font-pt-sans-bold)
  - Body: text-base (font-pt-sans), text-sm (font-pt-sans)
  - Label: text-xs, text-sm (font-hack)
  - Small: text-[10px] md:text-[12px] (font-hack)
- **Line Height**: 1.5-1.7 (leading-relaxed, leading-tight)
- **Letter Spacing**: Tracking-tight (headings), normal (body)

## Spacing & Layout
- **Skala Spacing**: 3px-48px increments (p-3, p-8, px-6, pt-16, pb-18)
- **Container**: max-width 1280px (container mx-auto), padding px-4 md:px-10
- **Grid System**: grid grid-cols-1, grid grid-cols-4 (Footer), grid grid-cols-12 (Admin/Event)
- **Breakpoint Visibility**: 
  - Hidden: hidden md:flex (desktop images), invisible md:visible (hero content)
  - Width: md:w-[30%], md:w-3/4, md:w-[600px], md:w-[800px]
  - Flex: md:flex-row, lg:flex-row, flex-col

## Shape & Elevation
- **Border-radius**: rounded-xl (cards), rounded-lg (forms), rounded-md (buttons), rounded-2xl (images)
- **Shadow**: box-shadow: 0 0 100px 10px #e5383b (Footer), soft shadows (card hover)
- **Gradient**: Linear gradients from #C83338 to #291C33 (cards, sections)
- **Blur**: blur-sm (avatar hover), backdrop-blur-sm (Navbar)

## Komponen Utama
### Navbar
- **Anatomi**: Logo (h-40), menu items (flex-wrap), mobile toggle (md:hidden)
- **Varian**: Default (transparent), scrolled (backdrop-blur-sm)
- **State**: 
  - Hover: text-shadow 0 0 8px white
  - Mobile: Fixed overlay with z-30
- **Style**: bg-gradient-to-br from-[#C83338] to-[#291C33] (mobile), transparent (desktop)

### Button
- **Anatomi**: SVG icon + text, container div
- **Varian**: Router link, anchor (new tab), button (form submit)
- **State**: 
  - Hover: -translate-y-1, bg-#a8262b
  - Focus: focus-visible:outline-2 outline-#ff6b6d
  - Active: active:translate-y-px
- **Style**: min-h-[44px], px-5, py-2.5, rounded bg-#C83338, hover:bg-#a8262b

### Input
- **Anatomi**: Label + input field with dark background
- **State**: 
  - Focus: ring-4 outline-#E5383B, animate-pulse
  - Invalid: border-#E5383B
- **Style**: bg-#1d2226, border-white/40, text-#E5383B, placeholder-#9ea5ad

### Card
- **Anatomi**: Gradient background, title, body text, optional icon
- **State**: Hover effect with translate-y
- **Style**: bg-gradient-to-br from-[#C83338] to-[#291C33], text-white, transition ease-in-out

## Motion
- **Durasi**: 0.3s (hover), 1-3s (marquee), 0.5s (transitions)
- **Easing**: ease-in-out, linear
- **Jenis**: 
  - Hover: translate-y, background-color
  - Marquee: 10s linear infinite animation
  - Scroll: Smooth scroll behavior (scroll-behavior: auto)
- **Aturan**: 
  - Hover: transition duration-300, text-shadow effects
  - Reduced Motion: prefers-reduced-motion: reduce animation

## Ikon & Aset
- **Library**: Font Awesome 6 Solid
- **Ukuran Standar**: 24px (lg), 16px (md), 12px (sm)
- **Gaya**: Solid untuk semua ikon
- **Asisten**: SVG images in assets/image/ directory

## Do & Don't
### Do
- Gunakan warna #E5383B untuk fokus dan error states
- Gunakan font-hack untuk teks teknis dan metadata
- Gunakan gradient #C83338 to #291C33 untuk card dan section
- Gunakan dark background #101316/#1d2226 untuk form fields
- Gunakan min-h-[44px] untuk button/touch targets
- Gunakan max-width [56ch] untuk readability
- Gunakan md:flex/lg:flex untuk pola responsive
- Gunakan Icon Library untuk pengganti emoji/simbol/logo

### Don't
- Jangan gunakan latar belakang putih
- Jangan gunakan warna biru untuk fokus
- Jangan gunakan font sans-serif standar untuk headings
- Jangan menggunakan shadow yang terlalu keras
- Jangan gunakan bayangan yang terlalu keras
- Jangan gunakan emoji apapun pakai 

## Design Tokens Siap Pakai
### CSS Variables (style.css)
```css
@font-face {
  font-family: "AgencyFB";
  src: url("../fonts/AgencyFB-Bold.ttf");
}

@font-face {
  font-family: "Hack-Regular";
  src: url("../fonts/hack/hack-regular.woff");
}

@font-face {
  font-family: "Hack-Bold";
  src: url("../fonts/hack/hack-bold.woff");
}

@font-face {
  font-family: "PTSans-Regular";
  src: url("../fonts/pt_sans/PTSans-Regular.ttf");
}

@font-face {
  font-family: "PTSans-Bold";
  src: url("../fonts/pt_sans/PTSans-Bold.ttf");
}

@font-face {
  font-family: "Stop";
  src: url("../fonts/STOP.ttf");
}
```

### Tailwind Extend (tailwind.config.js)
```js
theme: {
  extend: {
    fontFamily: {
      agencyfb: ["AgencyFB", "sans-serif"],
      hack: ["Hack-Regular", "monospace"],
      hack-bold: ["Hack-Bold", "monospace"],
      pt-sans: ["PTSans-Regular", "sans-serif"],
      pt-sans-bold: ["PTSans-Bold", "sans-serif"],
      stop: ["Stop", "monospace"],
    },
  },
},
```

## Panduan Penerapan di Project Baru
1. **Copy Token**:
   - Copy semua warna hex dari tabel di atas
   - Copy font-family konfigurasi ke tailwind.config.js
   - Copy font scale (text sizes) ke komponen

2. **Font**:
   - Install font files di assets/fonts/
   - Pastikan @font-face di style.css sesuai path

3. Leoneb Components:
   - Gunakan Navbar.vue (h-40 logo, md:flex nav) sebagai template utama
   - Gunakan Button.vue (min-h-[44px], bg-#C83338, hover-#a8262b) untuk aksi
   - Gunakan Input.vue (bg-#1d2226, border-white/40, text-#E5383B)
   - Gunakan Card.vue (bg-gradient-to-br from-#C83338 to-#291C33)

4. **Validasi**:
   - Periksa semua warna sesuai DESAIN.md
   - Uji responsif di breakpoint md, lg, xl
   - Verifikasi touch targets min-h-[44px]
   - Validasi contrast ratio white/#E5383B

## Gap & Asumsi
- Tidak dapat memverifikasi eksaknya font metrics (x-height, line-height) tanpa pengujian visual
- Asumsi bahwa font #E5383B adalah warna utama (merah) dan #101316/#1d2226 adalah background dark
- Asumsi bahwa grid system adalah responsif: grid-cols-1 mobile, md:grid-cols-4 desktop
- Tidak dapat memverifikasi animasi marquee tanpa hasil browser
- Asumsi bahwa semua tombol memiliki min-height 44px untuk touch accessibility
- Asumsi bahwa gradient #C83338 to #291C33 adalah konsisten di semua cards dan sections
- Asumsi bahwa dark mode tidak digunakan (hanya latar belakang gelap)
- Asumsi bahwa fokus states menggunakan outline-2 dengan outline-#ff6b6d
- Asumsi bahwa error states menggunakan border-#E5383B

## Referensi File
- tailwind.config.js: Font families
- main.js: Background #161a1d (global fallback)
- style.css: Font-face definitions, base layer styles
- Navbar.vue: Navigation patterns, responsive breakpoints
- Button.vue: Button styling, hover states
- Input.vue: Form field patterns, validation states
- Cards.vue: Card gradient, hover effects
- LandingView.vue: Main page structure, grid patterns
- EventView.vue, AboutView.vue: Section layout patterns