# Kaliber Forms (Serverless Form Builder)

Aplikasi **Form Builder Mandiri ala Google Forms** dengan fitur lengkap, performa tinggi, dan biaya $0 (berjalan 100% pada **Cloudflare Free Tier**) yang dibangun khusus untuk organisasi **LSO Kaliber**.

---

## 🚀 Fitur Unggulan

1. **Pembuat Formulir (Admin Form Builder):**
   - Tambah, ubah, dan susun kolom formulir serta halaman menggunakan antarmuka seret-lepas (*drag-and-drop*).
   - Pengaturan logika percabangan (*conditional visibility* `visibleIf` per kolom dan per halaman).
   - Aturan lompatan halaman berdasarkan jawaban (*page jumping*) dilengkapi **deteksi siklus perulangan (*cycle detection*) otomatis**.
   - Slug tautan kustom (misal `/forms/oprec-cyber-2026`) dengan pengecekan ketersediaan secara *real-time* dan proteksi kata khusus (*reserved words*).
   - Pratinjau formulir instan dengan **mode uji coba (*testing mode*)**: validasi dan navigasi dievaluasi penuh di *client* tanpa menyimpan data ke basis data.
   - Peringatan pengubahan skema jika formulir sudah memiliki tanggapan (*safe schema migration*).
   - Pengelolaan status: Draf, Dipublikasikan, dan Ditutup (dapat dibuka kembali kapan saja).
   - Duplikasi formulir instan & galeri templat formulir organisasi.

2. **Pengalaman Pengisian Formulir (Publik):**
   - Formulir multi-halaman dengan indikator progres visual.
   - Evaluasi validasi *real-time* berbasis Zod dengan pesan galat berbahasa Indonesia yang bersahabat.
   - Proteksi bot berlapis: **Cloudflare Turnstile** dan **kolom jebakan (*honeypot*)**.
   - Halaman terima kasih dengan pesan kustom dan tombol salin/unduh tautan pengeditan tanggapan (*receipt download*).
   - Penanganan status yang jelas: 404/Draf, Formulir Ditutup, dan Kuota Penuh.

3. **Aturan Bisnis & Integritas Data (Ditegakkan di Server):**
   - **Pengecekan Kuota Bebas Balapan (*Atomic Race-Free Quota Check*):** Batas tanggapan `max_responses` dievaluasi dalam satu kueri SQL bersyarat atomik.
   - **Satu Tanggapan per NIM / Kolom Kunci:** Nilai kolom kunci dinormalisasi dan dijamin unik melalui *unique constraint index* SQLite D1 (kesalahan duplikasi otomatis dipetakan ke kode `NIM_SUDAH_TERDAFTAR`).
   - **Pemeriksaan Tenggat Waktu (`closes_at`):** Disimpan dalam format UTC dan selalu diverifikasi di sisi server.
   - **Pengeditan Tanggapan Aman:**
     - Token acak 256-bit (`crypto.getRandomValues`), hanya *hash* SHA-256 yang disimpan di database.
     - Formulir diedit menggunakan versi skema saat tanggapan dibuat.
     - Kolom kunci unik **terkunci otomatis** saat pengeditan.
     - Logika percabangan dievaluasi ulang di server: kolom yang menjadi tersembunyi dihapus dari rekaman dan berkas lamanya ditandai untuk dihapus.

4. **Pengunggahan Berkas (Cloudflare R2):**
   - Batas ukuran berkas maksimal **3 MB per berkas**.
   - Kompresi gambar otomatis di sisi peramban (*client-side image compression*) menggunakan `browser-image-compression`.
   - Validasi ganda di server: ekstensi berkas dan verifikasi *magic bytes* asli (menolak berkas SVG, HTML, dan skrip berbahaya).
   - Penyimpanan privat di Cloudflare R2 dengan unduhan terautentikasi (`Content-Disposition: attachment` dan `X-Content-Type-Options: nosniff`).
   - *Cron Trigger* harian otomatis membersihkan berkas berstatus `deleted` dan berkas `pending` yang kedaluwarsa.

5. **Manajemen Tanggapan & Ekspor:**
   - Tabel dinamis dengan kolom yang dibangkitkan dari skema formulir.
   - Pencarian global, penyaringan per kolom, dan panel detail jawaban responden.
   - Fitur buat ulang (*regenerate*) tautan edit tanggapan.
   - **Ekspor CSV dan XLSX langsung di peramban** menggunakan SheetJS Community Edition, mengikuti hasil filter yang aktif.
   - **Proteksi Formula Injection:** Semua sel yang diawali karakter `=`, `+`, `-`, `@` otomatis diawali dengan tanda petik tunggal (`'`).

---

## 🛠️ Tech Stack & Arsitektur

