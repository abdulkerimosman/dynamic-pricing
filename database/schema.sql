-- =============================================================
-- Sporthink Dynamic Pricing System — Database Schema
-- MySQL 8.0+
-- All table/column names preserved in Turkish (per ER diagram)
-- =============================================================

CREATE DATABASE IF NOT EXISTS sporthink CHARACTER SET utf8mb4 COLLATE utf8mb4_turkish_ci;
USE sporthink;

-- ----------------------------
-- 1. KULLANICILAR (Users)
-- ----------------------------
CREATE TABLE kullanicilar (
    kullanici_id   INT           NOT NULL AUTO_INCREMENT,
    ad_soyad       VARCHAR(100)  NOT NULL,
    eposta         VARCHAR(150)  NOT NULL UNIQUE,
    sifre_hash     VARCHAR(255)  NOT NULL,
    olusturma_tarihi TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (kullanici_id)
);

-- ----------------------------
-- 2. ROLLER (Roles)
-- ----------------------------
CREATE TABLE roller (
    rol_id   INT          NOT NULL AUTO_INCREMENT,
    rol_adi  VARCHAR(50)  NOT NULL UNIQUE,
    aciklama VARCHAR(255),
    PRIMARY KEY (rol_id)
);

-- ----------------------------
-- 3. KULLANICI_ROL (User-Role Junction)
-- ----------------------------
CREATE TABLE kullanici_rol (
    kullanici_rol_id INT NOT NULL AUTO_INCREMENT,
    kullanici_id     INT NOT NULL,
    rol_id           INT NOT NULL,
    PRIMARY KEY (kullanici_rol_id),
    UNIQUE KEY uq_kullanici_rol (kullanici_id, rol_id),
    CONSTRAINT fk_kr_kullanici FOREIGN KEY (kullanici_id) REFERENCES kullanicilar (kullanici_id) ON DELETE CASCADE,
    CONSTRAINT fk_kr_rol       FOREIGN KEY (rol_id)       REFERENCES roller (rol_id)             ON DELETE CASCADE
);

-- ----------------------------
-- 4. KATEGORILER (Categories)
-- ----------------------------
CREATE TABLE kategoriler (
    kategori_id    INT            NOT NULL AUTO_INCREMENT,
    kategori_adi   VARCHAR(100)   NOT NULL,
    kar_beklentisi DECIMAL(5, 4)  NOT NULL COMMENT 'Target margin e.g. 0.3500 = 35%',
    PRIMARY KEY (kategori_id)
);

-- ----------------------------
-- 5. MARKA (Brands)
-- ----------------------------
CREATE TABLE marka (
    marka_id  INT          NOT NULL AUTO_INCREMENT,
    marka_adi VARCHAR(100) NOT NULL,
    PRIMARY KEY (marka_id)
);

-- ----------------------------
-- 6. SEZONLAR (Seasons)
-- ----------------------------
CREATE TABLE sezonlar (
    sezon_id         INT         NOT NULL AUTO_INCREMENT,
    sezon_adi        VARCHAR(50) NOT NULL,
    baslangic_tarihi DATE        NOT NULL,
    bitis_tarihi     DATE        NOT NULL,
    PRIMARY KEY (sezon_id)
);

-- ----------------------------
-- 7. KATEGORI_SEZON (Category-Season Junction)
-- ----------------------------
CREATE TABLE kategori_sezon (
    kategori_sezon_id INT NOT NULL AUTO_INCREMENT,
    kategori_id       INT NOT NULL,
    sezon_id          INT NOT NULL,
    PRIMARY KEY (kategori_sezon_id),
    UNIQUE KEY uq_kat_sezon (kategori_id, sezon_id),
    CONSTRAINT fk_ks_kategori FOREIGN KEY (kategori_id) REFERENCES kategoriler (kategori_id) ON DELETE CASCADE,
    CONSTRAINT fk_ks_sezon    FOREIGN KEY (sezon_id)    REFERENCES sezonlar (sezon_id)        ON DELETE CASCADE
);

-- ----------------------------
-- 8. BEDEN (Sizes)
-- ----------------------------
CREATE TABLE beden (
    beden_id  INT         NOT NULL AUTO_INCREMENT,
    beden_adi VARCHAR(20) NOT NULL UNIQUE,
    PRIMARY KEY (beden_id)
);

