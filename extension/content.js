function findInput(selectors) {
  for (const selector of selectors) {
    const element = document.querySelector(selector);
    if (element instanceof HTMLInputElement && !element.disabled && !element.readOnly) {
      return element;
    }
  }
  return null;
}

function findSelect(selectors) {
  for (const selector of selectors) {
    const element = document.querySelector(selector);
    if (element instanceof HTMLSelectElement && !element.disabled) {
      return element;
    }
  }
  return null;
}

function setInputValue(input, value) {
  input.focus();
  input.value = value;
  input.dispatchEvent(new Event("input", { bubbles: true }));
  input.dispatchEvent(new Event("change", { bubbles: true }));
}

function normalizeText(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[^\w\s]/g, "");
}

function monthCandidates(value) {
  const numeric = Number.parseInt(String(value || "").replace(/[^\d]/g, ""), 10);
  if (!Number.isFinite(numeric) || numeric < 1 || numeric > 12) {
    return [normalizeText(value)];
  }

  const monthShort = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"][numeric - 1];
  const monthLong = [
    "january",
    "february",
    "march",
    "april",
    "may",
    "june",
    "july",
    "august",
    "september",
    "october",
    "november",
    "december"
  ][numeric - 1];
  const mm = String(numeric).padStart(2, "0");

  return [normalizeText(mm), normalizeText(String(numeric)), monthShort, monthLong];
}

function yearCandidates(value) {
  const digits = String(value || "").replace(/[^\d]/g, "");
  if (!digits) {
    return [normalizeText(value)];
  }

  const yyyy = digits.length === 2 ? `20${digits}` : digits.slice(-4);
  const yy = yyyy.slice(-2);
  return [normalizeText(yyyy), normalizeText(yy)];
}

function setSelectValue(select, rawValue, mode) {
  const options = Array.from(select.options || []);
  if (options.length === 0) {
    return false;
  }

  const candidates = mode === "month" ? monthCandidates(rawValue) : yearCandidates(rawValue);
  const exact = options.find((option) => {
    const optionValue = normalizeText(option.value);
    const optionText = normalizeText(option.textContent || "");
    return candidates.includes(optionValue) || candidates.includes(optionText);
  });

  const partial =
    exact ||
    options.find((option) => {
      const optionValue = normalizeText(option.value);
      const optionText = normalizeText(option.textContent || "");
      return candidates.some((candidate) => optionValue.includes(candidate) || optionText.includes(candidate));
    });

  if (!partial) {
    return false;
  }

  select.focus();
  select.value = partial.value;
  select.dispatchEvent(new Event("input", { bubbles: true }));
  select.dispatchEvent(new Event("change", { bubbles: true }));
  return true;
}

function detectHostedCheckoutIframes() {
  const iframes = Array.from(document.querySelectorAll("iframe"));
  return iframes.some((iframe) => {
    const source = `${iframe.src || ""} ${iframe.name || ""} ${iframe.id || ""}`.toLowerCase();
    return (
      source.includes("stripe") ||
      source.includes("braintree") ||
      source.includes("adyen") ||
      source.includes("checkout") ||
      source.includes("square")
    );
  });
}

