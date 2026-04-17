import { ChevronDown } from 'lucide-react';

export default function FilterSelect({
  label,
  value,
  onChange,
  children,
  disabled = false,
  className = '',
  selectClassName = '',
  iconClassName = '',
  iconSize = 20,
  name,
  id,
}) {
  return (
    <div className={`filter-field ${className}`.trim()}>
      {label ? <label className="filter-label">{label}</label> : null}
      <div className="filter-select-wrap">
        <select
          id={id}
          name={name}
          value={value}
          onChange={onChange}
          disabled={disabled}
          className={`filter-select ${selectClassName}`.trim()}
        >
          {children}
        </select>
        <ChevronDown size={iconSize} className={`filter-select-icon ${iconClassName}`.trim()} />
      </div>
    </div>
  );
}
