-- ==========================================================
-- Database SQL untuk Web Jual Voucher WiFi
-- Kompatibel dengan phpMyAdmin / MySQL / MariaDB
-- ==========================================================

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+07:00";

-- --------------------------------------------------------
-- 1. Tabel: settings (Pengaturan Toko, QRIS, Hotspot)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `settings` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `store_name` varchar(150) NOT NULL DEFAULT 'NETVOUCHER ID',
  `hotspot_name` varchar(150) NOT NULL DEFAULT 'Wifi Corner / RT-RW Net',
  `login_url` varchar(255) NOT NULL DEFAULT 'http://192.168.88.1/login',
  `admin_password` varchar(255) NOT NULL DEFAULT 'admin',
  `qris_image` text DEFAULT NULL,
  `dana_number` varchar(50) DEFAULT '0812-3456-7890',
  `gopay_number` varchar(50) DEFAULT '0812-3456-7890',
  `whatsapp_cs` varchar(50) DEFAULT '6281234567890',
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO `settings` (`id`, `store_name`, `hotspot_name`, `login_url`, `admin_password`, `qris_image`, `dana_number`, `gopay_number`, `whatsapp_cs`) VALUES
(1, 'NETVOUCHER ID', 'Wifi Corner / RT-RW Net', 'http://192.168.88.1/login', 'admin', 'https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=ContohQRIS-GantiDiAdmin', '0812-3456-7890', '0812-3456-7890', '6281234567890');

-- --------------------------------------------------------
-- 2. Tabel: packages (Daftar Paket Voucher)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `packages` (
  `id` varchar(50) NOT NULL,
  `name` varchar(100) NOT NULL,
  `duration` varchar(50) NOT NULL,
  `speed` varchar(50) DEFAULT 'Up to 10 Mbps',
  `price` int(11) NOT NULL,
  `badge` varchar(50) DEFAULT NULL,
  `description` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO `packages` (`id`, `name`, `duration`, `speed`, `price`, `badge`, `description`) VALUES
('pkg-1', 'Kilat 3 Jam', '3 Jam Aktif', 'Up to 5 Mbps', 2000, 'Hemat', 'Cocok untuk browsing santai & kirim tugas'),
('pkg-2', 'Harian Juara 24 Jam', '24 Jam Aktif', 'Up to 10 Mbps', 5000, 'Populer', 'Streaming YouTube & main game lancar seharian'),
('pkg-3', 'Mingguan Ngebut 7 Hari', '7 Hari (1 Minggu)', 'Up to 15 Mbps', 20000, 'Best Value', 'Unlimited kuota, bebas download & movie'),
('pkg-4', 'Bulanan Sultan 30 Hari', '30 Hari Full', 'Up to 20 Mbps', 65000, 'Super Cepat', 'Pilihan utama WFH, gamer, dan internetan sebulan');

-- --------------------------------------------------------
-- 3. Tabel: vouchers (Stok Kode Voucher dari Mikrotik)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `vouchers` (
  `id` varchar(50) NOT NULL,
  `package_id` varchar(50) NOT NULL,
  `code` varchar(100) NOT NULL,
  `used` tinyint(1) NOT NULL DEFAULT 0,
  `order_id` varchar(50) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `package_id` (`package_id`),
  KEY `order_id` (`order_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO `vouchers` (`id`, `package_id`, `code`, `used`, `order_id`) VALUES
('v-1', 'pkg-1', 'NV-3J-8912', 0, NULL),
('v-2', 'pkg-1', 'NV-3J-4321', 0, NULL),
('v-3', 'pkg-2', 'NV-1D-9901', 0, NULL),
('v-4', 'pkg-2', 'NV-1D-8822', 0, NULL),
('v-5', 'pkg-3', 'NV-7D-5510', 0, NULL),
('v-6', 'pkg-4', 'NV-30D-0071', 0, NULL);

-- --------------------------------------------------------
-- 4. Tabel: orders (Data Transaksi Pembelian)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `orders` (
  `id` varchar(50) NOT NULL,
  `buyer_name` varchar(100) NOT NULL,
  `buyer_phone` varchar(30) NOT NULL,
  `package_id` varchar(50) NOT NULL,
  `package_name` varchar(100) NOT NULL,
  `price` int(11) NOT NULL,
  `payment_method` varchar(30) NOT NULL DEFAULT 'QRIS',
  `status` enum('PENDING','SUCCESS','REJECTED') NOT NULL DEFAULT 'PENDING',
  `voucher_code` varchar(100) DEFAULT NULL,
  `reject_reason` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `approved_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO `orders` (`id`, `buyer_name`, `buyer_phone`, `package_id`, `package_name`, `price`, `payment_method`, `status`, `voucher_code`, `created_at`) VALUES
('TRX-1001', 'Budi Santoso', '08123456789', 'pkg-2', 'Harian Juara 24 Jam', 5000, 'QRIS', 'SUCCESS', 'NV-1D-DEMO', CURRENT_TIMESTAMP);

COMMIT;
