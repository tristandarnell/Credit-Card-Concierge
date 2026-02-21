const cardImageMap: Record<string, string> = {
  "Chase Sapphire Preferred": "/cards/Chase Sapphire Preferred.png",
  "American Express Gold": "/cards/Amex Gold Image.avif",
  "Capital One Venture X": "/cards/capitaloneventurex.jpeg",
  "Citi Double Cash": "",
  "Chase Freedom Unlimited": "",
  "Amex Blue Cash Preferred": "",
};

export function CardVisual({ name }: { name: string }) {
  const src = cardImageMap[name];
  if (!src) return null;

  return (
    <div className="card-visual-wrap">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={name} style={{ display: "block", width: "100%", height: "auto" }} />
    </div>
  );
}
