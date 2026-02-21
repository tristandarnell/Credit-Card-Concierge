export type CardRecommendation = {
  name: string;
  issuer: string;
  accentColor: string;
  annualFee: string;
  fitScore: number;
  confidence: number;
  bestFor: string;
  projectedValue: string;
  projectedValueRaw: number;
  signUpBonus: string;
  reasons: string[];
};

export const topCards: CardRecommendation[] = [
  {
    name: "Chase Sapphire Preferred",
    issuer: "Chase",
    accentColor: "#2F6BFF",
    annualFee: "$95",
    fitScore: 92,
    confidence: 88,
    bestFor: "Dining + travel",
    projectedValue: "$1,140/yr",
    projectedValueRaw: 1140,
    signUpBonus: "60,000 points after $4,000 spend in first 3 months",
    reasons: [
      "3x on dining, 2x on all other travel — matches your top two spend categories",
      "Points transfer 1:1 to United, Hyatt, Southwest, and 11 other partners",
      "Annual fee offset by $50 hotel credit and 25% bonus via Chase Travel portal"
    ]
  },
  {
    name: "American Express Gold",
    issuer: "American Express",
    accentColor: "#B5941A",
    annualFee: "$325",
    fitScore: 87,
    confidence: 82,
    bestFor: "Groceries + dining",
    projectedValue: "$1,010/yr",
    projectedValueRaw: 1010,
    signUpBonus: "60,000 Membership Rewards points after $6,000 spend in 6 months",
    reasons: [
      "4x at U.S. supermarkets (up to $25,000/year) and 4x at restaurants worldwide",
      "$120 dining credit and $120 Uber Cash partially offset the annual fee",
      "Points transfer to Delta, Air France, and 18 airline and hotel partners"
    ]
  },
  {
    name: "Capital One Venture X",
    issuer: "Capital One",
    accentColor: "#1DB954",
    annualFee: "$395",
    fitScore: 84,
    confidence: 76,
    bestFor: "General spend + travel",
    projectedValue: "$960/yr",
    projectedValueRaw: 960,
    signUpBonus: "75,000 miles after $4,000 spend in first 3 months",
    reasons: [
      "2x miles on every purchase — no category tracking needed for everyday spend",
      "$300 annual travel credit via Capital One Travel covers most of the annual fee",
      "10,000 bonus miles each account anniversary worth ~$100 in travel"
    ]
  }
];

export const comparisonCards: CardRecommendation[] = [
  ...topCards,
  {
    name: "Citi Double Cash",
    issuer: "Citi",
    accentColor: "#6B7280",
    annualFee: "$0",
    fitScore: 76,
    confidence: 91,
    bestFor: "Flat-rate cash back",
    projectedValue: "$520/yr",
    projectedValueRaw: 520,
    signUpBonus: "$200 cash back after $1,500 spend in 6 months",
    reasons: [
      "2% on every purchase — 1% when you buy, 1% when you pay",
      "No annual fee makes it cost-free to hold as a backup card",
      "Converts to Citi ThankYou points if paired with a Citi Premier"
    ]
  },
  {
    name: "Chase Freedom Unlimited",
    issuer: "Chase",
    accentColor: "#2F6BFF",
    annualFee: "$0",
    fitScore: 71,
    confidence: 85,
    bestFor: "No-fee daily spending",
    projectedValue: "$490/yr",
    projectedValueRaw: 490,
    signUpBonus: "Extra 1.5% on all purchases in first year (on up to $20,000 spent)",
    reasons: [
      "1.5% on all purchases, 3% on dining and drugstores, 5% on travel via Chase",
      "No annual fee — ideal as a companion card to boost flat-rate spend",
      "Ultimate Rewards points stack with Sapphire for higher redemption value"
    ]
  },
  {
    name: "Amex Blue Cash Preferred",
    issuer: "American Express",
    accentColor: "#B5941A",
    annualFee: "$95",
    fitScore: 68,
    confidence: 79,
    bestFor: "High grocery spend",
    projectedValue: "$460/yr",
    projectedValueRaw: 460,
    signUpBonus: "$250 statement credit after $3,000 spend in 6 months",
    reasons: [
      "6% cash back at U.S. supermarkets on up to $6,000 per year",
      "6% on select U.S. streaming subscriptions",
      "3% at U.S. gas stations and transit — strong for commuters"
    ]
  }
];

export const purchaseExamples = [
  { merchant: "Whole Foods", category: "Groceries", amount: 142.51, card: "Amex Gold", rewards: "4x points (~$8.55)" },
  { merchant: "United Airlines", category: "Travel", amount: 418.22, card: "Chase Sapphire Preferred", rewards: "2x points (~$12.55)" },
  { merchant: "Uber", category: "Transit", amount: 26.8, card: "Capital One Venture X", rewards: "2x miles (~$0.54)" },
  { merchant: "Local Cafe", category: "Dining", amount: 19.75, card: "Amex Gold", rewards: "4x points (~$1.19)" },
  { merchant: "Amazon", category: "Shopping", amount: 87.40, card: "Citi Double Cash", rewards: "2% cash back (~$1.75)" },
  { merchant: "Shell Gas Station", category: "Gas", amount: 64.20, card: "Amex Blue Cash Preferred", rewards: "3% cash back (~$1.93)" }
];

export const spendingAllocation = [
  { category: "Dining", pct: 31, current: "Amex Gold (4x)", optimal: "Amex Gold (4x)", optimized: true },
  { category: "Travel", pct: 24, current: "Chase Sapphire (2x)", optimal: "Chase Sapphire (3x)", optimized: true },
  { category: "Groceries", pct: 22, current: "Citi Double Cash (2%)", optimal: "Amex Gold (4x)", optimized: false },
  { category: "General", pct: 14, current: "Cap One Venture X (2x)", optimal: "Cap One Venture X (2x)", optimized: true },
  { category: "Gas", pct: 9, current: "Chase Sapphire (1x)", optimal: "Amex BCP (3%)", optimized: false },
];
