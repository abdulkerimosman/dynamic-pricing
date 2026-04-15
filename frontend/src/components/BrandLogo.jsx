export default function BrandLogo({ size = 'md', showWordmark = false, className = '' }) {
  const sizes = {
    sm: {
      box: 'w-8 h-8',
      icon: 'w-8 h-8',
      title: 'text-sm',
      subtitle: 'text-[10px]'
    },
    md: {
      box: 'w-14 h-14',
      icon: 'w-14 h-14',
      title: 'text-2xl',
      subtitle: 'text-sm'
    }
  };

  const s = sizes[size] || sizes.md;

  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <div className={`${s.box} flex items-center justify-center`}>
        <img
          src="/sporthink-logo.png"
          alt="Sporthink logo"
          className={`${s.icon} object-contain`}
        />
      </div>

      {showWordmark && (
        <div>
          <p className={`${s.title} font-bold text-gray-900 leading-none`}>Sporthink</p>
          <p className={`${s.subtitle} text-gray-500 mt-1`}>Dinamik Fiyatlama Sistemi</p>
        </div>
      )}
    </div>
  );
}
