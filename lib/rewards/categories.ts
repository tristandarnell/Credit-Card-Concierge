export const STANDARD_CATEGORIES = [
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
] as const;

export type StandardCategory = (typeof STANDARD_CATEGORIES)[number];

export const CATEGORY_ALIASES: Record<StandardCategory, string[]> = {
  dining: ["dining", "restaurant", "restaurants", "food delivery", "takeout"],
  groceries: ["grocery", "groceries", "supermarket", "supermarkets"],
  gas: ["gas", "fuel", "gas stations", "service stations"],
  travel: ["travel", "travel purchases", "travel spend"],
  airfare: ["airfare", "flights", "airline", "airlines"],
  hotels: ["hotel", "hotels", "lodging"],
  transit: ["transit", "rideshare", "taxis", "subway", "train"],
  streaming: ["streaming", "streaming services", "select streaming"],
  drugstores: ["drugstore", "drugstores", "pharmacy", "pharmacies"],
  online_retail: ["online retail", "online purchases", "amazon", "ecommerce"],
  entertainment: ["entertainment", "live entertainment", "movie theaters"],
  utilities: ["utilities", "electric", "water", "internet bills"],
  phone: ["phone", "cell phone", "wireless", "telephone"],
  office_supply: ["office supply", "office supplies"],
  all_other: ["all other", "all purchases", "everything else", "all eligible purchases"]
};
