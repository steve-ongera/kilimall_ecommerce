# 🛒 Kilimall Clone — Full-Stack E-Commerce Platform

A full-featured Kenyan e-commerce platform built with **Django REST Framework** (backend) + **React + Vite** (frontend), featuring **M-Pesa STK Push** payments and a dynamic **county/pickup-station** delivery system — styled to match Kilimall's exact UI.

---

## 📁 Project Structure

```
kilimall/
├── backend/                        # Django REST API
│   ├── kilimall/                   # Django project package
│   │   ├── settings.py             # ← Full settings (see below)
│   │   ├── urls.py                 # ← Main URL config
│   │   └── wsgi.py
│   ├── store/                      # Main Django app
│   │   ├── models.py               # All database models
│   │   ├── serializers.py          # DRF serializers
│   │   ├── views.py                # ViewSets + APIViews
│   │   ├── urls.py                 # App-level URL patterns
│   │   └── admin.py                # Django admin config
│   ├── media/                      # Uploaded files (gitignored)
│   ├── logs/                       # App logs (gitignored)
│   ├── requirements.txt
│   └── .env.example
│
├── frontend/                       # React + Vite SPA
│   ├── public/
│   ├── src/
│   │   ├── api/
│   │   │   └── index.js            # Axios client + all API calls
│   │   ├── context/
│   │   │   ├── AuthContext.jsx     # JWT auth state
│   │   │   └── CartContext.jsx     # Cart state (session/user)
│   │   ├── components/
│   │   │   ├── layout/
│   │   │   │   ├── Header.jsx      # Topbar + search + nav actions
│   │   │   │   └── Layout.jsx      # Navbar + Footer + page wrapper
│   │   │   ├── product/
│   │   │   │   └── ProductCard.jsx # Product card (grid item)
│   │   │   └── common/
│   │   │       └── index.jsx       # Toast, Spinner, Breadcrumb, Stars,
│   │   │                           # Countdown, Pagination
│   │   ├── pages/
│   │   │   ├── HomePage.jsx        # Hero slider, Flash deals, Categories
│   │   │   ├── ProductsPage.jsx    # Filterable product listing
│   │   │   ├── ProductDetailPage.jsx # Gallery, variants, reviews
│   │   │   ├── CartPage.jsx        # Cart with qty controls
│   │   │   ├── CheckoutPage.jsx    # County/station picker + M-Pesa
│   │   │   ├── AuthPages.jsx       # Login + Register
│   │   │   └── OrderPages.jsx      # Order list + Order detail
│   │   ├── App.jsx                 # React Router routes
│   │   ├── main.jsx                # Entry point
│   │   └── index.css               # Full Kilimall-style CSS
│   ├── index.html                  # Bootstrap Icons + Roboto font
│   ├── vite.config.js
│   ├── package.json
│   └── .env.example
│
└── README.md
```

---

## 🗄️ Database Models

| Model | Key Fields | Purpose |
|---|---|---|
| `User` | email, phone, avatar | Custom auth user |
| `Category` | name, **slug**, parent, icon | Nested categories w/ slugs |
| `Brand` | name, **slug**, logo | Product brands |
| `Product` | name, **slug**, price, original_price, stock, rating | Core product; auto-slug |
| `ProductImage` | product, image, is_primary | Multiple images per product |
| `ProductVariant` | product, name, value, price_adjustment | Color/Size variants |
| `Review` | product, user, rating, comment | One review per user/product |
| `County` | name, **slug**, code | All 47 Kenyan counties |
| `PickupStation` | county, name, **slug**, address, **delivery_fee** | 4-5 stations per county |
| `Cart` | user / session_key | Guest + authenticated carts |
| `CartItem` | cart, product, variant, quantity | Line items |
| `Order` | order_number, user, pickup_station, status, total | Full order with snapshots |
| `OrderItem` | order, product_name, unit_price (snapshot) | Immutable order lines |
| `MpesaTransaction` | checkout_request_id, status, mpesa_receipt | M-Pesa payment tracking |
| `Wishlist` | user, product | Saved items |
| `Banner` | title, image, link | Homepage hero slides |

