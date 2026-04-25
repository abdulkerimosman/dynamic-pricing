'use strict';
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

const { Sequelize, DataTypes } = require('sequelize');

const sequelize = new Sequelize(
  process.env.DB_NAME     || 'sporthink',
  process.env.DB_USER     || 'root',
  process.env.DB_PASSWORD || '',
  {
    host:    process.env.DB_HOST || 'localhost',
    port:    parseInt(process.env.DB_PORT || '3306'),
    dialect: 'mysql',
    logging: false,
    pool:    { max: 10, min: 0, acquire: 30000, idle: 10000 },
  }
);

// ════════════════════════════════════════════════════════════
// MODEL DEFINITIONS
// ════════════════════════════════════════════════════════════

const Kullanici = sequelize.define('Kullanici', {
  kullanici_id:     { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  ad_soyad:         { type: DataTypes.STRING(100), allowNull: false },
  eposta:           { type: DataTypes.STRING(150), allowNull: false, unique: true },
  sifre_hash:       { type: DataTypes.STRING(255), allowNull: false },
  olusturma_tarihi: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
}, { tableName: 'kullanicilar', timestamps: false });

const Rol = sequelize.define('Rol', {
  rol_id:   { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  rol_adi:  { type: DataTypes.STRING(50), allowNull: false, unique: true },
  aciklama: { type: DataTypes.STRING(255) },
}, { tableName: 'roller', timestamps: false });

const KullaniciRol = sequelize.define('KullaniciRol', {
  kullanici_rol_id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  kullanici_id:     { type: DataTypes.INTEGER, allowNull: false },
  rol_id:           { type: DataTypes.INTEGER, allowNull: false },
}, { tableName: 'kullanici_rol', timestamps: false });

const Kategori = sequelize.define('Kategori', {
  kategori_id:    { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  kategori_adi:   { type: DataTypes.STRING(100), allowNull: false },
  kar_beklentisi: { type: DataTypes.DECIMAL(5, 4), allowNull: false },
}, { tableName: 'kategoriler', timestamps: false });

const Marka = sequelize.define('Marka', {
  marka_id:  { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  marka_adi: { type: DataTypes.STRING(100), allowNull: false },
}, { tableName: 'marka', timestamps: false });

const Sezon = sequelize.define('Sezon', {
  sezon_id:         { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  sezon_adi:        { type: DataTypes.STRING(50), allowNull: false },
  baslangic_tarihi: { type: DataTypes.DATEONLY, allowNull: false },
  bitis_tarihi:     { type: DataTypes.DATEONLY, allowNull: false },
}, { tableName: 'sezonlar', timestamps: false });

const KategoriSezon = sequelize.define('KategoriSezon', {
  kategori_sezon_id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  kategori_id:       { type: DataTypes.INTEGER, allowNull: false },
  sezon_id:          { type: DataTypes.INTEGER, allowNull: false },
}, { tableName: 'kategori_sezon', timestamps: false });

const Beden = sequelize.define('Beden', {
  beden_id:  { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  beden_adi: { type: DataTypes.STRING(20), allowNull: false, unique: true },
}, { tableName: 'beden', timestamps: false });

const Cinsiyet = sequelize.define('Cinsiyet', {
  cinsiyet_id:  { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  cinsiyet_adi: { type: DataTypes.STRING(30), allowNull: false, unique: true },
}, { tableName: 'cinsiyetler', timestamps: false });

const UrunCinsiyet = sequelize.define('UrunCinsiyet', {
  urun_cinsiyet_id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  urun_id:          { type: DataTypes.INTEGER, allowNull: false },
  cinsiyet_id:      { type: DataTypes.INTEGER, allowNull: false },
}, { tableName: 'urun_cinsiyet', timestamps: false });

const Urun = sequelize.define('Urun', {
  urun_id:           { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  barkod:            { type: DataTypes.STRING(50), unique: true },
  stok_kodu:         { type: DataTypes.STRING(50), unique: true },
  urun_adi:          { type: DataTypes.STRING(200), allowNull: false },
  kategori_id:       { type: DataTypes.INTEGER, allowNull: false },
  marka_id:          { type: DataTypes.INTEGER, allowNull: false },
  maliyet:           { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  resim_url:         { type: DataTypes.STRING(500) },
  olusturma_tarihi:  { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  guncelleme_tarihi: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
}, { tableName: 'urunler', timestamps: false });

const Kanal = sequelize.define('Kanal', {
  kanal_id:         { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  kanal_adi:        { type: DataTypes.STRING(100), allowNull: false },
  kanal_url:        { type: DataTypes.STRING(500) },
  kanal_aciklamasi: { type: DataTypes.STRING(500) },
  kanal_sahibi:     { type: DataTypes.BOOLEAN, defaultValue: false },
  olusturma_tarihi: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
}, { tableName: 'kanallar', timestamps: false });

const KanalUrun = sequelize.define('KanalUrun', {
  kanal_urun_id:           { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  kanal_id:                { type: DataTypes.INTEGER, allowNull: false },
  urun_id:                 { type: DataTypes.INTEGER, allowNull: false },
  web_liste_fiyati:        { type: DataTypes.DECIMAL(10, 2) },
  web_indirim_fiyati:      { type: DataTypes.DECIMAL(10, 2) },
  pazaryeri_liste_fiyat:   { type: DataTypes.DECIMAL(10, 2) },
  pazaryeri_indirim_fiyat: { type: DataTypes.DECIMAL(10, 2) },
}, { tableName: 'kanal_urun', timestamps: false });

const FiyatlandirmaKurali = sequelize.define('FiyatlandirmaKurali', {
  kural_id:                 { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  kanal_id:                 { type: DataTypes.INTEGER, allowNull: false },
  kategori_id:              { type: DataTypes.INTEGER, allowNull: false },
  max_indirim:              { type: DataTypes.DECIMAL(5, 4), allowNull: false },
  min_kar:                  { type: DataTypes.DECIMAL(5, 4), allowNull: false },
  rekabet_katsayisi:        { type: DataTypes.DECIMAL(5, 4), defaultValue: 1.0 },
  geri_gelinebilecek_yuzde:{ type: DataTypes.DECIMAL(5, 4) },
  aylik_satis_hedefi:       { type: DataTypes.DECIMAL(15, 2) },
  haftalik_satis_hedefi:    { type: DataTypes.DECIMAL(15, 2) },
  aktiflik_durumu:          { type: DataTypes.BOOLEAN, defaultValue: true },
  gecerlilik_baslangic:     { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  gecerlilik_bitis:         { type: DataTypes.DATE },
}, { tableName: 'fiyatlandirma_kurallari', timestamps: false });

const Stok = sequelize.define('Stok', {
  stok_id:           { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  urun_id:           { type: DataTypes.INTEGER, allowNull: false },
  beden_id:          { type: DataTypes.INTEGER, allowNull: false },
  stok_miktari:      { type: DataTypes.INTEGER, defaultValue: 0 },
  stok_katsayisi:    { type: DataTypes.DECIMAL(5, 4), defaultValue: 1.0 },
  guncelleme_tarihi: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
}, { tableName: 'stok', timestamps: false });

const Rakip = sequelize.define('Rakip', {
  rakip_id:  { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  rakip_adi: { type: DataTypes.STRING(100), allowNull: false },
  rakip_url: { type: DataTypes.STRING(500) },
}, { tableName: 'rakipler', timestamps: false });

const RakipFiyat = sequelize.define('RakipFiyat', {
  rakip_fiyat_id:    { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  urun_id:           { type: DataTypes.INTEGER, allowNull: false },
  rakip_id:          { type: DataTypes.INTEGER, allowNull: false },
  kanal_id:          { type: DataTypes.INTEGER, allowNull: false },
  beden_id:          { type: DataTypes.INTEGER },
  fiyat:             { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  veri_kazima_zamani:{ type: DataTypes.DATE, defaultValue: DataTypes.NOW },
}, { tableName: 'rakip_fiyatlar', timestamps: false });

const FiyatOnerisi = sequelize.define('FiyatOnerisi', {
  oneri_id:               { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  kanal_urun_id:          { type: DataTypes.INTEGER, allowNull: false },
  mevcut_fiyat:           { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  onerilen_fiyat:         { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  neden:                  { type: DataTypes.TEXT },
  durum:                  { type: DataTypes.ENUM('beklemede', 'onaylandi', 'reddedildi'), defaultValue: 'beklemede' },
  onaylayan_kullanici_id: { type: DataTypes.INTEGER },
  onay_tarihi:            { type: DataTypes.DATE },
  olusturma_tarihi:       { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
}, { tableName: 'fiyat_onerileri', timestamps: false });

const FiyatGecmisi = sequelize.define('FiyatGecmisi', {
  gecmis_id:               { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  kanal_urun_id:           { type: DataTypes.INTEGER, allowNull: false },
  eski_fiyat:              { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  yeni_fiyat:              { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  degistiren_kullanici_id: { type: DataTypes.INTEGER },
  degisim_nedeni:          { type: DataTypes.STRING(500) },
  degisim_tarihi:          { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
}, { tableName: 'fiyat_gecmisi', timestamps: false });

const Alert = sequelize.define('Alert', {
  alert_id:          { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  kanal_urun_id:     { type: DataTypes.INTEGER, allowNull: false },
  alert_tipi:        { type: DataTypes.STRING(100), allowNull: false },
  mesaj:             { type: DataTypes.TEXT, allowNull: false },
  durum:             { type: DataTypes.ENUM('acik', 'cozuldu'), defaultValue: 'acik' },
  olusturma_tarihi:  { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  cozulme_tarihi:    { type: DataTypes.DATE },
  cozen_kullanici_id:{ type: DataTypes.INTEGER },
}, { tableName: 'alertler', timestamps: false });

const KampanyaPlan = sequelize.define('KampanyaPlan', {
  kampanya_id:        { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  kanal_id:           { type: DataTypes.INTEGER, allowNull: false },
  sezon_id:           { type: DataTypes.INTEGER },
  kampanya_adi:       { type: DataTypes.STRING(200), allowNull: false },
  baslangic_tarihi:   { type: DataTypes.DATEONLY, allowNull: false },
  bitis_tarihi:       { type: DataTypes.DATEONLY, allowNull: false },
  hedef_indirim_orani:{ type: DataTypes.DECIMAL(5, 4), allowNull: false },
  hedef_karlilik:     { type: DataTypes.DECIMAL(5, 4), allowNull: false },
}, { tableName: 'kampanya_planlari', timestamps: false });

const Satis = sequelize.define('Satis', {
  satis_id:         { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  kanal_urun_id:    { type: DataTypes.INTEGER, allowNull: false },
  satis_miktari:    { type: DataTypes.INTEGER, defaultValue: 1 },
  birim_fiyat:      { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  maliyet_snapshot: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  satis_tarihi:     { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
}, { tableName: 'satislar', timestamps: false });

const IslemLog = sequelize.define('IslemLog', {
  islem_log_id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  kullanici_id: { type: DataTypes.INTEGER },
  islem_tipi:   { type: DataTypes.STRING(50), allowNull: false },
  tablo_adi:    { type: DataTypes.STRING(100) },
  kayit_id:     { type: DataTypes.STRING(50) },
  aciklama:     { type: DataTypes.TEXT },
  ip_adresi:    { type: DataTypes.STRING(45) },
  islem_tarihi: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
}, { tableName: 'islem_log', timestamps: false });

const HataLog = sequelize.define('HataLog', {
  hata_log_id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  hata_tipi:   { type: DataTypes.STRING(100), allowNull: false },
  hata_mesaji: { type: DataTypes.TEXT, allowNull: false },
  yigin_izi:   { type: DataTypes.TEXT },
  endpoint:    { type: DataTypes.STRING(500) },
  hata_tarihi: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
}, { tableName: 'hata_log', timestamps: false });

// ════════════════════════════════════════════════════════════
// ASSOCIATIONS
// ════════════════════════════════════════════════════════════

// Users ↔ Roles
Kullanici.belongsToMany(Rol, { through: KullaniciRol, foreignKey: 'kullanici_id' });
Rol.belongsToMany(Kullanici, { through: KullaniciRol, foreignKey: 'rol_id' });

// Products
Urun.belongsTo(Kategori, { foreignKey: 'kategori_id' });
Urun.belongsTo(Marka,    { foreignKey: 'marka_id' });
Kategori.hasMany(Urun,   { foreignKey: 'kategori_id' });
Marka.hasMany(Urun,      { foreignKey: 'marka_id' });

// Categories ↔ Seasons
Kategori.belongsToMany(Sezon, { through: KategoriSezon, foreignKey: 'kategori_id' });
Sezon.belongsToMany(Kategori, { through: KategoriSezon, foreignKey: 'sezon_id' });

// Products ↔ Genders
Urun.belongsToMany(Cinsiyet, { through: UrunCinsiyet, foreignKey: 'urun_id' });
Cinsiyet.belongsToMany(Urun, { through: UrunCinsiyet, foreignKey: 'cinsiyet_id' });

// Channel ↔ Product
Kanal.hasMany(KanalUrun,    { foreignKey: 'kanal_id' });
Urun.hasMany(KanalUrun,     { foreignKey: 'urun_id' });
KanalUrun.belongsTo(Kanal,  { foreignKey: 'kanal_id' });
KanalUrun.belongsTo(Urun,   { foreignKey: 'urun_id' });

// Pricing Rules
Kanal.hasMany(FiyatlandirmaKurali,        { foreignKey: 'kanal_id' });
Kategori.hasMany(FiyatlandirmaKurali,     { foreignKey: 'kategori_id' });
FiyatlandirmaKurali.belongsTo(Kanal,     { foreignKey: 'kanal_id' });
FiyatlandirmaKurali.belongsTo(Kategori,  { foreignKey: 'kategori_id' });

// Stock
Urun.hasMany(Stok,   { foreignKey: 'urun_id' });
Beden.hasMany(Stok,  { foreignKey: 'beden_id' });
Stok.belongsTo(Urun,  { foreignKey: 'urun_id' });
Stok.belongsTo(Beden, { foreignKey: 'beden_id' });

// Competitor Prices
Urun.hasMany(RakipFiyat,    { foreignKey: 'urun_id' });
Rakip.hasMany(RakipFiyat,   { foreignKey: 'rakip_id' });
Kanal.hasMany(RakipFiyat,   { foreignKey: 'kanal_id' });
RakipFiyat.belongsTo(Urun,  { foreignKey: 'urun_id' });
RakipFiyat.belongsTo(Rakip, { foreignKey: 'rakip_id' });
RakipFiyat.belongsTo(Kanal, { foreignKey: 'kanal_id' });
RakipFiyat.belongsTo(Beden, { foreignKey: 'beden_id' });

// Price Suggestions
KanalUrun.hasMany(FiyatOnerisi,   { foreignKey: 'kanal_urun_id' });
FiyatOnerisi.belongsTo(KanalUrun, { foreignKey: 'kanal_urun_id' });
FiyatOnerisi.belongsTo(Kullanici, { foreignKey: 'onaylayan_kullanici_id', as: 'OnaylayanKullanici' });

// Price History
KanalUrun.hasMany(FiyatGecmisi,    { foreignKey: 'kanal_urun_id' });
FiyatGecmisi.belongsTo(KanalUrun,  { foreignKey: 'kanal_urun_id' });
FiyatGecmisi.belongsTo(Kullanici,  { foreignKey: 'degistiren_kullanici_id', as: 'DegistirenKullanici' });

// Alerts
KanalUrun.hasMany(Alert,   { foreignKey: 'kanal_urun_id' });
Alert.belongsTo(KanalUrun, { foreignKey: 'kanal_urun_id' });
Alert.belongsTo(Kullanici, { foreignKey: 'cozen_kullanici_id', as: 'CozenKullanici' });

// Campaigns
Kanal.hasMany(KampanyaPlan,    { foreignKey: 'kanal_id' });
Sezon.hasMany(KampanyaPlan,    { foreignKey: 'sezon_id' });
KampanyaPlan.belongsTo(Kanal,  { foreignKey: 'kanal_id' });
KampanyaPlan.belongsTo(Sezon,  { foreignKey: 'sezon_id' });

// Sales
KanalUrun.hasMany(Satis,  { foreignKey: 'kanal_urun_id' });
Satis.belongsTo(KanalUrun,{ foreignKey: 'kanal_urun_id' });

// Audit Log
Kullanici.hasMany(IslemLog,  { foreignKey: 'kullanici_id' });
IslemLog.belongsTo(Kullanici,{ foreignKey: 'kullanici_id' });

// ════════════════════════════════════════════════════════════
// EXPORTS
// ════════════════════════════════════════════════════════════
module.exports = {
  sequelize, Sequelize,
  Kullanici, Rol, KullaniciRol,
  Kategori, Marka, Sezon, KategoriSezon, Beden, Cinsiyet, UrunCinsiyet,
  Urun, Kanal, KanalUrun,
  FiyatlandirmaKurali, Stok,
  Rakip, RakipFiyat,
  FiyatOnerisi, FiyatGecmisi,
  Alert, KampanyaPlan, Satis,
  IslemLog, HataLog,
};
