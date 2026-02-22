import argparse
import time
import pandas as pd
import random
from faker import Faker
from datetime import datetime, timedelta

# Parse CLI first so we can override config
parser = argparse.ArgumentParser(description="Generate synthetic credit card transactions")
parser.add_argument("--brand-names", action="store_true", help="Use 100%% real brand names (for synthetic_brand_name_merchant_*.csv)")
parser.add_argument("--output", "-o", type=str, help="Output CSV path")
_cli = parser.parse_args()

fake = Faker()
Faker.seed(42)
random.seed(42)

# -----------------------------
# CONFIGURATION
# -----------------------------
N_TRANSACTIONS = 50_000
BATCH_SIZE = 50_000
OUTPUT_FILE = _cli.output or "synthetic_credit_card_transactions.csv"

# Fraction of merchant pool that uses REAL brand names (0.0–1.0).
# 1.0 = 100% brands (for synthetic_brand_name_merchant_*.csv)
REAL_MERCHANT_RATIO = 1.0 if _cli.brand_names else 0.10

SLEEP_PER_BATCH_SEC = 2.0         # Pause between batches (seconds)
SLEEP_PER_1K_MERCHANTS_SEC = 0.1  # Pause every 1k merchants when building pools
SLEEP_EVERY_N_TRANSACTIONS = 5000  # Pause every N transactions (0 = no pause)
SLEEP_PER_CHUNK_SEC = 0.5         # Seconds to sleep when pausing

# Categories align with lib/rewards/categories.ts StandardCategory (snake_case)
categories = [
    "dining", "groceries", "gas", "travel", "airfare", "hotels", "transit",
    "streaming", "drugstores", "online_retail", "entertainment", "utilities",
    "phone", "office_supply", "all_other"
]

category_weights = [
    0.15, 0.12, 0.05, 0.04, 0.03, 0.03, 0.05, 0.05, 0.04, 0.14,
    0.05, 0.06, 0.03, 0.03, 0.13
]

amount_ranges = {
    "dining": (2, 150),
    "groceries": (5, 200),
    "gas": (20, 100),
    "travel": (30, 400),
    "airfare": (100, 1000),
    "hotels": (80, 500),
    "transit": (2, 50),
    "streaming": (5, 20),
    "drugstores": (5, 150),
    "online_retail": (10, 500),
    "entertainment": (10, 200),
    "utilities": (50, 300),
    "phone": (40, 150),
    "office_supply": (5, 200),
    "all_other": (1, 500),
}

# -----------------------------
# PRECOMPUTE MERCHANT POOLS WITH REAL AND FAKE MERCHANTS INCLUDING FILLER TEXT
# -----------------------------
MERCHANT_POOL_SIZE = 40_000

real_merchants = {
    "dining": ["MCDONALDS", "BURGER KING", "WENDYS", "CHIPOTLE", "SUBWAY", "TACO BELL", "KFC", "OLIVE GARDEN", "CHEESECAKE FACTORY", "PF CHANGS", "APPLEBEES", "IHOP", "DENNYS", "DOMINOS", "PIZZA HUT", "STARBUCKS", "DUNKIN", "PEETS COFFEE", "CARIBOU COFFEE", "BLUE BOTTLE", "TIM HORTONS"],
    "groceries": ["WALMART", "TARGET", "COSTCO", "WHOLE FOODS", "TRADER JOE'S", "KROGER", "SAFEWAY", "ALDI", "LIDL", "PUBLIX", "HEB", "MEIJER", "SPROUTS", "PEPSI", "PEPSI BOTTLING", "CTLP PEPSI"],
    "gas": ["SHELL", "EXXON", "BP", "CHEVRON", "SUNOCO", "CITGO", "VALERO", "MOBIL"],
    "travel": ["ENTERPRISE", "HERTZ", "BUDGET", "AVIS", "EXPEDIA", "BOOKING.COM", "KAYAK", "TRIPADVISOR"],
    "airfare": ["DELTA AIR LINES", "AMERICAN AIRLINES", "UNITED AIRLINES", "SOUTHWEST", "JETBLUE", "ALASKA AIR", "FRONTIER", "SPIRIT AIR"],
    "hotels": ["MARRIOTT", "HILTON", "HYATT", "IHG", "WYNDHAM", "CHOICE HOTELS", "BEST WESTERN", "AIRBNB"],
    "transit": ["UBER", "LYFT", "AMTRAK", "NYC MTA", "NJT", "NJT RAIL", "NJT RAIL MY-TIX", "BART", "WMATA", "SEPTA", "CTA", "LA METRO"],
    "streaming": ["NETFLIX", "SPOTIFY", "HULU", "DISNEY PLUS", "HBO MAX", "APPLE MUSIC", "YOUTUBE PREMIUM", "AMAZON PRIME"],
    "drugstores": ["CVS", "WALGREENS", "RITE AID", "CVS PHARMACY", "WALGREENS PHARMACY"],
    "online_retail": ["AMAZON", "AMAZON.COM", "EBAY", "WALMART.COM", "TARGET.COM", "BEST BUY", "APPLE STORE", "H&M", "ZARA", "NIKE", "ADIDAS", "UNIQLO", "GAP", "OLD NAVY", "NORDSTROM", "MACYS", "ETSY"],
    "entertainment": ["AMC THEATRES", "CINEPOLIS", "REGAL CINEMAS", "TICKETMASTER", "LIVE NATION", "STEAM", "PLAYSTATION", "XBOX", "NINTENDO"],
    "utilities": ["COMCAST", "PG&E", "CON EDISON", "DUKE ENERGY", "XFINITY", "SPECTRUM", "COX COMMUNICATIONS"],
    "phone": ["VERIZON", "AT&T", "T MOBILE", "T-MOBILE", "SPRINT", "CRICKET", "MINT MOBILE"],
    "office_supply": ["STAPLES", "OFFICE DEPOT", "OFFICE MAX", "AMAZON BUSINESS"],
    "all_other": ["AMAZON MARKETPLACE", "PAYPAL", "VENMO", "VENMO PAYMENT", "SQUARE", "STRIPE", "FACEBOOK ADS", "GOOGLE SERVICES", "GEICO", "STATE FARM", "ALLSTATE", "PROGRESSIVE"]
}

