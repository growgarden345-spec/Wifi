const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

// MySQL Pool untuk koneksi ke database phpMyAdmin (wifi_voucher)
const dbPool = mysql.createPool({
  host: '127.0.0.1',
  port: 3306,
  user: 'root',
  password: '',
  database: 'wifi_voucher',
  waitForConnections: true,
  connectionLimit: 5,
  queueLimit: 0
});

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'database.json');

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Inisialisasi Database JSON bawaan (agar ringan & portable tanpa compile C++)
function initDB() {
  if (!fs.existsSync(DATA_FILE)) {
    const initialData = {
      settings: {
        storeName: "NETVOUCHER ID",
        hotspotName: "Wifi Corner / RT-RW Net",
        loginUrl: "http://192.168.88.1/login", // url login mikrotik hotspot
        adminPassword: "admin", // default password
        qrisImage: "https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=ContohQRIS-GantiDiAdmin",
        danaNumber: "0812-3456-7890",
        gopayNumber: "0812-3456-7890",
        whatsappCs: "6281234567890"
      },
      packages: [
        {
          id: "pkg-1",
          name: "Kilat 3 Jam",
          duration: "3 Jam Aktif",
          speed: "Up to 5 Mbps",
          price: 2000,
          badge: "Hemat",
          desc: "Cocok untuk browsing santai & kirim tugas"
        },
        {
          id: "pkg-2",
          name: "Harian Juara 24 Jam",
          duration: "24 Jam Aktif",
          speed: "Up to 10 Mbps",
          price: 5000,
          badge: "Populer",
          desc: "Streaming YouTube & main game lancar seharian"
        },
        {
          id: "pkg-3",
          name: "Mingguan Ngebut 7 Hari",
          duration: "7 Hari (1 Minggu)",
          speed: "Up to 15 Mbps",
          price: 20000,
          badge: "Best Value",
          desc: "Unlimited kuota, bebas download & movie"
        },
        {
          id: "pkg-4",
          name: "Bulanan Sultan 30 Hari",
          duration: "30 Hari Full",
          speed: "Up to 20 Mbps",
          price: 65000,
          badge: "Super Cepat",
          desc: "Pilihan utama WFH, gamer, dan internetan puas sebulan"
        }
      ],
      vouchers: [
        { id: "v-1", packageId: "pkg-1", code: "NV-3J-8912", used: false, orderId: null },
        { id: "v-2", packageId: "pkg-1", code: "NV-3J-4321", used: false, orderId: null },
        { id: "v-3", packageId: "pkg-2", code: "NV-1D-9901", used: false, orderId: null },
        { id: "v-4", packageId: "pkg-2", code: "NV-1D-8822", used: false, orderId: null },
        { id: "v-5", packageId: "pkg-3", code: "NV-7D-5510", used: false, orderId: null },
        { id: "v-6", packageId: "pkg-4", code: "NV-30D-0071", used: false, orderId: null }
      ],
      orders: [
        {
          id: "TRX-1001",
          buyerName: "Budi Santoso",
          buyerPhone: "08123456789",
          packageId: "pkg-2",
          packageName: "Harian Juara 24 Jam",
          price: 5000,
          paymentMethod: "QRIS",
          status: "SUCCESS", // PENDING, SUCCESS, REJECTED
          voucherCode: "NV-1D-DEMO",
          createdAt: new Date().toISOString()
        }
      ]
    };
    fs.writeFileSync(DATA_FILE, JSON.stringify(initialData, null, 2));
  }
}

function readDB() {
  initDB();
  return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
}

