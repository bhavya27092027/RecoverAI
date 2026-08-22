# RecoverAI

**Autonomous AI Revenue Recovery Platform**

RecoverAI is a full-stack, production-grade fintech SaaS platform that autonomously analyzes failed customer payments, predicts recovery likelihood with explainable machine learning heuristics, and executes automated recovery workflows to salvage dropped revenue.

## 🌐 Live Demo

**Live Application:** https://recoverai-revenue.netlify.app

**Backend API:** https://recoverai-production-c6d5.up.railway.app

> ⚠️ RecoverAI currently uses Razorpay TEST MODE. No real money is charged or transferred.

---

## 📌 Problem Statement

In modern SaaS, e-commerce, and subscription businesses, **5%–15% of all digital transactions fail** due to temporary bank timeouts, card issuer rejections, insufficient balances, and customer checkout abandonment. 

Traditional payment setups treat all failures identically:
- **Blind instant retries** overwhelm banking gateways and result in high failure penalties.
- **Manual customer support follow-ups** are slow, expensive, and fail to capture urgent recovery opportunities.
- **Lack of failure intelligence** leaves businesses blind to rail-specific checkout friction and churn patterns.

---

## 💡 The RecoverAI Solution

RecoverAI provides an **Autonomous Revenue Recovery Agent** that acts as an intelligent layer between merchant payment gateways and customers:

1. **Instant Failure Ingestion & Classification**: Captures failure events in real-time and categorizes drops across 6 distinct failure categories (`BANK_TIMEOUT`, `INSUFFICIENT_BALANCE`, `CARD_DECLINED`, `AUTHENTICATION_FAILURE`, `TRANSACTION_LIMIT`, `CUSTOMER_ABANDONMENT`).
2. **Deterministic AI Recovery Intelligence**: Evaluates transaction context, customer lifetime spend, payment rail reliability, historical retry patterns, and merchant baseline scores to compute an explainable recovery probability (0%–100%) and expected recoverable revenue.
3. **Autonomous Execution Policy**: Automatically executes simulated recovery strategies for high-probability, high-confidence candidates (`≥80% probability` with `HIGH confidence`), while routing ambiguous drops to human merchant oversight.
4. **Comprehensive Real-Time Analytics**: Visualizes lifecycle recovery funnels, time-series revenue trends, payment rail efficiency, and customer behavioral segments computed directly from MongoDB database records.

---

## 🏗️ Architecture

```
   ┌─────────────────────────────────────────────────────────┐
   │            React + TypeScript + Vite Frontend           │
   │  (Tailwind CSS, Lucide Icons, Dark Fintech Aesthetics)  │
   └────────────────────────────┬────────────────────────────┘
                                │  REST APIs (HTTP-Only JWT Cookies)
                                ▼
   ┌─────────────────────────────────────────────────────────┐
   │             Express + TypeScript Backend API            │
   │       (Zod Validation, Security Headers, Middleware)    │
   └─────────────┬─────────────────────────────┬─────────────┘
                 │                             │
                 ▼                             ▼
   ┌───────────────────────────┐ ┌───────────────────────────┐
   │  AI Recovery Intelligence │ │  Authentication & Logic   │
   │  (Heuristics & Reasoning) │ │  (Merchant-Scoped Models) │
   └─────────────┬─────────────┘ └─────────────┬─────────────┘
                 │                             │
                 ▼                             ▼
   ┌───────────────────────────┐ ┌───────────────────────────┐
   │  Recovery Execution Agent │ │     MongoDB + Mongoose    │
   │ (Autonomous / Human Flow) │ │ (Persistent Compound Idx) │
   └─────────────┬─────────────┘ └───────────────────────────┘
                 │
                 ▼
   ┌───────────────────────────┐
   │    DemoPaymentProvider    │
   │ (Simulated State Machine) │
   └───────────────────────────┘
```

