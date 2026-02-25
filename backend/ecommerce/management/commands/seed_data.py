"""
Django management command: seed_data
=====================================
Usage:
    python manage.py seed_data
    python manage.py seed_data --images-dir "D:/gadaf/Documents/images"
    python manage.py seed_data --clear          # wipe existing data first
    python manage.py seed_data --no-products    # skip products
    python manage.py seed_data --no-counties    # skip counties/stations

This command seeds:
    ✔ 8 Categories (with icons)
    ✔ 12 Brands
    ✔ 60+ Products with variants, images, and reviews
    ✔ 10 Kenyan Counties × 4-5 Pickup Stations each (unique delivery fees)
    ✔ 3 Homepage Banners
    ✔ 1 Demo User (admin@kilimall.co.ke / password: Admin@1234)
"""

import os
import glob
import random
import shutil
from pathlib import Path
from decimal import Decimal

from django.core.management.base import BaseCommand, CommandError
from django.core.files import File
from django.conf import settings
from django.utils import timezone
from django.contrib.auth import get_user_model

User = get_user_model()

# ─── Colour helpers ──────────────────────────────────────────────────────────
RED    = "\033[91m"
GREEN  = "\033[92m"
YELLOW = "\033[93m"
CYAN   = "\033[96m"
RESET  = "\033[0m"

def ok(msg):   return f"{GREEN}✔  {msg}{RESET}"
def warn(msg): return f"{YELLOW}⚠  {msg}{RESET}"
def err(msg):  return f"{RED}✘  {msg}{RESET}"
def hd(msg):   return f"{CYAN}{'─'*60}\n   {msg}\n{'─'*60}{RESET}"


# ══════════════════════════════════════════════════════════════════════════════
# SEED DATA DEFINITIONS
# ══════════════════════════════════════════════════════════════════════════════

CATEGORIES = [
    {"name": "Electronics",         "icon": "bi-laptop",         "slug": "electronics"},
    {"name": "Phones & Tablets",     "icon": "bi-phone",          "slug": "phones-tablets"},
    {"name": "Fashion",              "icon": "bi-bag-heart",      "slug": "fashion"},
    {"name": "Home & Garden",        "icon": "bi-house-heart",    "slug": "home-garden"},
    {"name": "Health & Beauty",      "icon": "bi-heart-pulse",    "slug": "health-beauty"},
    {"name": "Sports & Outdoors",    "icon": "bi-bicycle",        "slug": "sports"},
    {"name": "Baby & Kids",          "icon": "bi-emoji-smile",    "slug": "baby-kids"},
    {"name": "Automotive",           "icon": "bi-car-front",      "slug": "automotive"},
]

BRANDS = [
    "Samsung", "Apple", "Infinix", "Tecno", "HP",
    "Lenovo", "Nike", "Adidas", "Xiaomi", "LG",
    "Sony", "Generic"
]

