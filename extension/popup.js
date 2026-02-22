const statusEl = document.getElementById("status");
const detailsEl = document.getElementById("details");
const autofillBtn = document.getElementById("autofillBtn");
const openOptionsBtn = document.getElementById("openOptions");

let activeTabId = null;
let recommendedWalletCard = null;

function setStatus(message) {
  statusEl.textContent = message;
}

function maskNumber(number) {
  const value = String(number || "").replace(/\D+/g, "");
  if (value.length < 4) {
    return "••••";
  }
  return `•••• ${value.slice(-4)}`;
}

function storageGet(keys) {
  return new Promise((resolve) => {
    chrome.storage.local.get(keys, resolve);
  });
}

function queryActiveTab() {
  return new Promise((resolve) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      resolve(Array.isArray(tabs) ? tabs[0] : null);
    });
  });
}

function sendMessageToTab(tabId, message) {
  return new Promise((resolve) => {
    chrome.tabs.sendMessage(tabId, message, (response) => {
      if (chrome.runtime.lastError) {
        resolve(null);
        return;
      }
      resolve(response || null);
    });
  });
}

async function getAppSettings() {
  const data = await storageGet(["ccc_settings"]);
  const settings = data.ccc_settings || {};
  return {
    appBaseUrl: settings.appBaseUrl || "http://localhost:3000"
  };
}

async function getWalletCards() {
  const data = await storageGet(["ccc_wallet_cards"]);
  const cards = Array.isArray(data.ccc_wallet_cards) ? data.ccc_wallet_cards : [];
  return cards.filter((card) => card && card.cardId && card.cardNumber);
}

async function fetchRecommendation({ appBaseUrl, context, walletCards }) {
  const payload = {
    merchant: context?.title || context?.hostname || null,
    hostname: context?.hostname || null,
    amount: context?.amount ?? null,
    walletCardIds: walletCards.map((card) => card.cardId)
  };

  const response = await fetch(`${appBaseUrl}/api/extension/recommend`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error(`Recommendation API failed (${response.status})`);
  }

  return response.json();
}

function renderRecommendation({ recommendation, context, walletCard }) {
  if (!recommendation || !walletCard) {
    detailsEl.classList.add("hidden");
    autofillBtn.disabled = true;
    return;
  }

  detailsEl.innerHTML = `
    <p class="rec-title">${recommendation.cardName}</p>
    <p class="rec-meta">${recommendation.issuer} · ${maskNumber(walletCard.cardNumber)}</p>
    <p class="rec-meta">Category: ${String(context.category || "all_other").replace("_", " ")}</p>
    <p class="rec-meta">Rule: ${recommendation.matchedRule?.rateText || "N/A"}</p>
  `;
  detailsEl.classList.remove("hidden");
  autofillBtn.disabled = false;
}

async function initialize() {
  try {
    const settings = await getAppSettings();
    const walletCards = await getWalletCards();
    if (walletCards.length === 0) {
      setStatus("No wallet cards saved. Open Wallet Settings first.");
      return;
    }

    const tab = await queryActiveTab();
    if (!tab || !tab.id) {
      setStatus("No active tab found.");
      return;
    }

    activeTabId = tab.id;
    const context = await sendMessageToTab(tab.id, { type: "CCC_GET_CHECKOUT_CONTEXT" });
    if (!context) {
      setStatus("Could not inspect this page.");
      return;
    }

    const recommendationPayload = await fetchRecommendation({
      appBaseUrl: settings.appBaseUrl,
      context,
      walletCards
    });
    const recommendation = recommendationPayload.recommendation;
    if (!recommendation) {
      setStatus("No matching wallet card found for this checkout.");
      return;
    }

    recommendedWalletCard = walletCards.find((card) => card.cardId === recommendation.cardId) || null;
    if (!recommendedWalletCard) {
      setStatus("Recommended card is not configured with full autofill details.");
      return;
    }

    setStatus("Best card ready.");
    renderRecommendation({
      recommendation,
      context: recommendationPayload,
      walletCard: recommendedWalletCard
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    setStatus(message);
  }
}

autofillBtn.addEventListener("click", async () => {
  if (!activeTabId || !recommendedWalletCard) {
    return;
  }

  const result = await sendMessageToTab(activeTabId, {
    type: "CCC_AUTOFILL_RECOMMENDED_CARD",
    payload: {
      cardNumber: recommendedWalletCard.cardNumber,
      cardholderName: recommendedWalletCard.cardholderName,
      expMonth: recommendedWalletCard.expMonth,
      expYear: recommendedWalletCard.expYear,
      cvc: recommendedWalletCard.cvc,
      zip: recommendedWalletCard.zip
    }
  });

  if (!result?.ok) {
    setStatus(result?.reason || "Could not autofill on this page.");
    return;
  }

  setStatus(`Autofilled: ${result.filled.join(", ")}`);
});

openOptionsBtn.addEventListener("click", () => {
  chrome.runtime.openOptionsPage();
});

initialize();

