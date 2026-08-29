# 🌐 SAKU FULL-SPECTRUM FINANCIAL TOUCHPOINT MAP
## KONSOLIDASI LENGKAP KEUANGAN OFFLINE & ONLINE

---

### EXECUTIVE SUMMARY
SAKU consolidates **12 Real-World Financial Touchpoints** across offline and online life into a single lightweight dashboard, ensuring no money leaks or forgotten obligations exist.

---

## 1. TOUCHPOINT OFFLINE (KEUANGAN LURING & FISIK)

```
┌─────────────────────────────────────────────────────────────────────────┐
│ 6 TOUCHPOINT KEUANGAN OFFLINE SAKU                                      │
├─────────────────────────────────────────────────────────────────────────┤
│ 1. CASH IN HAND & CELENGAN: Dompet fisik, kas kecil, dompet koin.      │
│ 2. ARISAN & KAS KELOMPOK: Jadwal kocokan arisan & nominal iuran.        │
│ 3. CASBON & PIUTANG TEMAN: Catatan pinjaman informal & status bayar.    │
│ 4. EMAS FISIK & LOGAM MULIA: Gramasi emas Antam/UBS + nilai buyback.   │
│ 5. GARANSI BARANG & STRUK: Foto nota + pengingat tanggal habis garansi. │
│ 6. ASET FISIK BERHARGA: Estimasi nilai pasar Motor, Mobil, Properti.    │
└─────────────────────────────────────────────────────────────────────────┘
```

1. **Kas Fisik & Celengan (Cash in Hand)**:
   - Menghitung uang tunai di dompet fisik, uang di laci, dan celengan koin.
2. **Arisan & Kas Komunitas (Arisan Tracker)**:
   - Mencatat iuran arisan bulanan, jadwal kocokan, dan status saat Anda mendapat giliran (*"Dapat Arisan"* = Income).
3. **Piutang & Kasbon Informal**:
   - Mencatat uang yang dipinjamkan ke teman/kerabat lengkap dengan tombol 1-tap "Sudah Lunas".
4. **Emas Fisik / Logam Mulia (Antam / UBS)**:
   - Mencatat berat gramasi emas fisik di brankas + harga *buyback* harian untuk menambah Net Worth.
5. **Pengingat Garansi Barang (Warranty & Receipt Vault)**:
   - Menyimpan foto nota belanja elektronik + pengingat tanggal kedaluwarsa garansi barang.
6. **Aset Fisik Utama (Properti & Kendaraan)**:
   - Menampilkan estimasi harga pasar kendaraan atau rumah sebagai bagian dari Total Aset.

---

## 2. TOUCHPOINT ONLINE (KEUANGAN DARING & DIGITAL)

```
┌─────────────────────────────────────────────────────────────────────────┐
│ 6 TOUCHPOINT KEUANGAN ONLINE SAKU                                       │
├─────────────────────────────────────────────────────────────────────────┤
│ 1. RECURRING BILLS & SUBSCRIPTIONS: WiFi, PLN, Netflix, Spotify.        │
│ 2. PAJAK TAHUNAN (STNK & PBB): Pengingat jatuh tempo pajak motor/rumah. │
│ 3. PAYLATER & KARTU KREDIT: GoPayLater, ShopeePayLater, Kredivo.        │
│ 4. POIN REWARDS & COINS: GoPay Coins, Shopee Coins, OVO Points.         │
│ 5. INVESTASI DIGITAL: Bibit, Stockbit, Indodax, Tokocrypto, Seabank.    │
│ 6. ACTIVE TRADING MT5: Read-only viewer ekuitas & deal harian MetaTrader.│
└─────────────────────────────────────────────────────────────────────────┘
```

1. **Tagihan Berulang (Subscriptions & Bills)**:
   - WiFi, PLN, PDAM, Netflix, Spotify dengan pengingat H-3 tanggal jatuh tempo.
2. **Pajak Tahunan (Pajak STNK & PBB Rumah)**:
   - Pengingat jatuh tempo Pajak Kendaraan Bermotor (STNK) dan PBB agar tidak kena denda keterlambatan.
3. **PayLater & Kartu Kredit (Limit & Billing Date)**:
   - Memantau sisa limit dan tanggal cetak tagihan GoPayLater, ShopeePayLater, Kredivo, atau Kartu Kredit.
4. **Poin Rewards Digital (Coins & Points)**:
   - Menampilkan saldo Shopee Coins, GoPay Coins, atau OVO Points yang memiliki nilai konversi rupiah nyata.
5. **Investasi Digital (Saham, Reksadana, Crypto, SBN)**:
   - Memantau nilai portofolio terkini dari Bibit, Stockbit, Indodax, Tokocrypto, dan Seabank/Jago.
6. **Active Trading MT5 (Forex & Gold)**:
   - Menampilkan ekuitas live dan profit/loss harian dari akun MetaTrader 5 secara *read-only*.
   - Sumber data (ADR-022): **konektor cloud investor-password** (server-side pull, tanpa EA,
     tanpa terminal nyala) + **rekonsiliasi statement/CSV** sebagai dokumen resmi. Ekuitas hanya
     tampilan — angka masuk ke kekayaan lewat jurnal deal. EA `SakuBridge.mq5` berstatus
     *legacy* (opsi privasi zero-password), lihat `services/deprecated/mt5-ea/`.

---

## 3. DESIGN INTEGRATION IN SAKU UI

Seluruh 12 Touchpoint di atas diintegrasikan ke dalam SAKU secara ringan dalam bentuk **Kartu Summary Ringkas** tanpa membebani performa aplikasi.