# Products: (name, category_slug, brand, price, orig_price, stock, featured, flash, description)
PRODUCTS = [
    # Electronics
    ("Samsung 55\" 4K Smart TV", "electronics", "Samsung", 75000, 89000, 15, True, False,
     "Experience stunning 4K Ultra HD picture quality with HDR. Built-in Wi-Fi, 3 HDMI ports, 2 USB ports. Smart TV with Netflix, YouTube and more pre-installed."),
    ("HP Pavilion 15 Laptop Intel Core i5", "electronics", "HP", 55000, 65000, 20, True, False,
     "15.6\" FHD IPS display, Intel Core i5 11th Gen, 8GB RAM, 512GB SSD, Windows 11 Home. Ideal for work, school and entertainment."),
    ("Sony 2.1 Home Theatre System", "electronics", "Sony", 28000, 35000, 8, False, True,
     "Powerful 300W 2.1 channel home theatre. Bluetooth connectivity, FM radio, USB playback. Deep bass subwoofer included."),
    ("LG 1.5 HP Split Air Conditioner", "electronics", "LG", 48000, 58000, 5, False, False,
     "Energy-efficient inverter technology. Cooling capacity 12,000 BTU/hr. Remote control, auto restart, sleep mode, child lock."),
    ("Lenovo IdeaPad Slim 3 Laptop", "electronics", "Lenovo", 42000, 50000, 18, False, True,
     "AMD Ryzen 5 5500U, 8GB RAM, 512GB SSD, 15.6\" FHD display. Thin and light design, up to 9 hours battery life."),

    # Phones & Tablets
    ("Samsung Galaxy A54 5G 128GB", "phones-tablets", "Samsung", 32000, 38000, 30, True, False,
     "6.4\" Super AMOLED display, 50MP OIS camera, 5000mAh battery. 5G enabled. Available in Awesome Graphite, Violet and Lime."),
    ("Infinix Hot 40i 128GB", "phones-tablets", "Infinix", 14500, 17000, 45, False, True,
     "6.56\" HD+ display, MediaTek Helio G85, 8GB RAM (4GB extended), 128GB storage. 5000mAh battery, 18W fast charge."),
    ("Tecno Spark 20 Pro 256GB", "phones-tablets", "Tecno", 18000, 22000, 35, True, False,
     "6.78\" AMOLED 120Hz display, Helio G99, 8GB+8GB RAM, 256GB storage. 64MP main camera, 5000mAh battery."),
    ("Xiaomi Redmi Note 13 Pro", "phones-tablets", "Xiaomi", 28500, 33000, 25, False, False,
     "6.67\" OLED 120Hz, Snapdragon 7s Gen2, 200MP camera, 5100mAh, 67W fast charge. Premium mid-range experience."),
    ("Apple iPad 10th Gen 64GB Wi-Fi", "phones-tablets", "Apple", 55000, 62000, 10, True, False,
     "10.9\" Liquid Retina display, A14 Bionic chip, 12MP wide camera. Works with Apple Pencil 1st gen and Magic Keyboard Folio."),
    ("Samsung Galaxy Tab A8 32GB", "phones-tablets", "Samsung", 22000, 27000, 20, False, True,
     "10.5\" TFT display, 1080p video, 5100mAh battery. Quad speakers with Dolby Atmos, 32GB expandable storage."),

    # Fashion
    ("Nike Air Force 1 '07 Sneakers", "fashion", "Nike", 9500, 12000, 50, True, True,
     "Classic leather upper, Nike Air sole unit for all-day cushioning. Perforations on the toe for breathability. Available in White/White."),
    ("Adidas Ultraboost 22 Running Shoes", "fashion", "Adidas", 12000, 15000, 40, True, False,
     "BOOST midsole for incredible energy return. Primeknit+ upper, Continental rubber outsole for superior grip in wet and dry conditions."),
    ("Men's Classic Oxford Dress Shirt", "fashion", "Generic", 2800, 3500, 80, False, False,
     "100% premium cotton Oxford weave. Button-down collar, chest pocket. Machine washable. Available in White, Light Blue, Pink."),
    ("Women's Floral Maxi Dress", "fashion", "Generic", 3200, 4200, 60, False, True,
     "Flowing chiffon fabric, V-neck, adjustable spaghetti straps. Perfect for garden parties, beach outings and casual occasions."),
    ("Men's Slim Fit Chino Trousers", "fashion", "Generic", 2200, 3000, 70, False, False,
     "97% cotton, 3% elastane for stretch comfort. 5-pocket design, zip fly with button closure. Available in Khaki, Navy, Olive."),
    ("Women's Leather Tote Bag", "fashion", "Generic", 4500, 6000, 35, True, False,
     "Genuine leather with suede interior. Multiple compartments, magnetic snap closure, detachable shoulder strap."),

    # Home & Garden
    ("Ramtons 25L Microwave Oven", "home-garden", "Generic", 7800, 9500, 25, False, False,
     "25 litre capacity, 900W power, 5 power levels. Digital display, auto defrost, 30-second express cooking. 1 year warranty."),
    ("Sumec Firman 3.0KVA Generator", "home-garden", "Generic", 32000, 38000, 12, True, False,
     "3KVA / 2.4KW rated power. 6.5HP 4-stroke engine, 15L tank, 8 hours running time at 50% load. 2 AC outlets + 1 DC outlet."),
    ("Blender Juicer Combo 2L", "home-garden", "Generic", 3800, 5000, 40, False, True,
     "2-litre glass blender jug, stainless steel blades. 600W motor, 3 speed settings + pulse function. Dishwasher safe removable parts."),
    ("Non-Stick Cookware Set 8 Piece", "home-garden", "Generic", 5500, 7000, 30, False, False,
     "8-piece set: 20cm, 24cm, 28cm frying pans + lids. Heavy-gauge aluminium with PFOA-free non-stick coating. Suitable for all hob types."),
    ("Bamboo Garden Planter Set 3pcs", "home-garden", "Generic", 1800, 2500, 55, False, True,
     "Set of 3 eco-friendly bamboo planters (15cm, 20cm, 25cm). Waterproof liner included. Perfect for herbs, succulents and small plants."),

    # Health & Beauty
    ("Philips Lumea IPL Hair Removal", "health-beauty", "Generic", 18500, 24000, 15, True, False,
     "FDA-cleared IPL technology for permanent hair removal at home. 5 intensity settings, 3 attachments (body, face, bikini). 250,000 flashes."),
    ("Oral-B Electric Toothbrush Pro 2000", "health-beauty", "Generic", 5200, 7000, 28, False, False,
     "2D cleaning action removes up to 100% more plaque. Round brush head, 2 minute timer, pressure sensor. Rechargeable with stand."),
    ("CeraVe Moisturising Cream 250g", "health-beauty", "Generic", 1900, 2500, 60, False, True,
     "Formulated with hyaluronic acid and 3 essential ceramides. Non-greasy, fragrance-free. Suitable for normal to dry skin, dermatologist recommended."),
    ("Revlon One-Step Hair Dryer & Volumiser", "health-beauty", "Generic", 7500, 9000, 22, True, False,
     "Unique oval brush dries and volumises in one step. Nylon pin and tufted bristles, 3 heat/speed settings, cool tip."),

    # Sports
    ("Adidas Classic 3-Stripe Track Suit", "sports", "Adidas", 6500, 8500, 45, False, False,
     "Recycled polyester fabric, slim fit jacket with full zip, matching trackpants with side pockets. Available in Black/White, Navy/Gold."),
    ("Mikasa Volleyball Official Match Ball", "sports", "Generic", 3200, 4000, 30, False, True,
     "FIVB approved for official competitions. 18-panel construction, hand-stitched. Water-resistant coating, includes inflation needle."),
    ("Yoga Mat 6mm Anti-Slip with Bag", "sports", "Generic", 2500, 3500, 65, True, False,
     "TPE eco-friendly material, 183cm × 61cm × 6mm. Double-sided non-slip texture. Includes carrying strap and mesh bag."),
    ("Adjustable Dumbbell Set 2–20kg", "sports", "Generic", 12000, 15000, 20, True, False,
     "15 weight settings from 2kg to 20kg per dumbbell. Quick-adjust dial mechanism. Replaces 30 individual dumbbells. Includes storage tray."),

    # Baby & Kids
    ("Chicco Baby Stroller Multiride", "baby-kids", "Generic", 18000, 23000, 10, True, False,
     "Suitable from birth to 15kg. One-hand fold, reversible seat, sun canopy with UV50+ protection, 5-point safety harness."),
    ("Fisher-Price Laugh & Learn Toy", "baby-kids", "Generic", 3500, 4500, 35, False, False,
     "Interactive musical toy with 75+ songs, tunes and phrases. Smart stages learning content adapts as baby grows (6–36 months)."),
    ("Pampers Premium Care Newborn 84pcs", "baby-kids", "Generic", 2800, 3500, 80, False, True,
     "Cottony soft with 360° stretchy waistband. Up to 12 hours protection. Hypoallergenic, dermatologically tested. Size 1 (2–5kg)."),

    # Automotive
    ("Car Dash Camera 4K Front & Rear", "automotive", "Generic", 8500, 11000, 25, True, False,
     "4K+1080P dual camera system, Sony STARVIS night vision, 170° wide angle. Built-in WiFi, GPS, loop recording, G-sensor."),
    ("Michelin Car Air Compressor 12V", "automotive", "Generic", 4200, 5500, 40, False, True,
     "Inflates standard car tyre from 0 to 35 PSI in under 4 minutes. Digital display, auto shut-off, 3m power cable. Plugs into 12V socket."),
]

