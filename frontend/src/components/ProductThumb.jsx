const FALLBACK_IMAGE =
  'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22120%22 height=%22120%22 viewBox=%220 0 120 120%22%3E%3Crect width=%22120%22 height=%22120%22 rx=%2212%22 fill=%22%23E5E7EB%22/%3E%3Ctext x=%2260%22 y=%2264%22 text-anchor=%22middle%22 font-family=%22Arial,sans-serif%22 font-size=%2220%22 fill=%22%239CA3AF%22%3EIMG%3C/text%3E%3C/svg%3E';

export default function ProductThumb({ src, alt = 'Urun', className = '', wrapperClassName = '' }) {
  return (
    <div className={wrapperClassName}>
      <img
        src={src || FALLBACK_IMAGE}
        alt={alt}
        className={className}
        onError={(e) => {
          e.currentTarget.onerror = null;
          e.currentTarget.src = FALLBACK_IMAGE;
        }}
      />
    </div>
  );
}
