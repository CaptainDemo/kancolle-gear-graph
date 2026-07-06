import { iconUrl } from '../lib/constants';

interface Props {
  iconTypeId: number;
  size?: number;
  className?: string;
}

export function EquipIcon({ iconTypeId, size = 24, className }: Props) {
  return (
    <img
      src={iconUrl(iconTypeId)}
      width={size}
      height={size}
      alt=""
      loading="lazy"
      className={className}
      style={{ imageRendering: 'pixelated' }}
    />
  );
}
