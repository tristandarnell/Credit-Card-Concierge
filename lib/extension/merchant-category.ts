import type { StandardCategory } from "@/lib/rewards/categories";

const CATEGORY_PATTERNS: Array<{ category: StandardCategory; patterns: RegExp[] }> = [
  {
    category: "groceries",
    patterns: [
      /\b(grocery|groceries|supermarket|whole foods|trader joe'?s|kroger|safeway|aldi|publix)\b/i
    ]
  },
  {
    category: "gas",
    patterns: [/\b(gas|fuel|shell|chevron|exxon|mobil|bp|sunoco)\b/i]
  },
  {
    category: "dining",
    patterns: [/\b(dining|restaurant|restaurants|food|doordash|ubereats|grubhub|cafe|coffee)\b/i]
  },
  {
    category: "online_retail",
    patterns: [/\b(amazon|walmart|target|best buy|etsy|shop|online retail|ecommerce)\b/i]
  },
  {
    category: "hotels",
    patterns: [/\b(hotel|hilton|marriott|hyatt|ihg|wyndham|booking.com|expedia)\b/i]
  },
  {
    category: "airfare",
    patterns: [/\b(airline|flight|united|delta|southwest|jetblue|american airlines|alaska)\b/i]
  },
  {
    category: "travel",
    patterns: [/\b(travel|trip|vacation|airbnb|vrbo|rental car|lyft|uber trip)\b/i]
  },
  {
    category: "streaming",
    patterns: [/\b(streaming|netflix|hulu|disney\+|spotify|youtube premium|max)\b/i]
  },
  {
    category: "drugstores",
    patterns: [/\b(drugstore|pharmacy|walgreens|cvs|rite aid)\b/i]
  },
  {
    category: "phone",
    patterns: [/\b(phone|wireless|cell|mobile|t-mobile|verizon|at&t)\b/i]
  },
  {
    category: "utilities",
    patterns: [/\b(utility|utilities|electric|water|internet|power bill)\b/i]
  },
  {
    category: "office_supply",
    patterns: [/\b(office supply|staples|office depot)\b/i]
  },
  {
    category: "entertainment",
    patterns: [/\b(entertainment|movie|cinema|concert|ticketmaster)\b/i]
  },
  {
    category: "transit",
    patterns: [/\b(transit|subway|metro|train|bus|rideshare|toll)\b/i]
  }
];

function normalizeToCategory(input: unknown): StandardCategory | null {
  if (typeof input !== "string") {
    return null;
  }

  const value = input.trim().toLowerCase();
  const allowed = new Set<StandardCategory>([
    "dining",
    "groceries",
    "gas",
    "travel",
    "airfare",
    "hotels",
    "transit",
    "streaming",
    "drugstores",
    "online_retail",
    "entertainment",
    "utilities",
    "phone",
    "office_supply",
    "all_other"
  ]);

  return allowed.has(value as StandardCategory) ? (value as StandardCategory) : null;
}

export function resolvePurchaseCategory({
  explicitCategory,
  merchant,
  hostname
}: {
  explicitCategory?: unknown;
  merchant?: unknown;
  hostname?: unknown;
}): StandardCategory {
  const normalizedExplicit = normalizeToCategory(explicitCategory);
  if (normalizedExplicit) {
    return normalizedExplicit;
  }

  const context = `${String(merchant ?? "")} ${String(hostname ?? "")}`.trim();
  if (!context) {
    return "all_other";
  }

  for (const rule of CATEGORY_PATTERNS) {
    if (rule.patterns.some((pattern) => pattern.test(context))) {
      return rule.category;
    }
  }

  return "all_other";
}