---

## 🔌 API Endpoints

### Auth
| Method | URL | Description |
|---|---|---|
| POST | `/api/v1/auth/register/` | Register with JWT response |
| POST | `/api/v1/auth/login/` | Login with JWT response |
| POST | `/api/v1/auth/token/refresh/` | Refresh access token |
| GET/PATCH | `/api/v1/auth/profile/` | Get/update user profile |

### Catalog (slug-based for SEO)
| Method | URL | Description |
|---|---|---|
| GET | `/api/v1/categories/` | All top-level categories |
| GET | `/api/v1/categories/{slug}/` | Category detail |
| GET | `/api/v1/brands/` | All brands |
| GET | `/api/v1/products/` | Products (filter, search, sort, paginate) |
| GET | `/api/v1/products/{slug}/` | Product detail (increments views) |
| GET | `/api/v1/products/featured/` | Featured products |
| GET | `/api/v1/products/flash_deals/` | Active flash deals |
| GET | `/api/v1/products/new_arrivals/` | Latest products |
| GET/POST | `/api/v1/products/{slug}/reviews/` | Get/add reviews |

### Delivery
| Method | URL | Description |
|---|---|---|
| GET | `/api/v1/counties/` | All counties with stations |
| GET | `/api/v1/counties/{slug}/` | County detail |
| GET | `/api/v1/pickup-stations/?county__slug=nairobi` | Stations by county |

### Cart
| Method | URL | Description |
|---|---|---|
| GET | `/api/v1/cart/` | Get cart (session/user) |
| POST | `/api/v1/cart/` | Add item |
| PATCH | `/api/v1/cart/items/{id}/` | Update qty |
| DELETE | `/api/v1/cart/items/{id}/` | Remove item |

### Orders
| Method | URL | Description |
|---|---|---|
| GET | `/api/v1/orders/` | User orders |
| POST | `/api/v1/orders/` | Create order from cart |
| GET | `/api/v1/orders/{id}/` | Order detail |

### M-Pesa
| Method | URL | Description |
|---|---|---|
| POST | `/api/v1/mpesa/stk-push/` | Initiate STK push |
| POST | `/api/v1/mpesa/callback/` | Safaricom callback (webhook) |
| GET | `/api/v1/mpesa/status/{checkout_id}/` | Poll payment status |

---

## ⚙️ Backend Setup

### 1. Clone & Install
```bash
git clone <repo>
cd kilimall/backend

python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

pip install -r requirements.txt
```

### 2. Environment Variables
```bash
cp .env.example .env
# Edit .env with your values
```

### 3. Database
```bash
# Create PostgreSQL DB
createdb kilimall_db

# Run migrations
python manage.py makemigrations
python manage.py migrate

# Create superuser
python manage.py createsuperuser

# Create logs directory
mkdir -p logs
```

### 4. Run
```bash
python manage.py runserver
# API: http://localhost:8000/api/v1/
# Admin: http://localhost:8000/admin/
```

---

## 🎨 Frontend Setup

### 1. Install
```bash
cd kilimall/frontend
npm install
```

### 2. Environment
```bash
cp .env.example .env
# VITE_API_URL=http://localhost:8000/api/v1
```

### 3. Run
```bash
npm run dev
# http://localhost:3000
```

### 4. Build for Production
```bash
npm run build
# Output in dist/
```

---

## 💳 M-Pesa Integration

### How It Works
1. User clicks **Place Order & Pay** → order is created in DB
2. M-Pesa STK push is sent to user's phone via Daraja API
3. User enters PIN on their phone
4. Safaricom sends callback to `/api/v1/mpesa/callback/`
5. Frontend polls `/api/v1/mpesa/status/{id}/` every 3 seconds
6. On success → order status updates to `confirmed`, payment to `paid`

