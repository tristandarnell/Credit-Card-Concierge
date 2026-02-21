export type CardRecommendation = {
  name: string;
  annualFee: string;
  fitScore: number;
  bestFor: string;
  projectedValue: string;
  reasons: string[];
};

export const topCards: CardRecommendation[] = [
  {
    name: "Chase Sapphire Preferred",
    annualFee: "$95",
    fitScore: 92,
    bestFor: "Dining + travel",
    projectedValue: "$1,140/year",
    reasons: [
      "High point value on travel portal redemptions",
      "Strong match with monthly dining volume",
      "Flexible transfer partners"
    ]
  },
  {
    name: "Amex Gold",
    annualFee: "$325",
    fitScore: 87,
    bestFor: "Groceries + dining",
    projectedValue: "$1,010/year",
    reasons: [
      "Top earnings for supermarket spend",
      "Frequent restaurant purchases align with bonus category",
      "Statement credits offset part of annual fee"
    ]
  },
  {
    name: "Capital One Venture X",
    annualFee: "$395",
    fitScore: 84,
    bestFor: "General spend + travel",
    projectedValue: "$960/year",
    reasons: [
      "Simple flat-rate earnings on uncategorized purchases",
      "Travel credits and lounge access improve total value",
      "Strong option for higher-ticket bookings"
    ]
  }
];

export const purchaseExamples = [
  { merchant: "Whole Foods", category: "Groceries", amount: 142.51, card: "Amex Gold", rewards: "4x points" },
  { merchant: "United Airlines", category: "Travel", amount: 418.22, card: "Chase Sapphire Preferred", rewards: "2x points + transfer value" },
  { merchant: "Uber", category: "Transit", amount: 26.8, card: "Capital One Venture X", rewards: "2x miles" },
  { merchant: "Local Cafe", category: "Dining", amount: 19.75, card: "Amex Gold", rewards: "4x points" }
];