-- ----------------------------
-- 9. URUNLER (Products)
-- ----------------------------
CREATE TABLE urunler (
    urun_id          INT            NOT NULL AUTO_INCREMENT,
    barkod           VARCHAR(50)    UNIQUE,
    stok_kodu        VARCHAR(50)    UNIQUE,
    urun_adi         VARCHAR(200)   NOT NULL,
    kategori_id      INT            NOT NULL,
    marka_id         INT            NOT NULL,
    maliyet          DECIMAL(10, 2) NOT NULL COMMENT 'Unit cost in TRY',
    resim_url        VARCHAR(500),
    olusturma_tarihi TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    guncelleme_tarihi TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (urun_id),
    CONSTRAINT fk_urun_kategori FOREIGN KEY (kategori_id) REFERENCES kategoriler (kategori_id),
    CONSTRAINT fk_urun_marka    FOREIGN KEY (marka_id)    REFERENCES marka (marka_id)
);

-- ----------------------------
-- 10. KANALLAR (Sales Channels)
-- ----------------------------
CREATE TABLE kanallar (
    kanal_id         INT          NOT NULL AUTO_INCREMENT,
    kanal_adi        VARCHAR(100) NOT NULL,
    kanal_url        VARCHAR(500),
    kanal_aciklamasi VARCHAR(500),
    kanal_sahibi     TINYINT(1)   NOT NULL DEFAULT 0 COMMENT '1=own website, 0=marketplace',
    olusturma_tarihi TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (kanal_id)
);

-- ----------------------------
-- 11. KANAL_URUN (Channel-Product Listing)
-- ----------------------------
CREATE TABLE kanal_urun (
    kanal_urun_id          INT            NOT NULL AUTO_INCREMENT,
    kanal_id               INT            NOT NULL,
    urun_id                INT            NOT NULL,
    web_liste_fiyati       DECIMAL(10, 2) COMMENT 'Listed price on own website',
    web_indirim_fiyati     DECIMAL(10, 2) COMMENT 'Discounted price on own website',
    pazaryeri_liste_fiyat  DECIMAL(10, 2) COMMENT 'Listed price on marketplace',
    pazaryeri_indirim_fiyat DECIMAL(10, 2) COMMENT 'Discounted price on marketplace',
    PRIMARY KEY (kanal_urun_id),
    UNIQUE KEY uq_kanal_urun (kanal_id, urun_id),
    CONSTRAINT fk_ku_kanal FOREIGN KEY (kanal_id) REFERENCES kanallar (kanal_id) ON DELETE CASCADE,
    CONSTRAINT fk_ku_urun  FOREIGN KEY (urun_id)  REFERENCES urunler (urun_id)   ON DELETE CASCADE
);

-- ----------------------------
-- 12. FIYATLANDIRMA_KURALLARI (Pricing Rules)
-- ----------------------------
CREATE TABLE fiyatlandirma_kurallari (
    kural_id                 INT            NOT NULL AUTO_INCREMENT,
    kanal_id                 INT            NOT NULL,
    kategori_id              INT            NOT NULL,
    komisyon_orani           DECIMAL(5, 4)  NOT NULL COMMENT 'e.g. 0.15 = 15% commission',
    lojistik_gideri          DECIMAL(10, 2) NOT NULL DEFAULT 0 COMMENT 'Fixed logistics cost TRY',
    kargo_ucreti             DECIMAL(10, 2) NOT NULL DEFAULT 0 COMMENT 'Shipping cost TRY',
    max_indirim              DECIMAL(5, 4)  NOT NULL COMMENT 'Max discount ratio e.g. 0.40 = 40%',
    min_kar                  DECIMAL(5, 4)  NOT NULL COMMENT 'Min profit margin ratio e.g. 0.10 = 10%',
    rekabet_katsayisi        DECIMAL(5, 4)  NOT NULL DEFAULT 1.0000 COMMENT '0.98=2% below competitor',
    geri_gelinebilecek_yuzde DECIMAL(5, 4)  COMMENT 'Rollback percentage option',
    aylik_satis_hedefi       DECIMAL(15, 2) COMMENT 'Monthly revenue target TRY',
    haftalik_satis_hedefi    DECIMAL(15, 2) COMMENT 'Weekly revenue target TRY',
    aktiflik_durumu          TINYINT(1)     NOT NULL DEFAULT 1,
    gecerlilik_baslangic     TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    gecerlilik_bitis         TIMESTAMP      NULL,
    PRIMARY KEY (kural_id),
    CONSTRAINT fk_fk_kanal    FOREIGN KEY (kanal_id)    REFERENCES kanallar    (kanal_id)    ON DELETE CASCADE,
    CONSTRAINT fk_fk_kategori FOREIGN KEY (kategori_id) REFERENCES kategoriler (kategori_id) ON DELETE CASCADE
);

