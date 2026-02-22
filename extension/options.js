const appBaseUrlInput = document.getElementById("appBaseUrl");
const saveSettingsButton = document.getElementById("saveSettings");
const loadCatalogButton = document.getElementById("loadCatalog");
const cardIdSelect = document.getElementById("cardIdSelect");
const saveWalletCardButton = document.getElementById("saveWalletCard");
const walletCardsList = document.getElementById("walletCards");
const statusEl = document.getElementById("status");

const cardholderNameInput = document.getElementById("cardholderName");
const cardNumberInput = document.getElementById("cardNumber");
const expMonthInput = document.getElementById("expMonth");
const expYearInput = document.getElementById("expYear");
const cvcInput = document.getElementById("cvc");
const zipInput = document.getElementById("zip");

let catalog = [];

function setStatus(message) {
  statusEl.textContent = message;
}

function storageGet(keys) {
  return new Promise((resolve) => chrome.storage.local.get(keys, resolve));
}

function storageSet(payload) {
  return new Promise((resolve) => chrome.storage.local.set(payload, resolve));
}

function maskCard(number) {
  const digits = String(number || "").replace(/\D+/g, "");
  return digits.length >= 4 ? `•••• ${digits.slice(-4)}` : "••••";
}

function renderCatalogOptions() {
  cardIdSelect.innerHTML = "";
  if (catalog.length === 0) {
    const option = document.createElement("option");
    option.value = "";
    option.textContent = "Load card catalog first";
    cardIdSelect.append(option);
    return;
  }

  for (const card of catalog) {
    const option = document.createElement("option");
    option.value = card.id;
    option.textContent = `${card.cardName} — ${card.issuer}`;
    cardIdSelect.append(option);
  }
}

function renderWalletCards(cards) {
  walletCardsList.innerHTML = "";
  if (!Array.isArray(cards) || cards.length === 0) {
    const empty = document.createElement("li");
    empty.textContent = "No wallet cards saved.";
    walletCardsList.append(empty);
    return;
  }

  for (const card of cards) {
    const item = document.createElement("li");
    const info = document.createElement("div");
    info.innerHTML = `<strong>${card.cardName || card.cardId}</strong><br><span>${maskCard(card.cardNumber)}</span>`;

    const remove = document.createElement("button");
    remove.type = "button";
    remove.textContent = "Remove";
    remove.className = "secondary";
    remove.addEventListener("click", async () => {
      const data = await storageGet(["ccc_wallet_cards"]);
      const current = Array.isArray(data.ccc_wallet_cards) ? data.ccc_wallet_cards : [];
      const next = current.filter((entry) => entry.walletEntryId !== card.walletEntryId);
      await storageSet({ ccc_wallet_cards: next });
      renderWalletCards(next);
      setStatus("Wallet card removed.");
    });

    item.append(info, remove);
    walletCardsList.append(item);
  }
}

async function loadSettings() {
  const data = await storageGet(["ccc_settings", "ccc_wallet_cards"]);
  const settings = data.ccc_settings || {};
  appBaseUrlInput.value = settings.appBaseUrl || "http://localhost:3000";
  renderWalletCards(Array.isArray(data.ccc_wallet_cards) ? data.ccc_wallet_cards : []);
}

async function loadCatalog() {
  const baseUrl = appBaseUrlInput.value.trim();
  if (!baseUrl) {
    setStatus("Enter app base URL first.");
    return;
  }

  const response = await fetch(`${baseUrl}/api/extension/cards?limit=1000`);
  if (!response.ok) {
    throw new Error(`Card catalog API failed (${response.status})`);
  }

  const payload = await response.json();
  catalog = Array.isArray(payload.cards) ? payload.cards : [];
  renderCatalogOptions();
  setStatus(`Loaded ${catalog.length} cards from app.`);
}

saveSettingsButton.addEventListener("click", async () => {
  const appBaseUrl = appBaseUrlInput.value.trim();
  if (!appBaseUrl) {
    setStatus("App Base URL is required.");
    return;
  }

  await storageSet({
    ccc_settings: { appBaseUrl }
  });
  setStatus("Settings saved.");
});

loadCatalogButton.addEventListener("click", async () => {
  try {
    await loadCatalog();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not load card catalog.";
    setStatus(message);
  }
});

saveWalletCardButton.addEventListener("click", async () => {
  const selectedCardId = cardIdSelect.value;
  if (!selectedCardId) {
    setStatus("Select a card first.");
    return;
  }

  const selectedCard = catalog.find((card) => card.id === selectedCardId);
  if (!selectedCard) {
    setStatus("Selected card not found in catalog.");
    return;
  }

  const entry = {
    walletEntryId: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    cardId: selectedCard.id,
    cardName: selectedCard.cardName,
    issuer: selectedCard.issuer,
    cardholderName: cardholderNameInput.value.trim(),
    cardNumber: cardNumberInput.value.trim(),
    expMonth: expMonthInput.value.trim(),
    expYear: expYearInput.value.trim(),
    cvc: cvcInput.value.trim(),
    zip: zipInput.value.trim()
  };

  if (!entry.cardholderName || !entry.cardNumber || !entry.expMonth || !entry.expYear || !entry.cvc) {
    setStatus("Cardholder, number, expiry, and CVC are required.");
    return;
  }

  const data = await storageGet(["ccc_wallet_cards"]);
  const current = Array.isArray(data.ccc_wallet_cards) ? data.ccc_wallet_cards : [];
  current.push(entry);
  await storageSet({ ccc_wallet_cards: current });
  renderWalletCards(current);
  setStatus("Wallet card saved.");
});

loadSettings().then(() => {
  renderCatalogOptions();
});