> **Note on Payment Processing**: RecoverAI supports Razorpay TEST MODE
> for payment order creation, checkout, signature verification, and
> webhook processing. No real money is charged or transferred.
>
> RecoverAI also retains the `DemoPaymentProvider` for deterministic
> simulation and autonomous recovery demonstrations.

---

## 🌟 Key Features

### 1. AI Recovery Intelligence Engine
- **Deterministic Multi-Factor Scoring**: Evaluates 5 weighted dimensions:
  - *Failure Reason Elasticity* (35–80 pts)
  - *Customer Payment History & LTV* (0–15 pts)
  - *Payment Method Reliability* (0–5 pts)
  - *Merchant Recovery Baseline* (0–5 pts)
  - *Repeat Failure Penalty* (-15 to -30 pts)
- **Confidence Tiers**: `HIGH`, `MEDIUM`, `LOW` based on verified customer transaction history.
- **Optimal Strategy Selection**: Recommends `RETRY_NOW`, `WAIT_AND_RETRY`, `SEND_PAYMENT_LINK`, `SUGGEST_ALTERNATE_METHOD`, or `STOP_RECOVERY`.
- **Explainable Reasoning**: Contextual human-readable explanations detailing *why* a strategy was chosen.

### 2. Autonomous Recovery Agent
- **Autonomous vs Approval Policy**: Candidates with `≥80% probability` and `HIGH confidence` are marked **Auto Ready** for zero-touch execution; other drops require merchant confirmation.
- **Strict Idempotency**: Prevents double-recovery on already salvaged transactions.
- **Audit Event Trail**: Immutable, chronological `RecoveryEvent` audit stream for full compliance and visibility.
- **Multi-Step Execution Modal**: Interactive 5-step stepper guiding the operator through evaluation, rule matching, dispatch, simulation, and settlement.

### 3. Financial Analytics & Lifecycle Funnel (`/analytics`)
- **Top KPI Cards**: Total Payment Volume, Successful Revenue, Revenue at Risk, Recovered Revenue, Recovery Rate, Recovery Success Rate, and Net Recovery Lift.
- **6-Stage Lifecycle Funnel**: `Total Transactions` → `Failed Payments` → `AI Analyzed` → `Recovery Opportunities` → `Recovery Attempts` → `Recovered Revenue`.
- **Interactive Revenue Trends**: Multi-series area chart tracking successful, failed, and recovered revenue over `7D`, `30D`, `90D`, and `All Time` date ranges.
- **Rail & Failure Analysis**: Identifies dominant failure categories and highlights the "Best Performing Payment Rail".
- **Customer Recovery Segments**: 4-quadrant matrix classifying accounts into *High/Low Value × High/Low Recovery Potential*.

### 4. Predictive AI Insights (`/ai-insights`)
- Categorized by business impact (`Revenue Recoverable`, `Recovery Performance`, `Failure Patterns`, `Payment Rails`, `Customer Behavior`).
- Statistical confidence badges (`High confidence`, `Medium confidence`, `Limited data`) with actionable recommendations.

### 5. App Shell & Productivity Controls
- **Omnibar Global Search (`Ctrl+K`)**: Instant search across customers, transactions, and payment IDs scoped to the authenticated merchant.
- **Notification Center**: Real-time event popover with unread counter and dynamic alerts.
- **Simulation Mode Badge**: Visual status indicator in the header.
- **Demo Dataset Seeder**: One-click demo scenario generator populating 6 realistic customers, 18 transactions over 30 days, AI recovery scores, and simulated recovery attempts.

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS, Lucide Icons, React Router 6 |
| Backend | Node.js, Express, TypeScript, Zod, JWT, bcryptjs, Cookie-Parser |
| Database | MongoDB, Mongoose ODM |
| Payments | Razorpay TEST MODE, HMAC-SHA256 verification, Webhooks |
| Deployment | Netlify, Railway, MongoDB Atlas |
| Testing | Node test runner, TypeScript execution, custom assertions |

---

## 📂 Project Structure