-- ----------------------------
-- 13. STOK (Inventory)
-- ----------------------------
CREATE TABLE stok (
    stok_id           INT            NOT NULL AUTO_INCREMENT,
    urun_id           INT            NOT NULL,
    beden_id          INT            NOT NULL,
    stok_miktari      INT            NOT NULL DEFAULT 0,
    stok_katsayisi    DECIMAL(5, 4)  NOT NULL DEFAULT 1.0000 COMMENT 'Computed coefficient based on stock level',
    guncelleme_tarihi TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (stok_id),
    UNIQUE KEY uq_stok_urun_beden (urun_id, beden_id),
    CONSTRAINT fk_stok_urun  FOREIGN KEY (urun_id)  REFERENCES urunler (urun_id) ON DELETE CASCADE,
    CONSTRAINT fk_stok_beden FOREIGN KEY (beden_id) REFERENCES beden   (beden_id)
);

-- ----------------------------
-- 14. RAKIPLER (Competitors)
-- ----------------------------
CREATE TABLE rakipler (
    rakip_id  INT          NOT NULL AUTO_INCREMENT,
    rakip_adi VARCHAR(100) NOT NULL,
    rakip_url VARCHAR(500),
    PRIMARY KEY (rakip_id)
);

-- ----------------------------
-- 15. RAKIP_FIYATLAR (Competitor Prices)
-- ----------------------------
CREATE TABLE rakip_fiyatlar (
    rakip_fiyat_id    INT            NOT NULL AUTO_INCREMENT,
    urun_id           INT            NOT NULL,
    rakip_id          INT            NOT NULL,
    kanal_id          INT            NOT NULL,
    beden_id          INT,
    fiyat             DECIMAL(10, 2) NOT NULL,
    veri_kazima_zamani TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (rakip_fiyat_id),
    CONSTRAINT fk_rf_urun  FOREIGN KEY (urun_id)  REFERENCES urunler  (urun_id)  ON DELETE CASCADE,
    CONSTRAINT fk_rf_rakip FOREIGN KEY (rakip_id) REFERENCES rakipler (rakip_id) ON DELETE CASCADE,
    CONSTRAINT fk_rf_kanal FOREIGN KEY (kanal_id) REFERENCES kanallar (kanal_id) ON DELETE CASCADE,
    CONSTRAINT fk_rf_beden FOREIGN KEY (beden_id) REFERENCES beden    (beden_id)
);

-- ----------------------------
-- 16. FIYAT_ONERILERI (Price Suggestions)
-- ----------------------------
CREATE TABLE fiyat_onerileri (
    oneri_id              INT            NOT NULL AUTO_INCREMENT,
    kanal_urun_id         INT            NOT NULL,
    mevcut_fiyat          DECIMAL(10, 2) NOT NULL,
    onerilen_fiyat        DECIMAL(10, 2) NOT NULL,
    neden                 TEXT           COMMENT 'Explanation of why this price was suggested',
    durum                 ENUM('beklemede','onaylandi','reddedildi') NOT NULL DEFAULT 'beklemede',
    onaylayan_kullanici_id INT,
    onay_tarihi           TIMESTAMP      NULL,
    olusturma_tarihi      TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (oneri_id),
    CONSTRAINT fk_fo_kanal_urun FOREIGN KEY (kanal_urun_id) REFERENCES kanal_urun  (kanal_urun_id) ON DELETE CASCADE,
    CONSTRAINT fk_fo_kullanici  FOREIGN KEY (onaylayan_kullanici_id) REFERENCES kullanicilar (kullanici_id)
);

-- ----------------------------
-- 17. FIYAT_GECMISI (Price History)
-- ----------------------------
CREATE TABLE fiyat_gecmisi (
    gecmis_id              INT            NOT NULL AUTO_INCREMENT,
    kanal_urun_id          INT            NOT NULL,
    eski_fiyat             DECIMAL(10, 2) NOT NULL,
    yeni_fiyat             DECIMAL(10, 2) NOT NULL,
    degistiren_kullanici_id INT,
    degisim_nedeni         VARCHAR(500),
    degisim_tarihi         TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (gecmis_id),
    CONSTRAINT fk_fg_kanal_urun FOREIGN KEY (kanal_urun_id) REFERENCES kanal_urun  (kanal_urun_id) ON DELETE CASCADE,
    CONSTRAINT fk_fg_kullanici  FOREIGN KEY (degistiren_kullanici_id) REFERENCES kullanicilar (kullanici_id)
);