merchant_templates = {
    cat: lambda: f"{fake.company().upper()} {fake.bothify('###')} {fake.state_abbr()}" 
    for cat in categories
}

filler_phrases = ["PURCHASE AUTHORIZED", "DEBIT", "ONLINE PAYMENT", "POS", "REF", "#", "INV", "TXN", "PAYMENT"]

# Build merchant pools with a mix of real and fake merchants and filler text
n_real = int(MERCHANT_POOL_SIZE * REAL_MERCHANT_RATIO)
n_fake = MERCHANT_POOL_SIZE - n_real

merchant_pools = {}
for cat in categories:
    pool = []
    # Add real brand merchants
    for i in range(n_real):
        real_merchant = random.choice(real_merchants[cat]).upper()
        filler = random.choice(filler_phrases)
        number = fake.bothify(' ##?#')
        location = f"{fake.city().upper()} {fake.state_abbr()}"
        pool.append(f"{filler} {real_merchant} {location} {number}")
        if i > 0 and i % 1000 == 0:
            time.sleep(SLEEP_PER_1K_MERCHANTS_SEC)
    # Fill the rest with fake merchants
    while len(pool) < MERCHANT_POOL_SIZE:
        fake_merchant = merchant_templates[cat]()
        filler = random.choice(filler_phrases)
        number = fake.bothify(' ##?#')
        location = f"{fake.city().upper()} {fake.state_abbr()}"
        pool.append(f"{filler} {fake_merchant} {location} {number}")
        if len(pool) % 1000 == 0:
            time.sleep(SLEEP_PER_1K_MERCHANTS_SEC)
    random.shuffle(pool)
    merchant_pools[cat] = pool

# -----------------------------
# TRANSACTION GENERATOR
# -----------------------------
def generate_transaction():
    category = random.choices(categories, weights=category_weights)[0]
    description = random.choice(merchant_pools[category])

    low, high = amount_ranges[category]
    amount = round(random.uniform(low, high), 2)

    start_date = datetime.now() - timedelta(days=730)
    date = start_date + timedelta(days=random.randint(0, 730))

    return {
        "date": date.strftime("%Y-%m-%d"),
        "description": description,
        "amount": amount,
        "category": category
    }

# -----------------------------
# DATA GENERATION
# -----------------------------
chunks = []
for b in range(N_TRANSACTIONS // BATCH_SIZE):
    if b > 0:
        time.sleep(SLEEP_PER_BATCH_SEC)
    batch = []
    for i in range(BATCH_SIZE):
        batch.append(generate_transaction())
        if SLEEP_EVERY_N_TRANSACTIONS and (i + 1) % SLEEP_EVERY_N_TRANSACTIONS == 0:
            time.sleep(SLEEP_PER_CHUNK_SEC)
    chunks.append(pd.DataFrame(batch))

# Combine + shuffle

df = pd.concat(chunks, ignore_index=True)
df = df.sample(frac=1).reset_index(drop=True)

# Save
df.to_csv(OUTPUT_FILE, index=False)
print(df.head())
print(f"\nSaved to {OUTPUT_FILE} ({REAL_MERCHANT_RATIO:.0%} real brands)")