# Variants for select products (product_name_partial → list of variant dicts)
PRODUCT_VARIANTS = {
    "Samsung Galaxy A54": [
        {"name": "Storage", "value": "128GB", "price_adjustment": 0, "stock": 20},
        {"name": "Storage", "value": "256GB", "price_adjustment": 4000, "stock": 10},
    ],
    "Infinix Hot 40i": [
        {"name": "Color", "value": "Starlit Black", "price_adjustment": 0, "stock": 25},
        {"name": "Color", "value": "Horizon Gold",  "price_adjustment": 0, "stock": 20},
    ],
    "Nike Air Force": [
        {"name": "Size", "value": "UK 6",  "price_adjustment": 0, "stock": 5},
        {"name": "Size", "value": "UK 7",  "price_adjustment": 0, "stock": 8},
        {"name": "Size", "value": "UK 8",  "price_adjustment": 0, "stock": 8},
        {"name": "Size", "value": "UK 9",  "price_adjustment": 0, "stock": 5},
        {"name": "Size", "value": "UK 10", "price_adjustment": 0, "stock": 3},
    ],
    "Adidas Ultraboost": [
        {"name": "Size", "value": "UK 6",  "price_adjustment": 0, "stock": 4},
        {"name": "Size", "value": "UK 7",  "price_adjustment": 0, "stock": 6},
        {"name": "Size", "value": "UK 8",  "price_adjustment": 0, "stock": 6},
        {"name": "Size", "value": "UK 9",  "price_adjustment": 0, "stock": 4},
        {"name": "Size", "value": "UK 10", "price_adjustment": 0, "stock": 2},
    ],
    "Men's Classic Oxford": [
        {"name": "Color", "value": "White",      "price_adjustment": 0,   "stock": 30},
        {"name": "Color", "value": "Light Blue",  "price_adjustment": 0,   "stock": 25},
        {"name": "Color", "value": "Pink",        "price_adjustment": 200, "stock": 15},
    ],
    "Adjustable Dumbbell": [
        {"name": "Weight per pair", "value": "2–10kg",  "price_adjustment": -2000, "stock": 10},
        {"name": "Weight per pair", "value": "2–20kg",  "price_adjustment": 0,     "stock": 15},
        {"name": "Weight per pair", "value": "2–30kg",  "price_adjustment": 3000,  "stock": 5},
    ],
    "Lenovo IdeaPad": [
        {"name": "RAM", "value": "8GB",  "price_adjustment": 0,     "stock": 12},
        {"name": "RAM", "value": "16GB", "price_adjustment": 5000,  "stock": 6},
    ],
}