function parseAmountFromText(text) {
  const matches = [...text.matchAll(/\$?\s?(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/g)];
  const values = matches
    .map((match) => Number(match[1].replace(/,/g, "")))
    .filter((value) => Number.isFinite(value) && value > 0 && value < 100000);
  if (values.length === 0) {
    return null;
  }

  return Math.max(...values);
}

function extractCheckoutAmount() {
  const amountSelectors = [
    "[data-testid*='total']",
    "[class*='total']",
    "[id*='total']",
    "[aria-label*='total']",
    "[data-test*='total']"
  ];

  for (const selector of amountSelectors) {
    const element = document.querySelector(selector);
    if (!element) {
      continue;
    }

    const value = parseAmountFromText(element.textContent || "");
    if (value != null) {
      return value;
    }
  }

  return parseAmountFromText(document.body?.innerText?.slice(0, 4000) || "");
}

function getCheckoutContext() {
  const cardNumberInput = findInput([
    "input[autocomplete='cc-number']",
    "input[name*='card'][name*='number']",
    "input[id*='card'][id*='number']",
    "input[data-testid*='card-number']",
    "input[placeholder*='Card number']"
  ]);

  const nameInput = findInput([
    "input[autocomplete='cc-name']",
    "input[name*='card'][name*='name']",
    "input[id*='card'][id*='name']",
    "input[placeholder*='Name on card']"
  ]);

  const expiryInput = findInput([
    "input[autocomplete='cc-exp']",
    "input[name*='exp']",
    "input[id*='exp']",
    "input[placeholder*='MM/YY']"
  ]);
  const expMonthInput = findInput([
    "input[autocomplete='cc-exp-month']",
    "input[name*='exp'][name*='month']",
    "input[id*='exp'][id*='month']",
    "input[name*='month'][name*='card']",
    "input[id*='month'][id*='card']"
  ]);
  const expYearInput = findInput([
    "input[autocomplete='cc-exp-year']",
    "input[name*='exp'][name*='year']",
    "input[id*='exp'][id*='year']",
    "input[name*='year'][name*='card']",
    "input[id*='year'][id*='card']"
  ]);
  const expMonthSelect = findSelect([
    "select[autocomplete='cc-exp-month']",
    "select[name*='exp'][name*='month']",
    "select[id*='exp'][id*='month']",
    "select[name*='month'][name*='card']",
    "select[id*='month'][id*='card']",
    "select[data-testid*='exp-month']"
  ]);
  const expYearSelect = findSelect([
    "select[autocomplete='cc-exp-year']",
    "select[name*='exp'][name*='year']",
    "select[id*='exp'][id*='year']",
    "select[name*='year'][name*='card']",
    "select[id*='year'][id*='card']",
    "select[data-testid*='exp-year']"
  ]);

  const cvcInput = findInput([
    "input[autocomplete='cc-csc']",
    "input[name*='cvc']",
    "input[name*='cvv']",
    "input[id*='cvc']",
    "input[id*='cvv']",
    "input[name*='security'][name*='code']",
    "input[id*='security'][id*='code']",
    "input[placeholder*='Security code']",
    "input[placeholder*='CVV']",
    "input[placeholder*='CVC']",
    "input[placeholder*='CID']"
  ]);

  const hostedCheckout = detectHostedCheckoutIframes();
  const canAutofill = Boolean(
    cardNumberInput ||
      nameInput ||
      expiryInput ||
      expMonthInput ||
      expYearInput ||
      expMonthSelect ||
      expYearSelect ||
      cvcInput
  );
  const amount = extractCheckoutAmount();

  return {
    url: window.location.href,
    hostname: window.location.hostname,
    title: document.title,
    amount,
    hostedCheckout,
    canAutofill
  };
}

function fillCard(details) {
  const cardNumberInput = findInput([
    "input[autocomplete='cc-number']",
    "input[name*='card'][name*='number']",
    "input[id*='card'][id*='number']",
    "input[data-testid*='card-number']",
    "input[placeholder*='Card number']"
  ]);
  const nameInput = findInput([
    "input[autocomplete='cc-name']",
    "input[name*='card'][name*='name']",
    "input[id*='card'][id*='name']",
    "input[placeholder*='Name on card']"
  ]);
  const expInput = findInput([
    "input[autocomplete='cc-exp']",
    "input[name*='exp']",
    "input[id*='exp']",
    "input[placeholder*='MM/YY']"
  ]);
  const expMonthInput = findInput([
    "input[autocomplete='cc-exp-month']",
    "input[name*='exp'][name*='month']",
    "input[id*='exp'][id*='month']",
    "input[name*='month'][name*='card']",
    "input[id*='month'][id*='card']"
  ]);
  const expYearInput = findInput([
    "input[autocomplete='cc-exp-year']",
    "input[name*='exp'][name*='year']",
    "input[id*='exp'][id*='year']",
    "input[name*='year'][name*='card']",
    "input[id*='year'][id*='card']"
  ]);
  const expMonthSelect = findSelect([
    "select[autocomplete='cc-exp-month']",
    "select[name*='exp'][name*='month']",
    "select[id*='exp'][id*='month']",
    "select[name*='month'][name*='card']",
    "select[id*='month'][id*='card']",
    "select[data-testid*='exp-month']"
  ]);
  const expYearSelect = findSelect([
    "select[autocomplete='cc-exp-year']",
    "select[name*='exp'][name*='year']",
    "select[id*='exp'][id*='year']",
    "select[name*='year'][name*='card']",
    "select[id*='year'][id*='card']",
    "select[data-testid*='exp-year']"
  ]);
  const cvcInput = findInput([
    "input[autocomplete='cc-csc']",
    "input[name*='cvc']",
    "input[name*='cvv']",
    "input[id*='cvc']",
    "input[id*='cvv']",
    "input[name*='security'][name*='code']",
    "input[id*='security'][id*='code']",
    "input[placeholder*='Security code']",
    "input[placeholder*='CVV']",
    "input[placeholder*='CVC']",
    "input[placeholder*='CID']"
  ]);
  const postalInput = findInput([
    "input[autocomplete='postal-code']",
    "input[name*='zip']",
    "input[id*='zip']",
    "input[name*='postal']",
    "input[id*='postal']"
  ]);

  if (!cardNumberInput && detectHostedCheckoutIframes()) {
    return {
      ok: false,
      reason: "Checkout uses hosted payment iframes (Stripe/Shopify/etc.). Extension cannot fill inside those frames."
    };
  }

  const filled = [];
  if (cardNumberInput && details.cardNumber) {
    setInputValue(cardNumberInput, details.cardNumber.replace(/\s+/g, ""));
    filled.push("card_number");
  }
  if (nameInput && details.cardholderName) {
    setInputValue(nameInput, details.cardholderName);
    filled.push("cardholder_name");
  }
  if (expInput && details.expMonth && details.expYear) {
    setInputValue(expInput, `${details.expMonth}/${String(details.expYear).slice(-2)}`);
    filled.push("expiry");
  } else {
    if (expMonthInput && details.expMonth) {
      setInputValue(expMonthInput, details.expMonth);
      filled.push("exp_month");
    }
    if (!expMonthInput && expMonthSelect && details.expMonth) {
      if (setSelectValue(expMonthSelect, details.expMonth, "month")) {
        filled.push("exp_month");
      }
    }
    if (expYearInput && details.expYear) {
      setInputValue(expYearInput, String(details.expYear));
      filled.push("exp_year");
    }
    if (!expYearInput && expYearSelect && details.expYear) {
      if (setSelectValue(expYearSelect, details.expYear, "year")) {
        filled.push("exp_year");
      }
    }
  }
  if (cvcInput && details.cvc) {
    setInputValue(cvcInput, details.cvc);
    filled.push("cvc");
  }
  if (postalInput && details.zip) {
    setInputValue(postalInput, details.zip);
    filled.push("zip");
  }

  if (filled.length === 0) {
    return { ok: false, reason: "No compatible payment fields found on this page." };
  }

  return { ok: true, filled };
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === "CCC_GET_CHECKOUT_CONTEXT") {
    sendResponse(getCheckoutContext());
    return true;
  }

  if (message?.type === "CCC_AUTOFILL_RECOMMENDED_CARD") {
    sendResponse(fillCard(message.payload || {}));
    return true;
  }

  return false;
});