```
RecoverAI/
├── client/                     # React + Vite Frontend Application
│   ├── src/
│   │   ├── api/                # Axios/Fetch API client wrappers
│   │   ├── components/         # Reusable UI, analytics, recovery, layout components
│   │   ├── context/            # AuthContext (state & session hydration)
│   │   ├── pages/              # Landing, Auth, Onboarding, Dashboard, Analytics, etc.
│   │   ├── types/              # Comprehensive TypeScript interfaces
│   │   ├── App.tsx             # Route definitions & protected routes
│   │   └── main.tsx            # Application entry point
│   ├── package.json
│   └── vite.config.ts
│
├── server/                     # Node.js + Express Backend Application
│   ├── src/
│   │   ├── ai/                 # Deterministic Recovery Engine & Insights Service
│   │   ├── config/             # MongoDB connection & fallback configuration
│   │   ├── controllers/        # REST route controllers
│   │   ├── middleware/         # Auth, validation (Zod), and error handlers
│   │   ├── models/             # Mongoose schemas (User, Merchant, Customer, Transaction, etc.)
│   │   ├── recovery/           # Autonomous Recovery Agent & policy configuration
│   │   ├── routes/             # Express API routes (/auth, /transactions, /analytics, etc.)
│   │   ├── scripts/            # Demo data seeder & local DB runner
│   │   ├── services/           # Analytics aggregations & payment providers
│   │   ├── tests/              # Phase 1-6 automated test suites & master QA audit
│   │   ├── utils/              # JWT helpers & formatting
│   │   └── server.ts           # Express server setup & middleware
│   ├── package.json
│   └── tsconfig.json
│
├── .env.example                # Root environment template
├── .gitignore                  # Git exclusion rules
├── package.json                # Root workspace scripts
└── README.md                   # Project documentation
```

---

## 🚀 Getting Started

### Prerequisites
- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher
- **MongoDB**: Local MongoDB instance (`mongodb://localhost:27017`) OR MongoDB Atlas cloud connection URI.

---

### 1. Clone & Install Dependencies

```bash
# Clone the repository
git clone <YOUR_REPOSITORY_URL>
cd RecoverAI

# Install all workspace dependencies (root, client, and server)
npm run install:all
```

Alternatively, install individually:
```bash
npm install
cd server && npm install
cd ../client && npm install
cd ..
```

---

### 2. Configure Environment Variables

Create `.env` in the `server` directory (or use `.env` in the root workspace):

```bash
cp server/.env.example server/.env
```

**`server/.env` configuration**:
```env
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:5173

# Persistent MongoDB Connection
MONGODB_URI=mongodb://localhost:27017/recoverai

# Security & Session Secrets
JWT_SECRET=replace_with_a_secure_random_jwt_secret_key_32_characters_minimum
```

---

### 3. Start MongoDB Database

Ensure your local MongoDB daemon is running, or start the integrated local runner:

```bash
npm run db:local
```

---

### 4. Run the Full-Stack Application

You can start both backend and frontend concurrently from the root directory:

```bash
npm run dev
```

Or start each service in separate terminals:

**Terminal 1 (Backend Server)**:
```bash
cd server
npm run dev
# Server running at http://localhost:5000
```

**Terminal 2 (Frontend Client)**:
```bash
cd client
npm run dev
# Frontend running at http://localhost:5173
```

Open your browser and navigate to **`http://localhost:5173`**.

---

## 🧪 Testing & Automated Verification

RecoverAI includes automated test suites covering Phases 1–6,
including Razorpay TEST MODE integration and live end-to-end verification.

All automated and live verification suites passed successfully.

### Coverage

- Phase 1: Authentication & Merchant Foundation
- Phase 2: Customers & Transactions
- Phase 3: AI Recovery Intelligence
- Phase 4: Autonomous Recovery Agent
- Phase 5: Analytics & AI Insights
- Phase 6: Razorpay TEST MODE Payments
- Master QA & End-to-End Verification

---

## 📡 API Overview

