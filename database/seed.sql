-- =============================================================
-- Sporthink Dynamic Pricing System — Seed Data
-- Run AFTER schema.sql
-- =============================================================

USE sporthink;

-- ----------------------------
-- ROLLER
-- ----------------------------
INSERT INTO roller (rol_adi, aciklama) VALUES
('Admin',     'Tam erişim yetkisi'),
('Operasyon', 'Fiyat onaylama ve işlem yetkisi'),
('Analiz',    'Salt okuma ve raporlama yetkisi');

-- ----------------------------
-- KULLANICILAR (password = "Test1234!" bcrypt hashed)
-- ----------------------------
INSERT INTO kullanicilar (ad_soyad, eposta, sifre_hash) VALUES
('Ahmet Geçgel',   'ahmet@sporthink.com.tr',  '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi'),
('Selen Günaydin', 'selen@sporthink.com.tr',  '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi'),
('Mehmet Yıldız',  'mehmet@sporthink.com.tr', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi');

-- ----------------------------
-- KULLANICI_ROL
-- ----------------------------
INSERT INTO kullanici_rol (kullanici_id, rol_id) VALUES
(1, 1), -- Ahmet  → Admin
(2, 2), -- Selen  → Operasyon
(3, 3); -- Mehmet → Analiz

-- ----------------------------
-- KATEGORILER
-- ----------------------------
INSERT INTO kategoriler (kategori_adi, kar_beklentisi) VALUES
('Koşu Ayakkabısı',   0.35),
('Spor Giyim',        0.40),
('Futbol Ekipmanı',   0.30),
('Outdoor & Doğa',    0.38),
('Fitness & Antrenman', 0.32);

-- ----------------------------
-- MARKA
-- ----------------------------
INSERT INTO marka (marka_adi) VALUES
('Nike'),
('Adidas'),
('Puma'),
('New Balance'),
('Under Armour'),
('Asics'),
('Salomon'),
('Decathlon'),
('Reebok'),
('Columbia');

-- ----------------------------
-- SEZONLAR
-- ----------------------------
INSERT INTO sezonlar (sezon_adi, baslangic_tarihi, bitis_tarihi) VALUES
('İlkbahar / Yaz 2025', '2025-03-01', '2025-08-31'),
('Sonbahar / Kış 2025', '2025-09-01', '2026-02-28'),
('İlkbahar / Yaz 2026', '2026-03-01', '2026-08-31');

-- ----------------------------
-- KATEGORI_SEZON
-- ----------------------------
INSERT INTO kategori_sezon (kategori_id, sezon_id) VALUES
(1, 1), (1, 3), -- Koşu → İY
(2, 1), (2, 2), (2, 3), -- Spor Giyim → Her sezon
(3, 1), (3, 3), -- Futbol → İY
(4, 2),         -- Outdoor → SK
(5, 1), (5, 2), (5, 3); -- Fitness → Her sezon

-- ----------------------------
-- BEDEN
-- ----------------------------
INSERT INTO beden (beden_adi) VALUES
('XS'), ('S'), ('M'), ('L'), ('XL'), ('XXL'),
('38'), ('39'), ('40'), ('41'), ('42'), ('43'), ('44'), ('45');

-- ----------------------------
-- KANALLAR
-- ----------------------------
INSERT INTO kanallar (kanal_adi, kanal_url, kanal_aciklamasi, kanal_sahibi) VALUES
('Sporthink Web', 'https://www.sporthink.com.tr', 'Kendi web sitemiz', 1),
('Trendyol',      'https://www.trendyol.com',     'Trendyol pazaryeri', 0),
('Amazon TR',     'https://www.amazon.com.tr',    'Amazon Türkiye pazaryeri', 0);

-- ----------------------------
-- URUNLER (50 products)
-- ----------------------------
INSERT INTO urunler (barkod, stok_kodu, urun_adi, kategori_id, marka_id, maliyet, resim_url) VALUES
-- Koşu Ayakkabısı (kategori 1)
('8690000001', 'NK-AIR-001', 'Nike Air Max 270 Erkek Koşu Ayakkabısı',       1, 1,  850.00, 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400'),
('8690000002', 'NK-REA-002', 'Nike React Infinity Run Flyknit 3',             1, 1,  920.00, 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400'),
('8690000003', 'AD-ULB-003', 'Adidas Ultraboost 22 Koşu Ayakkabısı',         1, 2,  780.00, 'https://images.unsplash.com/photo-1608231387042-66d1773d3028?w=400'),
('8690000004', 'AD-STA-004', 'Adidas Stan Smith Erkek Günlük Ayakkabı',      1, 2,  520.00, 'https://images.unsplash.com/photo-1608231387042-66d1773d3028?w=400'),
('8690000005', 'PM-NIT-005', 'Puma Nitro Run Koşu Ayakkabısı',               1, 3,  610.00, 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400'),
('8690000006', 'NB-1080-006','New Balance Fresh Foam X 1080v13',              1, 4, 1050.00, 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400'),
('8690000007', 'AS-GEL-007', 'Asics Gel-Nimbus 25 Koşu Ayakkabısı',         1, 6,  890.00, 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400'),
('8690000008', 'NK-PEG-008', 'Nike Air Zoom Pegasus 40 Erkek',               1, 1,  760.00, 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400'),
('8690000009', 'RB-NAN-009', 'Reebok Nano X3 Antrenman Ayakkabısı',         1, 9,  580.00, 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400'),
('8690000010', 'UA-HOV-010', 'Under Armour HOVR Machina 3 Koşu',            1, 5,  710.00, 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400'),
-- Spor Giyim (kategori 2)
('8690000011', 'NK-DRI-011', 'Nike Dri-FIT Erkek Koşu Tişörtü',             2, 1,  180.00, 'https://images.unsplash.com/photo-1583744946564-b52ac1c389c8?w=400'),
('8690000012', 'NK-DRI-012', 'Nike Dri-FIT Kadın Koşu Tişörtü',             2, 1,  185.00, 'https://images.unsplash.com/photo-1583744946564-b52ac1c389c8?w=400'),
('8690000013', 'AD-AEO-013', 'Adidas Aeroready Erkek Antrenman Tişörtü',    2, 2,  165.00, 'https://images.unsplash.com/photo-1583744946564-b52ac1c389c8?w=400'),
('8690000014', 'PM-ENJ-014', 'Puma Enjoy Kadın Spor Taytı',                 2, 3,  280.00, 'https://images.unsplash.com/photo-1583744946564-b52ac1c389c8?w=400'),
('8690000015', 'UA-COM-015', 'Under Armour Compression Erkek Taytı',        2, 5,  320.00, 'https://images.unsplash.com/photo-1583744946564-b52ac1c389c8?w=400'),
('8690000016', 'NK-TEC-016', 'Nike Tech Fleece Kapüşonlu Sweatshirt',       2, 1,  520.00, 'https://images.unsplash.com/photo-1583744946564-b52ac1c389c8?w=400'),
('8690000017', 'AD-ESS-017', 'Adidas Essentials 3 Bantlı Eşofman Altı',    2, 2,  290.00, 'https://images.unsplash.com/photo-1583744946564-b52ac1c389c8?w=400'),
('8690000018', 'RB-CLF-018', 'Reebok Classic Kadın Eşofman Üstü',          2, 9,  310.00, 'https://images.unsplash.com/photo-1583744946564-b52ac1c389c8?w=400'),
('8690000019', 'PM-ACT-019', 'Puma Active Erkek Şort',                      2, 3,  145.00, 'https://images.unsplash.com/photo-1583744946564-b52ac1c389c8?w=400'),
('8690000020', 'UA-SPE-020', 'Under Armour Sportstyle Erkek Kapüşonlu',     2, 5,  480.00, 'https://images.unsplash.com/photo-1583744946564-b52ac1c389c8?w=400'),
-- Futbol Ekipmanı (kategori 3)
('8690000021', 'AD-PRD-021', 'Adidas Predator Edge Erkek Krampon',          3, 2,  680.00, 'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?w=400'),
('8690000022', 'NK-MER-022', 'Nike Mercurial Superfly 9 Krampon',           3, 1,  820.00, 'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?w=400'),
('8690000023', 'PM-FUT-023', 'Puma Future Z 1.4 FG Krampon',               3, 3,  590.00, 'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?w=400'),
('8690000024', 'AD-CHM-024', 'Adidas Champions League Maç Topu',            3, 2,  210.00, 'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?w=400'),
('8690000025', 'NK-STR-025', 'Nike Strike Futbol Antrenman Topu',           3, 1,  150.00, 'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?w=400'),
('8690000026', 'AD-ADI-026', 'Adidas Erkek Futbol Forması',                 3, 2,  380.00, 'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?w=400'),
('8690000027', 'NK-GKT-027', 'Nike Kaleci Eldiveni Match',                  3, 1,  220.00, 'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?w=400'),
('8690000028', 'PM-ITA-028', 'Puma İtalya Milli Takım Forması',            3, 3,  650.00, 'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?w=400'),
-- Outdoor & Doğa (kategori 4)
('8690000029', 'SL-XA3-029', 'Salomon XA Pro 3D V9 Erkek Patika Ayakkabı', 4, 7,  980.00, 'https://images.unsplash.com/photo-1486915309851-b0cc1f8a0084?w=400'),
('8690000030', 'SL-OUT-030', 'Salomon Outline GTX Kadın Yürüyüş Botu',     4, 7, 1100.00, 'https://images.unsplash.com/photo-1486915309851-b0cc1f8a0084?w=400'),
('8690000031', 'CL-ARC-031', 'Columbia Arcadia II Erkek Yağmurluk',        4, 10, 850.00, 'https://images.unsplash.com/photo-1486915309851-b0cc1f8a0084?w=400'),
('8690000032', 'CL-WHI-032', 'Columbia Whirlibird IV Kayak Montu',         4, 10,1650.00, 'https://images.unsplash.com/photo-1486915309851-b0cc1f8a0084?w=400'),
('8690000033', 'DC-QUA-033', 'Decathlon Quechua Kamp Çantası 50L',         4, 8,  420.00, 'https://images.unsplash.com/photo-1486915309851-b0cc1f8a0084?w=400'),
('8690000034', 'DC-FHL-034', 'Decathlon Forclaz HL100 Kafa Lambası',       4, 8,   85.00, 'https://images.unsplash.com/photo-1486915309851-b0cc1f8a0084?w=400'),
('8690000035', 'SL-POL-035', 'Salomon Nordic Yürüyüş Sopası Seti',         4, 7,  340.00, 'https://images.unsplash.com/photo-1486915309851-b0cc1f8a0084?w=400'),
-- Fitness & Antrenman (kategori 5)
('8690000036', 'UA-ROW-036', 'Under Armour TriBase Reign 5 Antrenman Ay.', 5, 5,  680.00, 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=400'),
('8690000037', 'NK-MET-037', 'Nike Metcon 9 Crossfit Ayakkabısı',           5, 1,  720.00, 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=400'),
('8690000038', 'AD-POW-038', 'Adidas Powerlift 5 Halter Ayakkabısı',        5, 2,  580.00, 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=400'),
('8690000039', 'DC-COR-039', 'Decathlon Corength Kilolu Kettlebell 16kg',   5, 8,  340.00, 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=400'),
('8690000040', 'DC-SKP-040', 'Decathlon Domyos Atlama İpi',                 5, 8,   55.00, 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=400'),
('8690000041', 'UA-PRJ-041', 'Under Armour Project Rock Bel Çantası',       5, 5,  280.00, 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=400'),
('8690000042', 'NB-MIN-042', 'New Balance Minimus TR V1 Antrenman',         5, 4,  490.00, 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=400'),
('8690000043', 'RB-NAN-043', 'Reebok Nano X3 Kadın Antrenman Ayakkabısı',  5, 9,  560.00, 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=400'),
('8690000044', 'DC-RES-044', 'Decathlon Domyos Direnç Bandı Seti',         5, 8,   95.00, 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=400'),
('8690000045', 'PM-STR-045', 'Puma Strong Kadın Fitness Ayakkabısı',        5, 3,  420.00, 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=400'),
('8690000046', 'NK-ZOO-046', 'Nike Zoom SuperRep 4 Next% Aerobik',         5, 1,  660.00, 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=400'),
('8690000047', 'AD-ADZ-047', 'Adidas Adipower 3 Halter Ayakkabısı',        5, 2,  740.00, 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=400'),
('8690000048', 'AS-GEL-048', 'Asics Gel-Quantum 180 7 Erkek',              1, 6,  620.00, 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400'),
('8690000049', 'SL-SPD-049', 'Salomon Speedcross 6 Erkek Patika',          4, 7,  890.00, 'https://images.unsplash.com/photo-1486915309851-b0cc1f8a0084?w=400'),
('8690000050', 'CL-PFT-050', 'Columbia PFG Terminal Tackle Erkek Gömlek',  4, 10, 310.00, 'https://images.unsplash.com/photo-1486915309851-b0cc1f8a0084?w=400');

-- ----------------------------
-- KANAL_URUN (list products on channels)
-- We list all 50 products on all 3 channels, pricing varies by channel
-- ----------------------------
INSERT INTO kanal_urun (kanal_id, urun_id, web_liste_fiyati, web_indirim_fiyati, pazaryeri_liste_fiyat, pazaryeri_indirim_fiyat)
SELECT
    k.kanal_id,
    u.urun_id,
    -- Web list price: cost × 1.7 (includes 35-40% margin + expenses)
    ROUND(u.maliyet * 1.70, 2),
    -- Web discount price: cost × 1.45
    ROUND(u.maliyet * 1.45, 2),
    -- Marketplace list price: cost × 1.85 (extra commission buffer)
    ROUND(u.maliyet * 1.85, 2),
    -- Marketplace discount price: cost × 1.55
    ROUND(u.maliyet * 1.55, 2)
FROM kanallar k, urunler u;

-- ----------------------------
-- FIYATLANDIRMA_KURALLARI
-- ----------------------------
-- Web channel rules per category
INSERT INTO fiyatlandirma_kurallari
  (kanal_id, kategori_id, komisyon_orani, lojistik_gideri, kargo_ucreti,
   max_indirim, min_kar, rekabet_katsayisi, geri_gelinebilecek_yuzde,
   aylik_satis_hedefi, haftalik_satis_hedefi, aktiflik_durumu)
VALUES
  (1, 1, 0.00, 15.00, 0.00,  0.40, 0.15, 0.98, 0.10, 500000, 125000, 1), -- Web / Koşu Ayakkabısı
  (1, 2, 0.00, 12.00, 0.00,  0.45, 0.18, 0.98, 0.10, 300000, 75000,  1), -- Web / Spor Giyim
  (1, 3, 0.00, 18.00, 0.00,  0.35, 0.15, 1.00, 0.08, 200000, 50000,  1), -- Web / Futbol
  (1, 4, 0.00, 20.00, 0.00,  0.35, 0.18, 1.00, 0.08, 150000, 37500,  1), -- Web / Outdoor
  (1, 5, 0.00, 14.00, 0.00,  0.40, 0.15, 0.99, 0.10, 250000, 62500,  1), -- Web / Fitness
  -- Trendyol rules per category
  (2, 1, 0.15, 15.00, 29.90, 0.45, 0.12, 0.97, 0.15, 600000, 150000, 1), -- Trendyol / Koşu
  (2, 2, 0.15, 12.00, 29.90, 0.50, 0.15, 0.97, 0.15, 350000, 87500,  1), -- Trendyol / Giyim
  (2, 3, 0.15, 18.00, 29.90, 0.40, 0.12, 0.98, 0.10, 250000, 62500,  1), -- Trendyol / Futbol
  (2, 4, 0.15, 20.00, 29.90, 0.40, 0.15, 0.99, 0.10, 180000, 45000,  1), -- Trendyol / Outdoor
  (2, 5, 0.15, 14.00, 29.90, 0.45, 0.12, 0.98, 0.12, 280000, 70000,  1), -- Trendyol / Fitness
  -- Amazon TR rules
  (3, 1, 0.18, 15.00, 39.90, 0.40, 0.12, 0.98, 0.12, 400000, 100000, 1), -- Amazon / Koşu
  (3, 2, 0.18, 12.00, 39.90, 0.45, 0.14, 0.98, 0.12, 220000, 55000,  1), -- Amazon / Giyim
  (3, 3, 0.18, 18.00, 39.90, 0.38, 0.12, 1.00, 0.10, 160000, 40000,  1), -- Amazon / Futbol
  (3, 4, 0.18, 20.00, 39.90, 0.38, 0.14, 1.00, 0.10, 120000, 30000,  1), -- Amazon / Outdoor
  (3, 5, 0.18, 14.00, 39.90, 0.40, 0.12, 0.99, 0.10, 180000, 45000,  1); -- Amazon / Fitness

-- ----------------------------
-- STOK
-- (For top 20 products, with various beden combinations)
-- ----------------------------
INSERT INTO stok (urun_id, beden_id, stok_miktari, stok_katsayisi) VALUES
-- Product 1 (Nike Air Max 270)
(1,  7,  5,  1.05), (1,  8, 12, 1.00), (1,  9, 18, 1.00), (1, 10,  3, 1.05), (1, 11,  0, 1.00),
-- Product 2 (Nike React)
(2,  7,  8,  1.00), (2,  8, 15, 1.00), (2,  9,  6, 1.00), (2, 10,  2, 1.05), (2, 11, 20, 0.95),
-- Product 3 (Adidas Ultraboost)
(3,  7, 22,  0.95), (3,  8, 30, 0.95), (3,  9, 18, 1.00), (3, 10,  1, 1.05), (3, 11,  0, 1.00),
-- Product 4 (Adidas Stan Smith)
(4,  8, 45,  0.95), (4,  9, 50, 0.95), (4, 10, 40, 0.95), (4, 11, 38, 0.95), (4, 12, 12, 1.00),
-- Product 5 (Puma Nitro)
(5,  8,  2,  1.05), (5,  9,  5, 1.05), (5, 10,  3, 1.05), (5, 11,  1, 1.05), (5, 12,  0, 1.00),
-- Clothing products (sizes XS-XXL = beden_id 1-6)
(11, 1, 10,  1.00), (11, 2, 25, 1.00), (11, 3, 30, 0.95), (11, 4, 15, 1.00), (11, 5,  3, 1.05),
(12, 1,  5,  1.05), (12, 2, 12, 1.00), (12, 3, 20, 1.00), (12, 4, 18, 1.00), (12, 5,  8, 1.00),
(13, 2, 35,  0.95), (13, 3, 40, 0.95), (13, 4, 28, 0.95), (13, 5,  6, 1.00), (13, 6,  2, 1.05),
(14, 1,  3,  1.05), (14, 2,  8, 1.00), (14, 3, 12, 1.00), (14, 4,  5, 1.05), (14, 5,  1, 1.05),
(15, 2, 18,  1.00), (15, 3, 22, 1.00), (15, 4, 15, 1.00), (15, 5,  4, 1.05), (15, 6,  0, 1.00);

-- ----------------------------
-- RAKIPLER
-- ----------------------------
INSERT INTO rakipler (rakip_adi, rakip_url) VALUES
('SportSepeti',   'https://www.sportsepeti.com'),
('Intersport TR', 'https://www.intersport.com.tr'),
('Decathlon TR',  'https://www.decathlon.com.tr'),
('Korayspor',     'https://www.korayspor.com');

-- ----------------------------
-- RAKIP_FIYATLAR (competitor prices for top products on Trendyol/Web)
-- ----------------------------
INSERT INTO rakip_fiyatlar (urun_id, rakip_id, kanal_id, beden_id, fiyat, veri_kazima_zamani) VALUES
-- Product 1 (Nike Air Max 270) on Web channel
(1, 1, 1, NULL, 1380.00, NOW() - INTERVAL 1 DAY),
(1, 2, 1, NULL, 1420.00, NOW() - INTERVAL 1 DAY),
(1, 3, 1, NULL, 1350.00, NOW() - INTERVAL 2 DAY),
-- Product 1 on Trendyol
(1, 1, 2, NULL, 1290.00, NOW() - INTERVAL 1 DAY),
(1, 2, 2, NULL, 1310.00, NOW() - INTERVAL 1 DAY),
-- Product 3 (Adidas Ultraboost)
(3, 1, 1, NULL, 1250.00, NOW() - INTERVAL 1 DAY),
(3, 2, 1, NULL, 1280.00, NOW() - INTERVAL 2 DAY),
(3, 1, 2, NULL, 1190.00, NOW() - INTERVAL 1 DAY),
-- Product 5 (Puma Nitro) - competitor cheaper, needs alert
(5, 1, 1, NULL,  950.00, NOW() - INTERVAL 1 DAY),  -- competitor is cheaper!
(5, 3, 1, NULL,  920.00, NOW() - INTERVAL 1 DAY),
(5, 1, 2, NULL,  890.00, NOW() - INTERVAL 1 DAY),
-- Product 11 (Nike Tshirt)
(11,1, 1, NULL,  330.00, NOW() - INTERVAL 1 DAY),
(11,2, 1, NULL,  315.00, NOW() - INTERVAL 1 DAY),
(11,4, 2, NULL,  295.00, NOW() - INTERVAL 1 DAY),
-- Product 21 (Adidas Predator krampon)
(21,2, 1, NULL, 1050.00, NOW() - INTERVAL 3 DAY),
(21,3, 1, NULL,  980.00, NOW() - INTERVAL 1 DAY);

-- ----------------------------
-- FIYAT_ONERILERI (some pending, some approved)
-- ----------------------------
INSERT INTO fiyat_onerileri
  (kanal_urun_id, mevcut_fiyat, onerilen_fiyat, neden, durum, onaylayan_kullanici_id, onay_tarihi)
VALUES
(1,  1445.00, 1329.00, 'Rakip fiyat ortalaması 1383 TL. Rekabet katsayısı 0.98 × ortalama = 1355 TL. Stok katsayısı 1.05 (düşük stok). Önerilen: 1329 TL',
 'beklemede', NULL, NULL),
(4,  1326.00, 1191.00, 'Rakip fiyatı %10 altına düştü. Pazar payı riski. Acil fiyat revizyonu önerilir.',
 'beklemede', NULL, NULL),
(8,  1292.00, 1188.00, 'Stok fazlası (30+ adet). Stok katsayısı 0.95 uygulandı. İndirimli fiyat önerisi.',
 'onaylandi', 2, NOW() - INTERVAL 2 DAY),
(11, 561.00,  534.00,  'Rakip ortalaması 543 TL. Rekabet katsayısı 0.98. Min kâr kontrolü: maliyet×1.15=207 TL ✓',
 'onaylandi', 2, NOW() - INTERVAL 1 DAY),
(16, 1037.00, 980.00,  'Haftalık satış hedefinin %40 gerisinde. Agresif indirim önerilir.',
 'reddedildi', 1, NOW() - INTERVAL 3 DAY);

-- ----------------------------
-- FIYAT_GECMISI
-- ----------------------------
INSERT INTO fiyat_gecmisi (kanal_urun_id, eski_fiyat, yeni_fiyat, degistiren_kullanici_id, degisim_nedeni, degisim_tarihi)
VALUES
(8,  1445.00, 1292.00, 2, 'Stok fazlası kampanyası — Selen Günaydin tarafından onaylandı', NOW() - INTERVAL 15 DAY),
(8,  1292.00, 1188.00, 2, 'Sistem önerisi onaylandı: stok katsayısı 0.95', NOW() - INTERVAL 2 DAY),
(11,  612.00,  561.00, 2, 'Rakip fiyat düşüşü — fiyat revize edildi', NOW() - INTERVAL 7 DAY),
(11,  561.00,  534.00, 2, 'Sistem önerisi onaylandı: rekabet katsayısı 0.98', NOW() - INTERVAL 1 DAY);

-- ----------------------------
-- ALERTLER
-- ----------------------------
INSERT INTO alertler (kanal_urun_id, alert_tipi, mesaj, durum, olusturma_tarihi)
VALUES
((SELECT ku.kanal_urun_id FROM kanal_urun ku WHERE ku.urun_id=5 AND ku.kanal_id=1 LIMIT 1),
 'rakip_fiyat_dustu',
 'Rakip fiyatı %12 düştü! SportSepeti: 950 TL vs Bizim Fiyatımız: 1037 TL. Pazar payı riski.',
 'acik', NOW() - INTERVAL 1 DAY),

((SELECT ku.kanal_urun_id FROM kanal_urun ku WHERE ku.urun_id=3 AND ku.kanal_id=2 LIMIT 1),
 'stok_yuksek',
 'Stok miktarı kritik yüksekte (30+ adet). İndirim önerilir.',
 'acik', NOW() - INTERVAL 2 DAY),

((SELECT ku.kanal_urun_id FROM kanal_urun ku WHERE ku.urun_id=1 AND ku.kanal_id=2 LIMIT 1),
 'hedef_sapma',
 'Trendyol aylık satış hedefinin %35 gerisinde. Fiyat stratejisi revize edilmeli.',
 'acik', NOW() - INTERVAL 3 DAY),

((SELECT ku.kanal_urun_id FROM kanal_urun ku WHERE ku.urun_id=14 AND ku.kanal_id=1 LIMIT 1),
 'beden_kirikligi',
 'Beden kırıklığı tespit edildi. Sadece XS ve XL mevcut. İndirim penceresi önerilebilir.',
 'acik', NOW() - INTERVAL 4 DAY),

((SELECT ku.kanal_urun_id FROM kanal_urun ku WHERE ku.urun_id=11 AND ku.kanal_id=1 LIMIT 1),
 'rakip_fiyat_dustu',
 'Rakip fiyatı düşüşü çözümlendi. Fiyat güncellendi.',
 'cozuldu', NOW() - INTERVAL 8 DAY);

-- ----------------------------
-- KAMPANYA_PLANLARI
-- ----------------------------
INSERT INTO kampanya_planlari (kanal_id, sezon_id, kampanya_adi, baslangic_tarihi, bitis_tarihi, hedef_indirim_orani, hedef_karlilik)
VALUES
(2, 3, 'Trendyol Nisan Kampanyası 2026',      '2026-04-15', '2026-04-30', 0.35, 0.12),
(2, 3, 'Trendyol Anneler Günü Kampanyası',    '2026-05-05', '2026-05-12', 0.40, 0.10),
(3, 3, 'Amazon Prime Day Hazırlık',           '2026-07-01', '2026-07-15', 0.30, 0.13),
(1, 1, 'Yaz Sezonu Açılış İndirimi',          '2026-06-01', '2026-06-15', 0.25, 0.18),
(2, 2, 'Trendyol Kış Sezonu Kapanış',        '2026-02-01', '2026-02-28', 0.45, 0.10);

-- ----------------------------
-- SATISLAR (last 30 days sales history)
-- ----------------------------
INSERT INTO satislar (kanal_urun_id, satis_miktari, birim_fiyat, maliyet_snapshot, satis_tarihi)
SELECT
    ku.kanal_urun_id,
    FLOOR(RAND() * 5) + 1                              AS satis_miktari,
    ku.web_indirim_fiyati                               AS birim_fiyat,
    u.maliyet                                           AS maliyet_snapshot,
    NOW() - INTERVAL FLOOR(RAND() * 30) DAY             AS satis_tarihi
FROM kanal_urun ku
JOIN urunler u ON ku.urun_id = u.urun_id
WHERE ku.kanal_id = 1 AND ku.urun_id <= 20
ORDER BY RAND()
LIMIT 60;

INSERT INTO satislar (kanal_urun_id, satis_miktari, birim_fiyat, maliyet_snapshot, satis_tarihi)
SELECT
    ku.kanal_urun_id,
    FLOOR(RAND() * 8) + 1,
    ku.pazaryeri_indirim_fiyat,
    u.maliyet,
    NOW() - INTERVAL FLOOR(RAND() * 30) DAY
FROM kanal_urun ku
JOIN urunler u ON ku.urun_id = u.urun_id
WHERE ku.kanal_id = 2 AND ku.urun_id <= 25
ORDER BY RAND()
LIMIT 80;

INSERT INTO satislar (kanal_urun_id, satis_miktari, birim_fiyat, maliyet_snapshot, satis_tarihi)
SELECT
    ku.kanal_urun_id,
    FLOOR(RAND() * 4) + 1,
    ku.pazaryeri_indirim_fiyat,
    u.maliyet,
    NOW() - INTERVAL FLOOR(RAND() * 30) DAY
FROM kanal_urun ku
JOIN urunler u ON ku.urun_id = u.urun_id
WHERE ku.kanal_id = 3 AND ku.urun_id <= 15
ORDER BY RAND()
LIMIT 40;
