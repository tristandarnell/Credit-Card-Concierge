const cardImageMap: Record<string, string> = {
  "chase sapphire preferred": "/cards/Chase Sapphire Preferred.png",
  "american express gold": "/cards/Amex Gold Image.avif",
  "amex gold": "/cards/Amex Gold Image.avif",
  "capital one venture x": "/cards/capitaloneventurex.jpeg",
};

function normalizeCardName(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function resolveCardImage(name: string): string | null {
  const normalized = normalizeCardName(name);
  const exact = cardImageMap[normalized];
  if (exact) {
    return exact;
  }

  if (normalized.includes("sapphire preferred")) {
    return cardImageMap["chase sapphire preferred"];
  }
  if (normalized.includes("gold") && (normalized.includes("american express") || normalized.includes("amex"))) {
    return cardImageMap["amex gold"];
  }
  if (normalized.includes("venture x")) {
    return cardImageMap["capital one venture x"];
  }

  return null;
}

export function CardVisual({ name }: { name: string }) {
  const src = resolveCardImage(name);
  if (!src) return null;

  return (
    <div className="card-visual-wrap">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={name} style={{ display: "block", width: "100%", height: "auto" }} />
    </div>
  );
}
