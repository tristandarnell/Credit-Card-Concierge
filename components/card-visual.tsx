import Image, { type StaticImageData } from "next/image";
import chaseSapphirePreferredImage from "@/public/cards/chase-sapphire-preferred.png";
import amexGoldImage from "@/public/cards/amex-gold.png";
import ventureXImage from "@/public/cards/capital-one-venture-x.jpeg";

type CardImageMeta = {
  src: StaticImageData;
};

const cardImageMap: Record<string, CardImageMeta> = {
  "chase sapphire preferred": {
    src: chaseSapphirePreferredImage
  },
  "american express gold": {
    src: amexGoldImage
  },
  "amex gold": {
    src: amexGoldImage
  },
  "capital one venture x": {
    src: ventureXImage
  }
};

function normalizeCardName(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function resolveCardImage(name: string): CardImageMeta | null {
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
  const imageMeta = resolveCardImage(name);
  if (!imageMeta) return null;

  return (
    <div className="card-visual-wrap">
      <Image
        src={imageMeta.src}
        alt={name}
        className="card-visual-img"
        sizes="(max-width: 760px) 100vw, (max-width: 1200px) 50vw, 33vw"
        fill
      />
    </div>
  );
}