- **Backend:** Cloudflare Workers (TypeScript) + [Hono](https://hono.dev/)
- **Basis Data:** Cloudflare D1 (SQLite terdistribusi)
- **Penyimpanan Berkas:** Cloudflare R2 Bucket
- **Frontend:** Vue 3 (Composition API) + Vite + Tailwind CSS + Vue Router + Pinia + SortableJS/vuedraggable
- **Validasi:** Zod (Pesan Bahasa Indonesia)
- **Ekspor:** SheetJS Community Edition (`https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz`)
- **Hosting & Routing:** Single Cloudflare Worker dengan **Static Assets** (SPA routing fallback ke `index.html`, Worker menangani `/api/*` lebih dulu).

---

## 📋 Struktur Direktori

```
Forms-Serverless-Form-Builder/
├── src/                    # Frontend Vue 3 (Admin & Form Publik)
│   ├── assets/             # Desain token, CSS global (Tailwind, Dark theme)
│   ├── components/         # Komponen umum, builder, & form-renderer
│   ├── router/             # Vue Router dengan penjaga autentikasi & lazy loading
│   ├── stores/             # Pinia stores (auth, formBuilder)
│   ├── utils/              # Pemformat tanggal (Asia/Jakarta), ekspor SheetJS, kompresi gambar
│   └── views/              # Halaman admin dan publik
├── worker/                 # Backend Cloudflare Worker (Hono)
│   ├── routes/             # Endpoint auth, admin forms, responses, upload, files
│   ├── middleware/         # Autentikasi sesi HMAC & proteksi CSRF Origin
│   ├── auth.ts             # Timing-safe comparison & derivasi HKDF
│   ├── cron.ts             # Pembersihan berkas harian (Cron Trigger)
│   ├── storage.ts          # Integrasi Cloudflare R2
│   └── index.ts            # Entrypoint Hono Worker
├── shared/                 # Kode bersama client & server
│   ├── types.ts            # Tipe TypeScript skema formulir & tanggapan
│   ├── errors.ts           # Kode error sistem & pemetaan pesan Bahasa Indonesia
│   ├── messages.ts         # Seluruh konstanta teks antarmuka (100% Bahasa Indonesia)
│   ├── presets.ts          # Validasi NIM UMM, Email UMM, Safe Regex, Magic Bytes
│   ├── evaluator.ts        # Mesin evaluasi kondisi, lompat halaman, & deteksi siklus
│   └── validator.ts        # Validasi masukan tanggapan dengan Zod
├── migrations/             # Migrasi SQL Cloudflare D1
│   └── 0001_init.sql
├── tests/                  # Pengujian integrasi end-to-end
│   └── e2e.test.ts
├── wrangler.jsonc          # Konfigurasi Cloudflare Worker, D1, R2, Assets, Rate Limits
├── .dev.vars.example       # Contoh variabel rahasia runtime
├── .dev.vars               # Variabel rahasia lokal (masuk .gitignore)
└── package.json
```

---

## 💻 Panduan Menjalankan Secara Lokal

### 1. Prasyarat
- Node.js versi 18 ke atas (direkomendasikan Node.js 20 atau 24).
- npm versi 9 ke atas.

### 2. Instalasi Dependensi
```bash
npm install
```

### 3. Konfigurasi Rahasia Lokal
Salin berkas `.dev.vars.example` menjadi `.dev.vars`:
```bash
cp .dev.vars.example .dev.vars
```
Isi default pada `.dev.vars` sudah siap pakai untuk pengujian lokal:
```ini
SITE_PASSWORD="kaliber_secret_password_123"
TURNSTILE_SECRET=""
ENVIRONMENT="development"
```

### 4. Terapkan Migrasi Basis Data Lokal (D1)
Jalankan perintah berikut untuk mengeksekusi tabel dan indeks pada basis data SQLite lokal Miniflare:
```bash
npm run db:migrate:local
```

### 5. Kompilasi Frontend & Jalankan Worker
Kompilasi berkas statis frontend ke folder `dist`:
```bash
npm run build
```

Lalu jalankan server lokal Cloudflare Worker:
```bash
npm run dev
```
Aplikasi akan aktif di `http://127.0.0.1:8787`:
- Masuk Admin: `http://127.0.0.1:8787/login` (Kata sandi: `kaliber_secret_password_123`).
- Dashboard: `http://127.0.0.1:8787/admin`.
- Formulir Publik: `http://127.0.0.1:8787/forms/<slug-form>`.

*(Opsional untuk pengembangan antarmuka cepat dengan Hot Module Replacement)*:
```bash
npm run dev:frontend
```
(Akan berjalan di `http://localhost:5173` dengan *proxy* otomatis ke backend Worker di port 8787).

---

## 🧪 Menjalankan Pengujian (Tests & Typecheck)

Seluruh logika murni (*evaluator*, *presets*, *validator*) dan integrasi *end-to-end* telah diuji dengan **Vitest**:

```bash
# Jalankan seluruh unit test dan end-to-end test
npm test

# Jalankan typecheck TypeScript
npm run typecheck
```

---

## ☁️ Langkah Deployment ke Cloudflare (Dokumentasi)

> **PENTING:** Jangan jalankan perintah deploy di lingkungan lokal ini sebelum akun Cloudflare Anda ditautkan via `wrangler login`.

### 1. Buat D1 Database di Cloudflare
```bash
npx wrangler d1 create forms_kaliber_db
```
Salin `database_id` yang dihasilkan ke dalam berkas `wrangler.jsonc` pada bagian `d1_databases`.

### 2. Buat R2 Storage Bucket di Cloudflare
```bash
npx wrangler r2 bucket create forms-kaliber-files
```

### 3. Terapkan Migrasi ke Remote D1
```bash
npm run db:migrate:remote
```

### 4. Simpan Secret di Cloudflare Worker
```bash
npx wrangler secret put SITE_PASSWORD
npx wrangler secret put TURNSTILE_SECRET
```

### 5. Deploy Aplikasi
```bash
npm run build
npx wrangler deploy
```

---

## 💡 Keputusan Desain & Teknis yang Diambil

1. **Autentikasi Bersama Sederhana dan Kuat:**
   - Memakai rahasia tunggal `SITE_PASSWORD` untuk mempermudah operasional organisasi tanpa perlu mengelola tabel pengguna yang rumit.
   - Perbandingan string kata sandi menggunakan `crypto.subtle.timingSafeEqual` dengan padding buffer untuk menjamin waktu eksekusi konstan (*timing-safe*) tanpa hashing tambahan.
   - Kunci tanda tangan HMAC diturunkan secara deterministik menggunakan **HKDF** dari `SITE_PASSWORD`. Jika kata sandi diganti, seluruh sesi lama otomatis tidak valid seketika.

2. **Kesesuaian Desain Visual (`DESIGN.md`):**
   - Mengadopsi palet warna gelap khas Kaliber: Latar `#101316` / `#1d2226`, aksen merah utama `#E5383B` dan `#C83338`, serta gradasi `#C83338` ke `#291C33`.
   - Menggunakan target sentuh tombol minimal 44px (`min-h-[44px]`) untuk aksesibilitas ramah ponsel.
   - Tipografi menggunakan font fallback monospace dan sans-serif yang konsisten dan bersih.

3. **Komponen Form Renderer Bersama (*Single Source of Truth*):**
   - Komponen `FormRenderer.vue` digunakan secara identik untuk pengisian formulir publik, pengeditan respon via token, dan tab pratinjau di dalam admin builder.
   - Ini memastikan apa yang dilihat admin saat mendesain formulir persis sama dengan apa yang dirasakan responden.

4. **Ekspor Lembar Sebar (*Spreadsheet*) di Sisi Klien:**
   - SheetJS dijalankan di sisi browser untuk memanfaatkan sumber daya memori klien dan melindungi batas waktu CPU Worker Cloudflare Free Tier (maksimal 10ms CPU time).
   - Seluruh nilai sel secara otomatis disanitasi dari potensi *formula injection* (misal sel yang diawali `=`, `+`, `-`, atau `@`).

5. **Pencegahan Perlombaan Kuota (*Atomic SQL Insert*):**
   - Alih-alih melakukan kueri `COUNT` terpisah lalu melakukan `INSERT`, server menggunakan `INSERT ... SELECT ... WHERE (SELECT COUNT(*) ...) < max_responses`. Kueri ini dieksekusi secara atomik oleh SQLite sehingga tidak akan terjadi *race condition* meskipun terdapat banyak responden yang menekan tombol kirim bersamaan.

---

## ⚡ Batasan Cloudflare Free Tier yang Relevan

| Layanan | Batasan Free Tier | Solusi / Mitigasi di Aplikasi |
|---|---|---|
| **Cloudflare Workers** | 100.000 requests / hari<br>10 ms CPU time per request | Logika server dibuat sangat ringan; kompresi gambar dan pembentukan berkas XLSX/CSV dialihkan ke browser. |
| **Cloudflare D1** | 5.000.000 reads / hari<br>100.000 writes / hari<br>Ukuran maksimal 5 GB | Indeks SQL dibuat presisi (`slug`, `form_id`, `edit_token_hash`); tidak ada kueri `SELECT *` yang membengkak; paginasi 500 tanggapan per halaman. |
| **Cloudflare R2** | 10 GB penyimpanan total<br>1.000.000 Class A ops / bulan<br>10.000.000 Class B ops / bulan | Batas berkas maksimal 3 MB per unggahan; kompresi otomatis gambar sebelum diunggah; *Cron Trigger* harian otomatis menghapus berkas usang/terhapus. |
| **Workers Rate Limiting** | Batas frekuensi per IP | Menjaga endpoint login, submit, dan upload dari serangan brute force dan flood. |

---

## 📄 Lisensi
Dikelola oleh **LSO Kaliber** untuk kebutuhan internal organisasi dan pendaftaran terbuka.