-- ----------------------------
-- 18. ALERTLER (Alerts)
-- ----------------------------
CREATE TABLE alertler (
    alert_id          INT         NOT NULL AUTO_INCREMENT,
    kanal_urun_id     INT         NOT NULL,
    alert_tipi        VARCHAR(100) NOT NULL COMMENT 'e.g. rakip_fiyat_dustu, stok_kritik, karlilik_ihlali',
    mesaj             TEXT        NOT NULL,
    durum             ENUM('acik','cozuldu') NOT NULL DEFAULT 'acik',
    olusturma_tarihi  TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    cozulme_tarihi    TIMESTAMP   NULL,
    cozen_kullanici_id INT,
    PRIMARY KEY (alert_id),
    CONSTRAINT fk_al_kanal_urun FOREIGN KEY (kanal_urun_id)     REFERENCES kanal_urun  (kanal_urun_id) ON DELETE CASCADE,
    CONSTRAINT fk_al_kullanici  FOREIGN KEY (cozen_kullanici_id) REFERENCES kullanicilar (kullanici_id)
);

-- ----------------------------
-- 19. KAMPANYA_PLANLARI (Campaign Plans)
-- ----------------------------
CREATE TABLE kampanya_planlari (
    kampanya_id          INT            NOT NULL AUTO_INCREMENT,
    kanal_id             INT            NOT NULL,
    sezon_id             INT,
    kampanya_adi         VARCHAR(200)   NOT NULL,
    baslangic_tarihi     DATE           NOT NULL,
    bitis_tarihi         DATE           NOT NULL,
    hedef_indirim_orani  DECIMAL(5, 4)  NOT NULL COMMENT 'Target discount e.g. 0.30 = 30%',
    hedef_karlilik       DECIMAL(5, 4)  NOT NULL COMMENT 'Target profitability ratio',
    PRIMARY KEY (kampanya_id),
    CONSTRAINT fk_kp_kanal FOREIGN KEY (kanal_id) REFERENCES kanallar (kanal_id) ON DELETE CASCADE,
    CONSTRAINT fk_kp_sezon FOREIGN KEY (sezon_id) REFERENCES sezonlar (sezon_id)
);

-- ----------------------------
-- 20. SATISLAR (Sales)
-- ----------------------------
CREATE TABLE satislar (
    satis_id          INT            NOT NULL AUTO_INCREMENT,
    kanal_urun_id     INT            NOT NULL,
    satis_miktari     INT            NOT NULL DEFAULT 1,
    birim_fiyat       DECIMAL(10, 2) NOT NULL,
    maliyet_snapshot  DECIMAL(10, 2) NOT NULL COMMENT 'Cost at time of sale',
    satis_tarihi      TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (satis_id),
    CONSTRAINT fk_s_kanal_urun FOREIGN KEY (kanal_urun_id) REFERENCES kanal_urun (kanal_urun_id) ON DELETE CASCADE
);

-- ----------------------------
-- 21. ISLEM_LOG (Audit Log)
-- ----------------------------
CREATE TABLE islem_log (
    islem_log_id  INT          NOT NULL AUTO_INCREMENT,
    kullanici_id  INT,
    islem_tipi    VARCHAR(50)  NOT NULL COMMENT 'e.g. PRICE_APPROVED, IMPORT, LOGIN',
    tablo_adi     VARCHAR(100),
    kayit_id      VARCHAR(50),
    aciklama      TEXT,
    ip_adresi     VARCHAR(45),
    islem_tarihi  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (islem_log_id),
    CONSTRAINT fk_il_kullanici FOREIGN KEY (kullanici_id) REFERENCES kullanicilar (kullanici_id) ON DELETE SET NULL
);

-- ----------------------------
-- 22. HATA_LOG (Error Log)
-- ----------------------------
CREATE TABLE hata_log (
    hata_log_id  INT          NOT NULL AUTO_INCREMENT,
    hata_tipi    VARCHAR(100) NOT NULL,
    hata_mesaji  TEXT         NOT NULL,
    yigin_izi    TEXT,
    endpoint     VARCHAR(500),
    hata_tarihi  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (hata_log_id)
);
