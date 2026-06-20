# NexusHub

**🎮 Premium Game Assets & Mods Marketplace**

Buy once, download forever. Instant delivery powered by Razorpay.

## Stack

- **Frontend**: Plain HTML, CSS, Vanilla JS
- **Backend**: Vercel Serverless Functions (Node.js)
- **Database**: Google Sheets (via Google Sheets API)
- **Payments**: Razorpay
- **Auth**: JWT + bcryptjs

## Pages

| Page | File | Access |
|------|------|--------|
| Home | `index.html` | Public |
| Store | `store.html` | Logged in |
| Login | `login.html` | Public |
| Sign Up | `signup.html` | Public |
| My Downloads | `downloads.html` | Logged in |
| Support | `support.html` | Public |
| **Admin Panel** | **`admin.html`** | **Admin only** |

## API Routes

| Route | Method | Description |
|-------|--------|-------------|
| `/api/auth` | POST | Login / Sign Up |
| `/api/products` | GET | List active products |
| `/api/create-order` | POST | Create Razorpay order |
| `/api/verify-payment` | POST | Verify payment & record order |
| `/api/downloads` | GET | Get user's purchased downloads |
| `/api/admin` | GET | Stats, products, users, orders (admin) |
| `/api/admin` | POST | Add new product (admin) |
| `/api/admin` | PUT | Update existing product (admin) |
| `/api/admin` | DELETE | Delete product row (admin) |

## Admin Panel

Access `admin.html` — only visible to users with `role = admin` in the Users sheet.

**Features:**
- 📊 Dashboard with revenue, user count, order count, recent orders
- 📦 Products — add, edit, delete, toggle active/hidden
- 👥 Users — view all registered users and roles
- 🛒 Orders — full order history with status badges

**To make yourself admin:** In your Google Sheet → Users tab, find your row and set column F to `admin`.

After that, the ⚙️ Admin link appears in the navbar when you're logged in.

## Deploy on Vercel

### 1. Set up Google Sheets

Create a Google Sheet with these exact tabs and columns:

**Users** tab (columns A–F):
```
user_id | email | password_hash | full_name | created_at | role
```

**Products** tab (columns A–G):
```
product_id | name | description | price | file_link | image | active
```
Set column G (`active`) to `TRUE` to show a product in the store.

**Orders** tab (columns A–G):
```
order_id | email | product_id | amount | payment_id | status | created_at
```

### 2. Set up Google Service Account

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a project → Enable **Google Sheets API**
3. Create a **Service Account** → Download JSON key
4. Share your Google Sheet with the service account email (Editor access)

### 3. Configure Vercel Environment Variables

In Vercel → **Settings** → **Environment Variables**, add:

| Variable | Value |
|----------|-------|
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | Service account email from JSON key |
| `GOOGLE_PRIVATE_KEY` | Private key from JSON (keep `\n` for newlines) |
| `SPREADSHEET_ID` | ID from your Google Sheet URL |
| `JWT_SECRET` | Any random 32+ character string |
| `RAZORPAY_KEY_ID` | Your Razorpay Key ID |
| `RAZORPAY_KEY_SECRET` | Your Razorpay Key Secret |

### 4. Configure Support Form

In `support.html`, replace `YOUR_FORM_ID` with your actual Google Form embed ID.

### 5. Deploy

Connect this GitHub repo to Vercel — it auto-deploys on every push.

## Security Notes

- JWT tokens stored in `localStorage`
- Passwords hashed with bcrypt (10 rounds)
- Razorpay signature verified server-side before recording any order
- Google Sheets private key stored only in Vercel env vars, never in code