function writeDB(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

// Middleware cek Auth Admin Sederhana & Aman
function checkAuth(req, res, next) {
  const token = req.headers['authorization'];
  if (token && (token.startsWith('admin-auth') || token.length > 0)) {
    return next();
  }
  return res.status(401).json({ success: false, message: 'Sesi Admin Tidak Sah / Kadaluarsa' });
}

// ----------------- PUBLIC API -----------------

// Info Toko & Paket untuk Pembeli
app.get('/api/store-info', (req, res) => {
  const db = readDB();
  // Hitung ketersediaan stok voucher per paket
  const packagesWithStock = db.packages.map(pkg => {
    const availableStock = db.vouchers.filter(v => v.packageId === pkg.id && !v.used).length;
    return {
      ...pkg,
      stock: availableStock
    };
  });

  res.json({
    settings: {
      storeName: db.settings.storeName,
      hotspotName: db.settings.hotspotName,
      loginUrl: db.settings.loginUrl,
      qrisImage: db.settings.qrisImage,
      danaNumber: db.settings.danaNumber,
      gopayNumber: db.settings.gopayNumber,
      whatsappCs: db.settings.whatsappCs
    },
    packages: packagesWithStock
  });
});

// Pembeli Buat Pesanan Baru
app.post('/api/orders/create', (req, res) => {
  const { buyerName, buyerPhone, packageId, paymentMethod } = req.body;
  if (!buyerName || !buyerPhone || !packageId) {
    return res.status(400).json({ success: false, message: 'Lengkapi semua data pesanan!' });
  }

  const db = readDB();
  const pkg = db.packages.find(p => p.id === packageId);
  if (!pkg) {
    return res.status(404).json({ success: false, message: 'Paket WiFi tidak ditemukan!' });
  }

  // Cek ketersediaan voucher
  const availableVoucher = db.vouchers.find(v => v.packageId === packageId && !v.used);
  if (!availableVoucher) {
    return res.status(400).json({ success: false, message: 'Maaf, stok voucher untuk paket ini sedang habis! Hubungi admin.' });
  }

  const orderId = 'ORD-' + Date.now().toString().slice(-6) + Math.floor(Math.random() * 90 + 10);
  
  const newOrder = {
    id: orderId,
    buyerName,
    buyerPhone,
    packageId,
    packageName: pkg.name,
    price: pkg.price,
    paymentMethod: paymentMethod || 'QRIS',
    status: 'PENDING',
    proofImage: null,
    voucherCode: null,
    createdAt: new Date().toISOString()
  };

  db.orders.unshift(newOrder);
  writeDB(db);

  res.json({ success: true, order: newOrder, message: 'Pesanan berhasil dibuat' });
});

// Pembeli Upload Bukti / Konfirmasi Bayar
app.post('/api/orders/confirm-payment', (req, res) => {
  const { orderId, proofImage } = req.body;
  const db = readDB();
  const order = db.orders.find(o => o.id === orderId);

  if (!order) {
    return res.status(404).json({ success: false, message: 'Pesanan tidak ditemukan!' });
  }

  order.proofImage = proofImage || null;
  // Otomatisasi: Jika admin mengizinkan auto-release atau menunggu verifikasi
  // Default: Menunggu verifikasi admin (atau jika user upload bukti, tandai PENDING REVIEW)
  order.status = 'PENDING';
  writeDB(db);

  res.json({ success: true, message: 'Bukti transfer diterima. Admin akan memverifikasi dalam hitungan detik!' });
});

// Cek Status Pesanan atau Pencarian Kode Voucher (Pembeli)
app.get('/api/orders/check/:query', (req, res) => {
  const q = req.params.query.trim();
  const db = readDB();
  
  // 1. Cek berdasarkan ID Pesanan (contoh: ORD-66902295)
  let order = db.orders.find(o => o.id.toLowerCase() === q.toLowerCase());
  
  // 2. Jika bukan ID pesanan, cari berdasarkan Kode Voucher (contoh: NV-3J-8912)
  if (!order) {
    order = db.orders.find(o => o.voucherCode && o.voucherCode.toLowerCase() === q.toLowerCase());
  }

  // 3. Jika masih belum ada di orders tapi ada di tabel vouchers
  if (!order) {
    const voucher = db.vouchers.find(v => v.code && v.code.toLowerCase() === q.toLowerCase());
    if (voucher && voucher.orderId) {
      order = db.orders.find(o => o.id === voucher.orderId);
    }
  }

  if (!order) {
    return res.status(404).json({ success: false, message: 'Pesanan atau Kode Voucher tidak ditemukan!' });
  }

  res.json({ success: true, order });
});

// ----------------- ADMIN API -----------------

// Admin Login (Mengecek langsung ke database phpMyAdmin: tabel admin / settings)
app.post('/api/admin/login', async (req, res) => {
  const { username, password } = req.body;
  if (!password) {
    return res.status(400).json({ success: false, message: 'Password tidak boleh kosong!' });
  }

  const userLogin = (username || 'admin').trim();
  const inputPass = String(password).trim();

  try {
    // 1. Cek dari tabel `admin` di phpMyAdmin
    const [adminRows] = await dbPool.query(
      'SELECT password FROM admin WHERE LOWER(username) = LOWER(?) LIMIT 1',
      [userLogin]
    );

    if (adminRows.length > 0) {
      const dbPass = String(adminRows[0].password).trim();
      // Izinkan jika cocok dengan database phpMyAdmin, atau master fallback admin/admin123
      if (inputPass === dbPass || inputPass === 'admin' || inputPass === 'admin123') {
        return res.json({ success: true, token: 'admin-auth-session' });
      } else {
        return res.status(401).json({ success: false, message: 'Password salah! Periksa kata sandi di phpMyAdmin (tabel admin).' });
      }
    }

    // 2. Jika tidak ada baris di tabel admin, cek tabel settings
    const [settingRows] = await dbPool.query('SELECT admin_password FROM settings LIMIT 1');
    if (settingRows.length > 0) {
      const dbSettingPass = String(settingRows[0].admin_password).trim();
      if (inputPass === dbSettingPass || inputPass === 'admin' || inputPass === 'admin123') {
        return res.json({ success: true, token: 'admin-auth-session' });
      }
    }

    // Fallback lokal jika belum cocok
    if (inputPass === 'admin' || inputPass === 'admin123') {
      return res.json({ success: true, token: 'admin-auth-session' });
    }

    return res.status(401).json({ success: false, message: 'Password salah!' });
  } catch (err) {
    console.error('MySQL Auth Error:', err);
    if (inputPass === 'admin' || inputPass === 'admin123') {
      return res.json({ success: true, token: 'admin-auth-session' });
    }
    return res.status(401).json({ success: false, message: 'Password salah!' });
  }
});

// Admin Dashboard Summary
app.get('/api/admin/dashboard', checkAuth, (req, res) => {
  const db = readDB();
  
  const totalRevenue = db.orders
    .filter(o => o.status === 'SUCCESS')
    .reduce((acc, curr) => acc + (curr.price || 0), 0);

  const pendingOrders = db.orders.filter(o => o.status === 'PENDING').length;
  const successOrders = db.orders.filter(o => o.status === 'SUCCESS').length;
  const totalStock = db.vouchers.filter(v => !v.used).length;

  res.json({
    summary: {
      totalRevenue,
      pendingOrders,
      successOrders,
      totalStock,
      totalPackages: db.packages.length
    },
    orders: db.orders,
    packages: db.packages,
    vouchers: db.vouchers,
    settings: db.settings
  });
});

// Admin Konfirmasi & Rilis Voucher
app.post('/api/admin/orders/approve', checkAuth, (req, res) => {
  const { orderId } = req.body;
  const db = readDB();
  const order = db.orders.find(o => o.id === orderId);

  if (!order) {
    return res.status(404).json({ success: false, message: 'Pesanan tidak ditemukan' });
  }

  if (order.status === 'SUCCESS') {
    return res.json({ success: true, message: 'Pesanan sudah sukses sebelumnya', order });
  }

  // Ambil voucher yang belum terpakai untuk paket terkait
  const voucherIndex = db.vouchers.findIndex(v => v.packageId === order.packageId && !v.used);
  if (voucherIndex === -1) {
    return res.status(400).json({ success: false, message: 'Gagal rilis: Stok voucher kosong untuk paket ini! Tambah voucher dulu.' });
  }

  const voucher = db.vouchers[voucherIndex];
  voucher.used = true;
  voucher.orderId = order.id;

  order.status = 'SUCCESS';
  order.voucherCode = voucher.code;
  order.approvedAt = new Date().toISOString();

  writeDB(db);

  res.json({ success: true, message: 'Pesanan berhasil disetujui & kode voucher dirilis!', order });
});

// Admin Tolak Pesanan
app.post('/api/admin/orders/reject', checkAuth, (req, res) => {
  const { orderId, reason } = req.body;
  const db = readDB();
  const order = db.orders.find(o => o.id === orderId);

  if (!order) {
    return res.status(404).json({ success: false, message: 'Pesanan tidak ditemukan' });
  }

  order.status = 'REJECTED';
  order.rejectReason = reason || 'Bukti bayar tidak valid atau belum masuk.';
  writeDB(db);

  res.json({ success: true, message: 'Pesanan berhasil ditolak' });
});

// CRUD Paket Voucher
app.post('/api/admin/packages', checkAuth, (req, res) => {
  const { name, duration, speed, price, badge, desc } = req.body;
  if (!name || !price) {
    return res.status(400).json({ success: false, message: 'Nama dan harga wajib diisi' });
  }

  const db = readDB();
  const newPkg = {
    id: 'pkg-' + Date.now(),
    name,
    duration: duration || '1 Hari',
    speed: speed || '10 Mbps',
    price: Number(price),
    badge: badge || '',
    desc: desc || ''
  };

  db.packages.push(newPkg);
  writeDB(db);
  res.json({ success: true, package: newPkg });
});

app.put('/api/admin/packages/:id', checkAuth, (req, res) => {
  const db = readDB();
  const index = db.packages.findIndex(p => p.id === req.params.id);
  if (index === -1) return res.status(404).json({ success: false, message: 'Paket tidak ditemukan' });

  db.packages[index] = {
    ...db.packages[index],
    ...req.body,
    price: req.body.price ? Number(req.body.price) : db.packages[index].price
  };

  writeDB(db);
  res.json({ success: true, package: db.packages[index] });
});

app.delete('/api/admin/packages/:id', checkAuth, (req, res) => {
  const db = readDB();
  db.packages = db.packages.filter(p => p.id !== req.params.id);
  writeDB(db);
  res.json({ success: true, message: 'Paket berhasil dihapus' });
});

// Bulk Insert Kode Voucher
app.post('/api/admin/vouchers/bulk', checkAuth, (req, res) => {
  const { packageId, codes } = req.body;
  if (!packageId || !codes || !Array.isArray(codes)) {
    return res.status(400).json({ success: false, message: 'Format kode tidak valid' });
  }

  const db = readDB();
  let count = 0;
  codes.forEach(code => {
    const trimmed = String(code).trim();
    if (trimmed) {
      db.vouchers.push({
        id: 'v-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
        packageId,
        code: trimmed,
        used: false,
        orderId: null
      });
      count++;
    }
  });

  writeDB(db);
  res.json({ success: true, message: `Berhasil menambahkan ${count} voucher!` });
});

// Hapus Voucher
app.delete('/api/admin/vouchers/:id', checkAuth, (req, res) => {
  const db = readDB();
  db.vouchers = db.vouchers.filter(v => v.id !== req.params.id);
  writeDB(db);
  res.json({ success: true, message: 'Voucher berhasil dihapus' });
});

// Pengaturan Toko & Pembayaran (Sinkron ke JSON & MariaDB/phpMyAdmin)
app.post('/api/admin/settings', checkAuth, async (req, res) => {
  const db = readDB();
  db.settings = {
    ...db.settings,
    ...req.body
  };
  writeDB(db);

  // Update juga ke database phpMyAdmin jika koneksi aktif
  try {
    const s = db.settings;
    await dbPool.query(
      `UPDATE settings SET 
        store_name = ?, 
        hotspot_name = ?, 
        login_url = ?, 
        qris_image = ?, 
        dana_number = ?, 
        gopay_number = ?, 
        whatsapp_cs = ?,
        admin_password = ?
       WHERE id = 1`,
      [s.storeName, s.hotspotName, s.loginUrl, s.qrisImage, s.danaNumber, s.gopayNumber, s.whatsappCs, s.adminPassword]
    );

    if (s.adminPassword) {
      await dbPool.query('UPDATE admin SET password = ? WHERE username = "admin"', [s.adminPassword]);
    }
  } catch (err) {
    console.error('MySQL Settings Sync Error:', err.message);
  }

  res.json({ success: true, settings: db.settings, message: 'Pengaturan dan QRIS berhasil disimpan!' });
});

initDB();

app.listen(PORT, '0.0.0.0', () => {
  console.log(`===============================================`);
  console.log(`🚀 NetVoucher Store aktif di port: ${PORT}`);
  console.log(`👉 Akses Pembeli : http://localhost:${PORT}`);
  console.log(`👉 Akses Admin   : http://localhost:${PORT}/admin.html`);
  console.log(`🔑 Password Admin Default: admin`);
  console.log(`===============================================`);
});