### Daraja Setup
1. Register at [developer.safaricom.co.ke](https://developer.safaricom.co.ke)
2. Create an app → get Consumer Key & Consumer Secret
3. Enable **Lipa na M-Pesa Online** → get Passkey
4. Set callback URL (must be HTTPS in production — use [ngrok](https://ngrok.com) for local dev)

```bash
# Local development: expose port 8000
ngrok http 8000
# Use the HTTPS URL as MPESA_CALLBACK_URL
```

---

## 🏪 Delivery / Pickup Stations

Each county has 4-5 pickup stations with individual delivery fees:

```python
# Example data structure
County: "Nairobi" (slug: "nairobi")
  ├── Station: "CBD - Kencom House"     → KES 100
  ├── Station: "Westlands - Sarit Centre" → KES 150
  ├── Station: "South B - Junction Mall"  → KES 120
  ├── Station: "Eastleigh - Century City" → KES 130
  └── Station: "Karen - Hub Mall"        → KES 200

County: "Mombasa" (slug: "mombasa")
  ├── Station: "CBD - TSS Grounds"       → KES 200
  ├── Station: "Nyali - City Mall"       → KES 250
  └── ...
```

Populate via Django admin or management commands.

---

## 🖥️ Frontend Pages

| Page | Route | Features |
|---|---|---|
| Home | `/` | Hero slider, flash deals countdown, categories, featured products |
| Products | `/products` | Sidebar filters (category, price, deals), search, sort, pagination |
| Product Detail | `/product/{slug}` | Image gallery, variants, qty control, add to cart, reviews |
| Cart | `/cart` | Item management, qty controls, summary |
| Checkout | `/checkout` | County → station picker, customer info, M-Pesa payment |
| Login | `/login` | JWT auth, remember redirect |
| Register | `/register` | Full registration form |
| Orders | `/orders` | Order history list |
| Order Detail | `/orders/{id}` | Status tracker, items, pickup info |

---

## 🔑 Key Technical Decisions

### SEO via Slugs
All user-facing resources use URL slugs for SEO:
- `/product/samsung-galaxy-s24-ultra-256gb` instead of `/product/123`
- Slugs auto-generated from names, with collision handling (appends `-1`, `-2`, etc.)

### Cart Strategy
- **Guest users**: cart tied to `session_key`
- **Logged-in users**: cart tied to `User` via `OneToOneField`
- Session carts can be merged on login (extend `LoginView`)

### JWT Authentication
- Access token: 1 day lifetime
- Refresh token: 30 days (rotates on use)
- Stored in `localStorage`; auto-refresh on 401

### M-Pesa Phone Normalization
Input `0712345678` → stored/sent as `254712345678` (Safaricom format)

---

## 🚀 Production Deployment

### Django (Ubuntu + Gunicorn + Nginx)
```bash
# Install
pip install gunicorn whitenoise

# Update settings
DEBUG=False
ALLOWED_HOSTS=yourdomain.com

# Collect static
python manage.py collectstatic

# Run
gunicorn kilimall.wsgi:application --bind 0.0.0.0:8000 --workers 4
```

### React (Nginx)
```bash
npm run build
# Serve dist/ with Nginx
# Point all routes to index.html for SPA routing
```

### Nginx Config Snippet
```nginx
server {
    listen 80;
    server_name yourdomain.com;

    # React SPA
    location / {
        root /var/www/kilimall/dist;
        try_files $uri $uri/ /index.html;
    }

    # Django API
    location /api/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
    }

    location /media/ {
        root /var/www/kilimall/backend;
    }
}
```

---

## 📦 Tech Stack

| Layer | Technology |
|---|---|
| Backend | Django 4.2, Django REST Framework 3.14 |
| Auth | JWT (djangorestframework-simplejwt) |
| Database | PostgreSQL |
| Payments | Safaricom M-Pesa Daraja API (STK Push) |
| Frontend | React 18, React Router v6, Vite 5 |
| HTTP Client | Axios |
| CSS | Custom (Kilimall-style) + Bootstrap Icons |
| Images | Pillow (Django), PIL |
| Prod Server | Gunicorn + Nginx |

---

## 📝 License

MIT License — feel free to use and adapt for your project.