| Group | Method | Endpoint | Description |
|---|---|---|---|
| **Auth** | `POST` | `/api/auth/signup` | Register user & auto-create merchant |
| **Auth** | `POST` | `/api/auth/login` | Authenticate & issue HTTP-only cookie |
| **Auth** | `POST` | `/api/auth/logout` | Clear authentication cookie |
| **Auth** | `GET` | `/api/auth/me` | Hydrate active user & merchant session |
| **Merchant**| `POST` | `/api/merchant/onboarding` | Complete 5-step onboarding wizard |
| **Merchant**| `GET` | `/api/merchant/profile` | Get merchant details & enabled rails |
| **Customers**| `GET` | `/api/customers` | List merchant customers with stats |
| **Customers**| `POST` | `/api/customers` | Create a customer record |
| **Customers**| `GET` | `/api/customers/:id` | Get customer profile & recovery history |
| **Transactions** | `GET` | `/api/transactions` | Paginated, filterable, sortable transactions |
| **Transactions** | `POST` | `/api/transactions` | Create a new transaction |
| **Transactions** | `POST` | `/api/transactions/:id/process` | Simulate payment outcome (`SUCCESS`/`FAILED`) |
| **Transactions** | `POST` | `/api/transactions/:id/analyze` | Run AI Recovery Intelligence analysis |
| **Recovery** | `GET` | `/api/recovery/opportunities` | Priority Queue of salvage opportunities |
| **Recovery** | `POST` | `/api/recovery/:id/execute` | Execute recovery strategy (Autonomous/Manual) |
| **Recovery** | `GET` | `/api/recovery/:id` | Detailed recovery analysis & event stream |
| **Analytics** | `GET` | `/api/analytics/overview` | High-level financial KPIs & recovery lift |
| **Analytics** | `GET` | `/api/analytics/funnel` | 6-stage lifecycle recovery funnel |
| **Analytics** | `GET` | `/api/analytics/revenue-trends` | Time-series revenue trends (`7D`/`30D`/`90D`/`ALL`) |
| **Analytics** | `GET` | `/api/analytics/failure-breakdown` | Category loss breakdown & salvage rates |
| **Analytics** | `GET` | `/api/analytics/payment-methods` | Rail efficiency & best payment method |
| **Analytics** | `GET` | `/api/analytics/customer-segments`| 4-quadrant customer behavioral matrix |
| **Analytics** | `GET` | `/api/analytics/insights` | Prioritized AI financial recommendations |
| **Notifications** | `GET` | `/api/notifications` | Live event alerts & unread counter |
| **Search** | `GET` | `/api/search?q=...` | Omnibar search across customers and txs |
| **Demo** | `POST` | `/api/demo/seed` | Populate realistic demo dataset in MongoDB |

---

## 🔒 Security Practices

- **Strict Multi-Tenancy**: Every database query filters by `merchantId` extracted from verified JWT claims.
- **Secure Authentication**: JWTs are stored in `HttpOnly`, `SameSite=Lax`, cryptographically signed cookies; passwords hashed with `bcryptjs` (salt rounds: 10).
- **Zero Mock Metrics**: All dashboard KPIs, funnel stages, and trend lines are computed directly from real MongoDB collections.
- **Input Validation**: All API request payloads are validated via strict `Zod` schemas before hitting controllers.
- **Security Headers**: Standard security headers enforced via `helmet`.

---

## 🗺️ Roadmap & Future Enhancements

- **Additional Live Gateway Integrations**: Production integrations for Stripe and Cashfree, alongside production-grade Razorpay support.
- **Multi-Channel Recovery Links**: Automated SMS and WhatsApp payment link dispatch via Twilio / Gupshup.
- **Custom Autonomous Policies**: Merchant-configurable threshold rules (e.g. adjust minimum probability, max auto-salvage amounts).
- **Multi-Currency Support**: Dynamic FX conversion and multi-currency reporting (USD, EUR, GBP, INR).

---

## 📄 License

This project is licensed under the **MIT License**.
