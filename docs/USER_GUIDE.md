# Panduan Pengguna Lengkap: Anitya (Acitya Notes) 📖✨

> **Panduan Praktis, Fitur, Alur Kerja, dan Tips Penggunaan**  
> *Ekstensi Browser Modern untuk Menangkap Catatan Web, PDF, dan YouTube dengan Privasi Penuh.*

---

## 📑 Daftar Isi
1. [Pengenalan & Filosofi Anitya](#1-pengenalan--filosofi-anitya)
2. [Instalasi dan Konfigurasi Awal](#2-instalasi-dan-konfigurasi-awal)
3. [Tampilan Antarmuka & Navigasi](#3-tampilan-antarmuka--navigasi)
4. [Panduan Fitur Inti](#4-panduan-fitur-inti)
   - [4.1 Web Clipper & Markdown Notes](#41-web-clipper--markdown-notes)
   - [4.2 W3C Web Highlighter](#42-w3c-web-highlighter)
   - [4.3 YouTube Video Notetaker & Frame Capture](#43-youtube-video-notetaker--frame-capture)
   - [4.4 Transcript Extractor & Search](#44-transcript-extractor--search)
   - [4.5 Asisten AI Kontekstual & Privacy Guard](#45-asisten-ai-kontekstual--privacy-guard)
   - [4.6 Library & Mesin Pencarian Lokal](#46-library--mesin-pencarian-lokal)
5. [Manajemen Data & Integrasi Obsidian](#5-manajemen-data--integrasi-obsidian)
6. [Pengaturan & Personalisasi](#6-pengaturan--personalisasi)
7. [Tanya Jawab & Pemecahan Masalah (FAQ)](#7-tanya-jawab--pemecahan-masalah-faq)

---

## 1. Pengenalan & Filosofi Anitya

**Anitya** (dari filosofi Sansekerta tentang ketidakkekalan) dirancang untuk membantu Anda menangkap pemikiran, kutipan, dan ilmu pengetahuan yang sekilas melintas saat membaca artikel web, menonton video edukasi di YouTube, atau mempelajari dokumen riset. 

### Mengapa Memilih Anitya?
- **100% Local-First**: Seluruh catatan, sorotan (*highlights*), dan tangkapan layar (*screenshots*) tersimpan di dalam browser Anda (IndexedDB). Tidak ada pelacakan (*zero-telemetry*).
- **Zero-Friction**: Panel samping (*Chrome Side Panel*) tetap terbuka berdampingan dengan tab penelusuran Anda tanpa memotong atau merusak tata letak website.
- **Standar Terbuka W3C**: Sorotan teks tidak mudah rusak meskipun website melakukan pembaruan konten minor.
- **Bebas Keterikatan Vendor**: Ekspor catatan Anda ke Obsidian Vault (Markdown + Frontmatter YAML), file JSON cadangan penuh, CSV, atau subtitle VTT/SRT kapan saja.

---

## 2. Instalasi dan Konfigurasi Awal

### Memasang Ekstensi di Chrome / Brave / Edge (Developer Mode)
1. Buka peramban Google Chrome atau peramban berbasis Chromium lainnya.
2. Masuk ke halaman ekstensi: ketik `chrome://extensions/` pada bilah alamat.
3. Di pojok kanan atas, aktifkan tombol geser **Developer mode**.
4. Klik tombol **Load unpacked** (Muat yang belum dibongkar) di pojok kiri atas.
5. Pilih folder build ekstensi:
   ```
   path/to/anitya/.output/chrome-mv3
   ```
6. Ekstensi **Acitya Notes / Anitya** akan langsung terpasang di toolbar peramban Anda.
7. **Sematkan (Pin) Ekstensi**: Klik ikon puzzle di toolbar Chrome, lalu klik ikon pin di samping nama Acitya Notes.

### Membuka Side Panel
- Klik ikon Acitya di bilah toolbar browser, atau
- Klik kanan di sembarang halaman web, lalu pilih **Open Acitya Notes Panel**.

---

## 3. Tampilan Antarmuka & Navigasi

Side Panel dirancang responsif, mendukung lebar panel dari **280px** hingga **600px+**:

| Tab | Ikon | Deskripsi |
| :--- | :---: | :--- |
| **Notes** | 📝 | Editor Markdown catatan aktif dengan mode Edit, Split, dan Preview. |
| **Highlights** | 🎨 | Daftar kutipan teks yang disorot pada halaman web aktif. |
| **Video** | 🎥 | Catatan bertimestamp dua arah dan studio tangkapan layar video YouTube. |
| **Transcript** | 📜 | Penampil subtitle/transkrip video dengan pencarian instan dan ekspor multi-format. |
| **Library** | 🔍 | Perpustakaan pencarian lokal seluruh catatan, tag, dan koleksi. |
| **AI** | 🤖 | Asisten AI lokal/hibrida untuk ringkasan, Q&A grounded, dan flashcard. |

---

## 4. Panduan Fitur Inti

### 4.1 Web Clipper & Markdown Notes
1. **Membuat Catatan Baru**: Klik tombol **+ New Note** di bagian atas tab Notes.
2. **Klip Artikel Web Instan**: Saat membuka artikel berita atau blog ilmiah, klik tombol **Clip Page** di header atau popup. Judul, URL, ringkasan, dan teks terpilih akan otomatis terisi rapi.
3. **Editor Mode**:
   - **Edit Mode**: Fokus menulis konten Markdown.
   - **Split Mode**: Menampilkan editor teks dan hasil render berdampingan (secara cerdas menumpuk vertikal jika panel < 420px).
   - **Preview Mode**: Tampilan render Markdown bersih lengkap dengan penyorotan kode dan rendering tautan aman.
4. **Indikator Autosave**: Catatan tersimpan secara otomatis setiap kali Anda berhenti mengetik (500ms debounce) dengan indikator status ramah aksesibilitas.
5. **Penghitung Kata & Karakter**: Terlihat di pojok status editor secara real-time.

### 4.2 W3C Web Highlighter
1. **Menyorot Teks**: Blok kalimat atau paragraf pada website apa saja.
2. **Floating Toolbar**: Sebuah toolbar terapung berdesain elegan akan muncul di atas kursor Anda dengan 5 pilihan warna:
   - 🟡 **Kuning** (`#FEF08A`): Catatan penting umum.
   - 🟢 **Hijau** (`#BBF7D0`): Definisi & konsep baru.
   - 🔵 **Biru** (`#BAE6FD`): Referensi & fakta pendukung.
   - 🌸 **Merah Muda** (`#FBCFE8`): Pertanyaan & diskusi.
   - 🟣 **Ungu** (`#E9D5FF`): Kesimpulan & intisari.
3. **Menambahkan Anotasi**: Klik tombol pensil pada kartu highlight di tab Highlights untuk menambahkan catatan pribadi pada kutipan tersebut.
4. **Lompat Dua Arah (Two-Way Jump)**: Klik tombol **Jump** pada kartu sorotan di Side Panel; halaman web akan otomatis bergulir (*smooth scroll*) dan menyorot kalimat yang bersangkutan.

### 4.3 YouTube Video Notetaker & Frame Capture
Saat Anda membuka video YouTube, tab **Video** akan mendeteksi status video secara otomatis:
1. **Timestamp Otomatis**: Ketik catatan Anda pada kolom input di bawah, lalu tekan tombol **Add Note** atau tekan `Enter`.
2. **Kompensasi Waktu Reaksi (-5 Detik)**:
   - Sering kali Anda baru sempat menekan tombol beberapa detik setelah pemateri menyampaikan poin penting. Anitya secara cerdas mengurangi timestamp sebesar 5 detik (dapat diatur di Pengaturan).
3. **Tangkapan Layar Bingkai (Frame Capture)**:
   - Klik tombol kamera **Capture Frame**.
   - Frame video detik tersebut akan langsung dirender melalui HTML5 Canvas resolusi tinggi dan disimpan sebagai blob lokal di catatan Anda.
4. **Lompat ke Detik Video**: Klik sembarang penanda waktu `[mm:ss]` pada daftar catatan; pemutar video YouTube akan seketika melompat ke detik tersebut tanpa memuat ulang halaman.

### 4.4 Transcript Extractor & Search
1. Klik tab **Transcript**. Transkrip subtitle resmi maupun auto-generated YouTube akan diekstraksi secara otomatis.
2. **Pencarian Cepat**: Ketik kata kunci pada kolom pencarian transkrip untuk menemukan detik tepat di mana kata tersebut diucapkan.
3. **Ekspor Subtitle**: Klik tombol **Export** dan pilih format yang diinginkan:
   - `.vtt` (WebVTT subtitle standar)
   - `.srt` (SubRip subtitle video player)
   - `.md` (Markdown transkrip dengan penanda waktu)
   - Salin teks polos ke clipboard.

### 4.5 Asisten AI Kontekstual & Privacy Guard
Anitya menyediakan alat bantu kognitif yang dirancang tidak membocorkan data pribadi Anda:
- **Tindakan Cepat (One-Click Actions)**:
  - 📝 **Summarize**: Merangkum artikel atau transkrip video menjadi 3-5 kalimat padat.
  - 💡 **Key Takeaways**: Mengekstrak poin-poin utama dalam bentuk daftar berbutir (*bullet points*).
  - 📋 **Action Items**: Mengidentifikasi daftar tugas dan langkah nyata dari materi.
  - 🗂️ **Flashcards**: Membuat kartu belajar tanya-jawab untuk repetisi berjarak (*spaced repetition*).
  - ❓ **Grounded Q&A**: Ajukan pertanyaan bebas seputar materi aktif; AI menjawab hanya berdasarkan sumber yang dibuka.
- **Batalkan Proses Kapan Saja**: Tombol **Cancel** memungkinkan Anda menghentikan inferensi AI yang sedang berjalan.
- **Sisipkan ke Catatan**: Klik **Insert into Note** untuk langsung menempelkan hasil jawaban AI ke dalam catatan Markdown Anda.

### 4.6 Library & Mesin Pencarian Lokal
- Akses semua catatan dan kutipan dari tab **Library**.
- Filter berdasarkan tipe materi: *Web Article*, *YouTube Video*, atau *Quick Note*.
- Cari berdasarkan kata kunci judul, kutipan teks, atau tag `#riset`, `#coding`, dll.

---

## 5. Manajemen Data & Integrasi Obsidian

### Ekspor ke Obsidian Vault
1. Buka catatan yang ingin Anda ekspor di tab **Notes**.
2. Klik tombol **Export** di toolbar editor, pilih **Obsidian Markdown (.md)**.
3. Catatan akan terunduh lengkap dengan metadata YAML Frontmatter standar:
   ```markdown
   ---
   title: "Arsitektur Microservices Modern"
   source: "https://example.com/microservices"
   date: 2026-10-15
   tags: [arsitektur, backend, sistem]
   ---
   
   # Ringkasan Catatan
   ...
   ```
4. Pindahkan file tersebut langsung ke dalam folder vault Obsidian Anda.

### Cadangan Penuh (Full Backup & Restore)
- **Ekspor Cadangan**: Buka **Settings** -> **Data Management** -> Klik **Export Full Backup (JSON)**. File cadangan terenkripsi struktur JSON ini mencakup seluruh catatan, sorotan, koleksi, dan penanda waktu.
- **Pulihkan Cadangan (Restore)**: Buka **Settings** -> Klik **Import Backup (JSON)** -> Pilih file cadangan sebelumnya. Sistem akan melakukan validasi skema dan memperbarui catatan secara aman tanpa duplikasi.

---

## 6. Pengaturan & Personalisasi

Akses pengaturan melalui tombol gerigi ⚙️ di pojok kanan atas Side Panel:
- **Tema Visual**: Pilih antara *Dark Mode* (Obsidian void), *Light Mode*, atau mengikuti sistem operasi.
- **Warna Sorotan Bawaan**: Tentukan warna sorotan yang otomatis terpilih saat memblok teks.
- **Offset Reaksi Video**: Ubah durasi kompensasi reaksi (pilihan: 0s, 3s, 5s, 10s).
- **Konfigurasi AI Provider**:
  - *Chrome Built-in AI (Gemini Nano)*: Mode bawaan on-device tanpa kuota internet.
  - *Cloud LLM (OpenAI / Gemini API)*: Masukkan API Key dan pilih model (e.g. `gemini-2.5-flash` atau `gpt-4o-mini`).
  - *Persetujuan Privasi*: Tombol pengaman wajib diaktifkan sebelum ekstensi diperbolehkan mengirim teks ke API cloud pihak ketiga.
- **Pembersihan Data Aman**: Tombol **Erase All Data** dilindungi oleh verifikasi ketik `DELETE` untuk mencegah penghapusan data lokal secara tidak sengaja.

---

## 7. Tanya Jawab & Pemecahan Masalah (FAQ)

### T: Mengapa toolbar sorotan tidak muncul di halaman `chrome://` atau Chrome Web Store?
**J**: Ini adalah batasan keamanan resmi dari Google Chrome Manifest V3. Ekstensi browser tidak diizinkan menyuntikkan kode skrip (*content script*) pada halaman internal peramban atau toko ekstensi. Anda tetap dapat menggunakan tab *Quick Notes* di Side Panel.

### T: Mengapa tombol frame screenshot video YouTube menghasilkan gambar kosong pada video tertentu?
**J**: Beberapa platform video berbayar atau video dengan proteksi DRM Widevine tingkat tinggi mengaktifkan proteksi *tainted canvas*. Anitya menangani kasus ini dengan menampilkan pemberitahuan ramah tanpa membuat browser Anda macet. Catatan teks bertimestamp tetap tersimpan sempurna.

### T: Apakah ekstensi ini menggunakan server backend perantara?
**J**: Sama sekali tidak! Arsitektur Anitya sepenuhnya *serverless & client-side*. Komunikasi terjadi langsung antara peramban Anda dengan IndexedDB di komputer Anda.

### T: Bagaimana cara menghidupkan kembali tur pengenalan awal?
**J**: Klik ikon bintang berkilau `✨ Quick Tour & Tips` di header Side Panel, atau buka Pengaturan dan pilih **Replay Onboarding Tour**.
