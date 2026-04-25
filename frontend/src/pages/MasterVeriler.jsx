import ReferenceDataManager from '../components/ReferenceDataManager';

export default function MasterVeriler() {
  return (
    <div className="page-shell max-w-[1400px]">
      <div>
        <h1 className="page-title">Master Veri Yonetimi</h1>
        <p className="page-subtitle">Nadiren guncellenen referans tablolarini buradan yonetin</p>
      </div>

      <div className="panel min-h-[500px] shadow-none">
        <ReferenceDataManager />
      </div>
    </div>
  );
}