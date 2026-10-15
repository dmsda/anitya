# Panduan Berkontribusi: Anitya (Acitya Notes) 🤝

Terima kasih atas minat Anda untuk berkontribusi pada pengembangan **Anitya (Acitya Notes)**! Proyek ini terbuka untuk kontribusi berupa perbaikan bug, penambahan fitur, peningkatan dokumentasi, maupun optimasi performa.

---

## 🛠️ Lingkungan Pengembangan (Development Setup)

### Prasyarat
- **Node.js**: Versi 20+ (Direkomendasikan Node.js 22 LTS)
- **Package Manager**: `npm` (v10+)
- **Browser**: Google Chrome, Brave, atau Microsoft Edge (Chromium based)

### Langkah Pemasangan
1. **Fork & Clone Repositori**:
   ```bash
   git clone https://github.com/dmsda/anitya.git
   cd anitya
   ```

2. **Pasang Dependensi**:
   ```bash
   npm install
   ```

3. **Jalankan Server Pengembangan (HMR)**:
   ```bash
   npm run dev
   ```
   WXT akan mengompilasi ekstensi ke folder `.output/chrome-mv3` secara otomatis dengan fitur *Hot Module Replacement* (HMR).

4. **Muat Ekstensi di Chrome**:
   - Buka `chrome://extensions/`
   - Aktifkan **Developer mode** di pojok kanan atas.
   - Klik **Load unpacked** dan pilih folder `.output/chrome-mv3`.

---

## 🧪 Skrip & Validasi Kualitas Kode

Sebelum membuat commit atau mengajukan Pull Request, pastikan seluruh pemeriksaan kualitas berikut lulus dengan nilai sempurna:

### 1. Pengecekan Tipe TypeScript & Svelte
```bash
npm run check
```
*Harus menghasilkan: `svelte-check found 0 errors and 0 warnings`.*

### 2. Menjalankan Automated Test Suite
```bash
npm test
```
*Seluruh 31 unit & integration test Vitest harus lolos (`31 passed (31)`).*

### 3. Kompilasi Uji Produksi
```bash
npm run build
```
*Memastikan ekstensi berhasil dibundel menjadi paket produksi siap edar tanpa kesalahan build.*

---

## 📐 Standar Koding & Arsitektur

### 1. Svelte 5 Runes
Gunakan standar reaktivitas modern Svelte 5:
- Gunakan `$state()` untuk state reaktif.
- Gunakan `$derived()` atau `$derived.by()` untuk komputasi turunan.
- Gunakan `$effect()` untuk efek samping yang bergantung pada state.
- Hindari deklarasi lama seperti `let x = $state()` tanpa rune atau syntax `$:`.

### 2. TypeScript Ketat (Strict Null Safety)
- Kode harus mematuhi konfigurasi TypeScript ketat dengan `noUncheckedIndexedAccess: true`.
- Selalu tangani kemungkinan `undefined` pada array indexing (contoh: gunakan `items[i] ?? default` atau array destructuring dengan fallback `[a = 0, b = 0] = arr`).

### 3. UI & Aksesibilitas (WCAG 2.2 AA)
- Hindari penggunaan native browser `alert()`, `confirm()`, atau `prompt()`. Gunakan `toast` dari `src/lib/toast.ts` atau `ConfirmModal.svelte`.
- Seluruh elemen interaktif wajib memiliki `aria-label` yang jelas dan mendukung navigasi keyboard (`:focus-visible`).
- Gunakan token tema warna dari `src/assets/styles/theme.css` alih-alih hardcoded color strings.

### 4. Isolasi DOM Content Script
- Setiap elemen UI yang disuntikkan ke halaman web eksternal wajib berada di dalam **Closed Shadow DOM** agar tidak terpengaruh CSS halaman asli dan tidak membocorkan event.

---

## 🌿 Alur Kerja Git & Pull Request

1. **Buat Branch Fitur Baru**:
   ```bash
   git checkout -b feature/nama-fitur-keren
   # atau
   git checkout -b fix/deskripsi-bug
   ```

2. **Format Pesan Commit (Conventional Commits)**:
   Gunakan format standar:
   - `feat: tambah tombol ekspor CSV pada daftar sorotan`
   - `fix: tangani tainted canvas pada video DRM secara anggun`
   - `docs: perbarui panduan instalasi dan diagram arsitektur`
   - `test: tambahkan unit test untuk cascade deletion IndexedDB`

3. **Kirim Pull Request**:
   - Jelaskan motivasi perubahan, fitur baru yang ditambahkan, dan bukti hasil test (`npm test` & `npm run check`).
   - Sertakan tangkapan layar jika perubahan menyangkut UI/UX.

---

## 📜 Lisensi
Dengan berkontribusi pada proyek ini, Anda menyetujui bahwa kontribusi Anda dilisensikan di bawah lisensi [MIT License](../LICENSE).