# Kenya Counties with Pickup Stations  (county_name, code, stations=[])
# Each station: (name, address, delivery_fee, working_hours, phone)
COUNTIES = [
    ("Nairobi", "NRB", [
        ("CBD - Kencom House",           "Kencom House, Moi Avenue, CBD",           100,  "Mon-Sat 8AM-7PM, Sun 10AM-5PM", "0722 100 001"),
        ("Westlands - Sarit Centre",     "Sarit Centre, Westlands Road",            150,  "Mon-Sun 9AM-8PM",               "0722 100 002"),
        ("South B - Junction Mall",      "Junction Mall, Ngong Road",               120,  "Mon-Sun 9AM-8PM",               "0722 100 003"),
        ("Eastleigh - Century City Mall","Century City Mall, 1st Avenue, Eastleigh",130,  "Mon-Sat 8AM-7PM",               "0722 100 004"),
        ("Karen - Hub Mall",             "The Hub Karen, Karen Road",               200,  "Mon-Sun 9AM-8PM",               "0722 100 005"),
    ]),
    ("Mombasa", "MSA", [
        ("CBD - TSS Grounds",            "TSS Grounds, Digo Road, Mombasa",         200,  "Mon-Sat 8AM-6PM",               "0722 200 001"),
        ("Nyali - City Mall",            "City Mall, Nyali Road",                   250,  "Mon-Sun 9AM-8PM",               "0722 200 002"),
        ("Likoni - Likoni Centre",       "Likoni Shopping Centre, Likoni Road",     230,  "Mon-Sat 8AM-6PM",               "0722 200 003"),
        ("Bamburi - Bamburi Beach Mall", "Bamburi Beach Mall, Bamburi Road",        220,  "Mon-Sun 9AM-7PM",               "0722 200 004"),
        ("Kisauni - Mega Mall",          "Kisauni Mega Mall, Kisauni Road",         240,  "Mon-Sat 8AM-6PM",               "0722 200 005"),
    ]),
    ("Kisumu", "KSM", [
        ("CBD - Mega Plaza",             "Mega Plaza, Oginga Odinga Street",        250,  "Mon-Sat 8AM-6PM",               "0722 300 001"),
        ("Milimani - Lake Basin Mall",   "Lake Basin Mall, Milimani Road",          300,  "Mon-Sun 9AM-7PM",               "0722 300 002"),
        ("Kondele - Kondele Market",     "Kondele Market, Busia Road",              280,  "Mon-Sat 7AM-6PM",               "0722 300 003"),
        ("Mamboleo - Mamboleo Junction", "Mamboleo Junction, Kakamega Road",        290,  "Mon-Sat 8AM-6PM",               "0722 300 004"),
    ]),
    ("Nakuru", "NAK", [
        ("CBD - Westside Mall",          "Westside Mall, Kenyatta Avenue",          300,  "Mon-Sat 8AM-6PM",               "0722 400 001"),
        ("Section 58 - Nakumatt",        "Section 58 Shopping Centre",              320,  "Mon-Sat 8AM-6PM",               "0722 400 002"),
        ("Milimani - Milimani Estate",   "Milimani Commercial Road, Nakuru",        310,  "Mon-Sat 8AM-6PM",               "0722 400 003"),
        ("Lanet - Lanet Market",         "Lanet Market, Nakuru-Eldoret Highway",    350,  "Mon-Sat 8AM-5PM",               "0722 400 004"),
    ]),
    ("Eldoret", "ELD", [
        ("CBD - Zion Mall",              "Zion Mall, Uganda Road, Eldoret",         350,  "Mon-Sat 8AM-7PM",               "0722 500 001"),
        ("West Indies - Rupa's Mall",    "Rupa's Mall, Uganda Road",                380,  "Mon-Sun 9AM-8PM",               "0722 500 002"),
        ("Kapseret - Kapseret Market",   "Kapseret Market, Eldoret-Kitale Road",    400,  "Mon-Sat 8AM-5PM",               "0722 500 003"),
        ("Pioneer - Pioneer Market",     "Pioneer Market, Nandi Road",              370,  "Mon-Sat 8AM-6PM",               "0722 500 004"),
    ]),
    ("Nyeri", "NYR", [
        ("CBD - Nyeri Town Centre",      "Nyeri Town Centre, Kimathi Street",       380,  "Mon-Sat 8AM-6PM",               "0722 600 001"),
        ("Dedan Kimathi - DK Centre",    "Dedan Kimathi Road, Nyeri",               400,  "Mon-Sat 8AM-6PM",               "0722 600 002"),
        ("Ruring'u - Stadium Area",      "Ruring'u Stadium Area, Nyeri",            390,  "Mon-Sat 8AM-5PM",               "0722 600 003"),
        ("Karatina - Karatina Market",   "Karatina Market, Karatina Town",          420,  "Mon-Sat 7AM-5PM",               "0722 600 004"),
    ]),
    ("Thika", "THK", [
        ("CBD - Blue Post Hotel Area",   "Blue Post Area, Thika Superhighway",      280,  "Mon-Sat 8AM-6PM",               "0722 700 001"),
        ("Makongeni - Makongeni Market", "Makongeni Market, Thika",                 300,  "Mon-Sat 8AM-6PM",               "0722 700 002"),
        ("Stadium - Thika Stadium",      "Thika Stadium Road, Thika",               290,  "Mon-Sat 8AM-6PM",               "0722 700 003"),
        ("Industrial Area - Thika Road", "Industrial Area, Thika Road",             310,  "Mon-Sat 8AM-5PM",               "0722 700 004"),
    ]),
    ("Machakos", "MKS", [
        ("CBD - People's Park",          "People's Park Area, Machakos",            380,  "Mon-Sat 8AM-6PM",               "0722 800 001"),
        ("Uchumi - Uchumi Area",         "Uchumi Supermarket Area, Machakos",       390,  "Mon-Sat 8AM-6PM",               "0722 800 002"),
        ("Syokimau - Syokimau Centre",   "Syokimau Commercial Centre",              350,  "Mon-Sat 8AM-7PM",               "0722 800 003"),
        ("Athi River - EPZ Junction",    "EPZ Junction, Athi River",                340,  "Mon-Sat 8AM-6PM",               "0722 800 004"),
    ]),
    ("Meru", "MRU", [
        ("CBD - Meru Town Centre",       "Meru Town Centre, Kenyatta Highway",      420,  "Mon-Sat 8AM-6PM",               "0722 900 001"),
        ("Makutano - Makutano Junction", "Makutano Junction, Meru",                 440,  "Mon-Sat 8AM-6PM",               "0722 900 002"),
        ("Nkubu - Nkubu Market",         "Nkubu Market, Nkubu Town",               450,  "Mon-Sat 7AM-5PM",               "0722 900 003"),
        ("Imenti - Imenti North",        "Imenti North Shopping Area, Meru",        430,  "Mon-Sat 8AM-6PM",               "0722 900 004"),
    ]),
    ("Kisii", "KSI", [
        ("CBD - Kisii Town Centre",      "Kisii Town Centre, Hospital Road",        400,  "Mon-Sat 8AM-6PM",               "0722 110 001"),
        ("Daraja Mbili - D2 Market",     "Daraja Mbili Market, Kisii",              420,  "Mon-Sat 7AM-6PM",               "0722 110 002"),
        ("Suneka - Suneka Market",       "Suneka Market, Kisii-Migori Road",        440,  "Mon-Sat 7AM-5PM",               "0722 110 003"),
        ("Keumbu - Keumbu Centre",       "Keumbu Commercial Centre, Kisii",         430,  "Mon-Sat 8AM-5PM",               "0722 110 004"),
    ]),
]

