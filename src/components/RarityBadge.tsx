interface Props {
  rarity: number;
  showStars?: boolean;
}

export function RarityBadge({ rarity, showStars = true }: Props) {
  if (!showStars) return null;
  return (
    <span className="equip-rarity" aria-label={`稀有度 ${rarity}`}>
      {Array.from({ length: rarity }).map((_, i) => (
        <span key={i} className="star">
          ★
        </span>
      ))}
    </span>
  );
}