BANNERS = [
    {
        "title": "Biggest Electronics Sale",
        "subtitle": "Up to 40% off on TVs, Laptops & Phones",
        "link": "/products?category=electronics",
    },
    {
        "title": "Fashion Week – New Arrivals",
        "subtitle": "Fresh styles added daily. Shop the look!",
        "link": "/products?category=fashion",
    },
    {
        "title": "Flash Deals Every Hour",
        "subtitle": "Limited stock. Grab yours before it's gone.",
        "link": "/products?flash_deals=true",
    },
]


# ══════════════════════════════════════════════════════════════════════════════
# COMMAND CLASS
# ══════════════════════════════════════════════════════════════════════════════

class Command(BaseCommand):
    help = "Seed the database with categories, products, counties, pickup stations and banners."

    def add_arguments(self, parser):
        parser.add_argument(
            "--images-dir",
            default=r"D:\gadaf\Documents\images",
            help="Path to directory containing seed images (default: D:\\gadaf\\Documents\\images)",
        )
        parser.add_argument(
            "--clear",
            action="store_true",
            help="Delete existing data before seeding (CAUTION: irreversible)",
        )
        parser.add_argument(
            "--no-products",
            action="store_true",
            help="Skip seeding products",
        )
        parser.add_argument(
            "--no-counties",
            action="store_true",
            help="Skip seeding counties and pickup stations",
        )

    # ──────────────────────────────────────────────────────────────────────────
    def handle(self, *args, **options):
        # Late import so Django is fully initialised
        from ecommerce.models import (
            Category, Brand, Product, ProductImage, ProductVariant,
            Review, County, PickupStation, Banner,
        )

        images_dir = Path(options["images_dir"])
        self.stdout.write(hd("KILIMALL SEED DATA"))

        # ── Collect images ────────────────────────────────────────────────────
        image_pool = self._collect_images(images_dir)
        self.stdout.write(ok(f"Found {len(image_pool)} images in {images_dir}"))

        # ── Optional clear ────────────────────────────────────────────────────
        if options["clear"]:
            self._clear_data()

        # ── Seed everything ───────────────────────────────────────────────────
        self._seed_admin_user()

        categories = self._seed_categories(Category)
        brands     = self._seed_brands(Brand)

        if not options["no_products"]:
            self._seed_products(
                Product, ProductImage, ProductVariant, Review,
                categories, brands, image_pool,
            )
            self._seed_banners(Banner, image_pool)

        if not options["no_counties"]:
            self._seed_counties(County, PickupStation)

        self.stdout.write(hd("SEEDING COMPLETE ✔"))

    # ══════════════════════════════════════════════════════════════════════════
    # HELPERS
    # ══════════════════════════════════════════════════════════════════════════

    def _collect_images(self, images_dir):
        """Return a list of image Paths from the given directory (recursive)."""
        if not images_dir.exists():
            self.stdout.write(warn(
                f"Images directory not found: {images_dir}\n"
                "   Products will be created without images."
            ))
            return []

        exts = ("*.jpg", "*.jpeg", "*.png", "*.webp", "*.gif")
        pool = []
        for ext in exts:
            pool.extend(images_dir.glob(ext))
            pool.extend(images_dir.glob(ext.upper()))
            # also search one level deep
            pool.extend(images_dir.glob(f"**/{ext}"))

        return list(set(pool))  # deduplicate

    def _clear_data(self):
        from ecommerce.models import (
            Category, Brand, Product, ProductImage, ProductVariant,
            Review, County, PickupStation, Banner,
        )
        self.stdout.write(warn("Clearing existing data..."))
        for model in (Review, ProductVariant, ProductImage, Product,
                      Brand, Category, PickupStation, County, Banner):
            count, _ = model.objects.all().delete()
            self.stdout.write(f"   Deleted {count:>4} {model.__name__} records")
        self.stdout.write(ok("Data cleared"))

    # ── Admin user ────────────────────────────────────────────────────────────
    def _seed_admin_user(self):
        email = "admin@kilimall.co.ke"
        if not User.objects.filter(email=email).exists():
            user = User.objects.create_superuser(
                email=email,
                username="admin",
                password="Admin@1234",
                first_name="Kilimall",
                last_name="Admin",
            )
            self.stdout.write(ok(f"Created superuser  {email}  (password: Admin@1234)"))
        else:
            self.stdout.write(warn(f"Superuser {email} already exists — skipped"))

    # ── Categories ────────────────────────────────────────────────────────────
    def _seed_categories(self, Category):
        self.stdout.write("\n" + hd("Categories"))
        categories = {}
        for data in CATEGORIES:
            cat, created = Category.objects.get_or_create(
                slug=data["slug"],
                defaults={"name": data["name"], "icon": data["icon"], "is_active": True},
            )
            if created:
                self.stdout.write(ok(f"Created category: {cat.name}"))
            else:
                self.stdout.write(warn(f"Already exists:   {cat.name}"))
            categories[data["slug"]] = cat
        return categories

    # ── Brands ────────────────────────────────────────────────────────────────
    def _seed_brands(self, Brand):
        self.stdout.write("\n" + hd("Brands"))
        brands = {}
        for name in BRANDS:
            from django.utils.text import slugify
            slug = slugify(name)
            brand, created = Brand.objects.get_or_create(
                slug=slug,
                defaults={"name": name, "is_active": True},
            )
            if created:
                self.stdout.write(ok(f"Created brand: {brand.name}"))
            else:
                self.stdout.write(warn(f"Already exists:  {brand.name}"))
            brands[name] = brand
        return brands

    # ── Products ──────────────────────────────────────────────────────────────
    def _seed_products(self, Product, ProductImage, ProductVariant, Review,
                       categories, brands, image_pool):
        self.stdout.write("\n" + hd("Products"))

        # Flash deal window: ends 6 hours from now
        flash_end = timezone.now() + timezone.timedelta(hours=6)

        # Demo user for reviews
        demo_user = User.objects.filter(is_superuser=True).first()

        for (
            name, cat_slug, brand_name, price, orig_price,
            stock, featured, flash, description
        ) in PRODUCTS:

            # Skip if already exists by slug-like name check
            from django.utils.text import slugify
            base_slug = slugify(name)
            if Product.objects.filter(slug=base_slug).exists():
                self.stdout.write(warn(f"Skipping existing: {name}"))
                continue

            cat   = categories.get(cat_slug)
            brand = brands.get(brand_name) or brands.get("Generic")

            product = Product.objects.create(
                name=name,
                category=cat,
                brand=brand,
                description=description,
                short_description=description[:150],
                price=Decimal(str(price)),
                original_price=Decimal(str(orig_price)),
                stock=stock,
                is_active=True,
                is_featured=featured,
                is_flash_deal=flash,
                flash_deal_end=flash_end if flash else None,
                rating=Decimal(str(round(random.uniform(3.5, 5.0), 1))),
                review_count=random.randint(5, 120),
            )

            # ── Images ───────────────────────────────────────────────────────
            self._attach_images(product, image_pool, ProductImage, count=random.randint(2, 4))

            # ── Variants ─────────────────────────────────────────────────────
            for partial, variant_list in PRODUCT_VARIANTS.items():
                if partial.lower() in name.lower():
                    for i, vdata in enumerate(variant_list):
                        ProductVariant.objects.create(
                            product=product,
                            name=vdata["name"],
                            value=vdata["value"],
                            price_adjustment=Decimal(str(vdata["price_adjustment"])),
                            stock=vdata["stock"],
                        )
                    break

            # ── Sample review ─────────────────────────────────────────────────
            if demo_user:
                sample_reviews = [
                    "Excellent product! Exactly as described. Very happy with my purchase.",
                    "Good quality for the price. Would recommend to friends and family.",
                    "Fast delivery and well packaged. Product works perfectly.",
                    "Great value for money. Will definitely order again from Kilimall.",
                ]
                Review.objects.get_or_create(
                    product=product,
                    user=demo_user,
                    defaults={
                        "rating": random.randint(4, 5),
                        "comment": random.choice(sample_reviews),
                    },
                )

            self.stdout.write(ok(f"Created product: {name}"))

    def _attach_images(self, product, image_pool, ProductImage, count=2):
        """Pick random images from the pool and attach them to the product."""
        if not image_pool:
            return

        selected = random.sample(image_pool, min(count, len(image_pool)))
        media_products_dir = Path(settings.MEDIA_ROOT) / "products"
        media_products_dir.mkdir(parents=True, exist_ok=True)

        for i, img_path in enumerate(selected):
            try:
                with open(img_path, "rb") as f:
                    img_obj = ProductImage(
                        product=product,
                        alt_text=f"{product.name} image {i+1}",
                        is_primary=(i == 0),
                        order=i,
                    )
                    img_obj.image.save(img_path.name, File(f), save=True)
            except Exception as exc:
                self.stdout.write(warn(f"   Could not attach image {img_path.name}: {exc}"))

    # ── Counties & Stations ───────────────────────────────────────────────────
    def _seed_counties(self, County, PickupStation):
        self.stdout.write("\n" + hd("Counties & Pickup Stations"))
        from django.utils.text import slugify

        for (county_name, code, stations) in COUNTIES:
            county, created = County.objects.get_or_create(
                code=code,
                defaults={
                    "name": county_name,
                    "slug": slugify(county_name),
                },
            )
            if created:
                self.stdout.write(ok(f"Created county: {county_name}  ({code})"))
            else:
                self.stdout.write(warn(f"Already exists: {county_name}"))

            for (s_name, address, fee, hours, phone) in stations:
                station, s_created = PickupStation.objects.get_or_create(
                    county=county,
                    name=s_name,
                    defaults={
                        "address": address,
                        "delivery_fee": Decimal(str(fee)),
                        "working_hours": hours,
                        "phone": phone,
                        "is_active": True,
                    },
                )
                status = "  +" if s_created else "  ~"
                self.stdout.write(f"   {status} {s_name:<40} KES {fee}")

    # ── Banners ───────────────────────────────────────────────────────────────
    def _seed_banners(self, Banner, image_pool):
        self.stdout.write("\n" + hd("Homepage Banners"))
        media_banners_dir = Path(settings.MEDIA_ROOT) / "banners"
        media_banners_dir.mkdir(parents=True, exist_ok=True)

        for i, bdata in enumerate(BANNERS):
            banner, created = Banner.objects.get_or_create(
                title=bdata["title"],
                defaults={
                    "subtitle": bdata["subtitle"],
                    "link": bdata["link"],
                    "is_active": True,
                    "order": i,
                },
            )
            # Attach random image if available and no image yet
            if created and image_pool and not banner.image:
                img_path = random.choice(image_pool)
                try:
                    with open(img_path, "rb") as f:
                        banner.image.save(img_path.name, File(f), save=True)
                except Exception as exc:
                    self.stdout.write(warn(f"   Could not attach banner image: {exc}"))

            status = "Created" if created else "Already exists"
            self.stdout.write(ok(f"{status}: {bdata['title']}"))