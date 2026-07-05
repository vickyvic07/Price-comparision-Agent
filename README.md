# 🏷️ Smart Price Comparison Agent

An AI-powered, real-time price comparison and automated alert engine for Indian e-commerce. This full-stack application allows users to search for products across multiple platforms, view consolidated price comparisons, track historical pricing trends, receive email drop notifications, and chat with an intelligent AI shopping assistant.

---

## 🚀 Key Features

*   **💬 Conversational AI Interface**: A natural-language chat assistant powered by **Llama 3.3 (via Groq)** that parses user queries (e.g., *"find gaming laptops under 60k"*), applies smart filters (min/max price, category), and navigates the platform automatically. (Includes a robust rule-based local NLP fallback).
*   **🕷️ Parallel Multi-Store Scraping**: Real-time parallel search dispatching to isolated store web scrapers (**Amazon, Flipkart, Croma, SerpAPI**) using headless browsers (**Playwright**). Failure of any single retailer crawler is handled gracefully and isolated from others.
*   **🧠 Intelligent Catalog Deduplication**: Matches and consolidates identical products from different retailers into a single canonical view using **string-similarity algorithms** to group listings accurately.
*   **📊 Price History & Trend Charting**: Captures daily price changes for products to generate interactive 30-day price trend lines (**Recharts**) showing users if they are getting a true discount.
*   **🤖 AI Review Summarizer**: Aggregates customer ratings and runs reviews through LLMs to output a structured **Pros & Cons** list and summary paragraph.
*   **🔔 Target Price Alerts**: Automated backend workers (**node-cron** + **Bull queues**) scrape tracked listings periodically and trigger email alerts (**Nodemailer**) when a product falls below the user's defined target price.
*   **💖 Wishlists & User Dashboard**: Save products, monitor lists, and manage notification thresholds from a clean profile dashboard.

---

## 🛠️ Technology Stack

### Backend
*   **Runtime**: Node.js (v18+)
*   **Framework**: Express
*   **Database**: MongoDB (Mongoose ODM)
*   **Caching & Queueing**: Redis (Cache & Bull Queue state storage)
*   **Crawler / Scraper**: Playwright (Headless Web Automation)
*   **AI Integration**: Groq Cloud SDK (`llama-3.3-70b-versatile`)
*   **Task Scheduling**: Node-cron & Bull Queue
*   **Email Engine**: Nodemailer
*   **Validation**: Joi & Zod
*   **Logging**: Winston

### Frontend
*   **Framework**: React 19 (Vite)
*   **Styling**: Tailwind CSS & PostCSS
*   **State Management**: Zustand
*   **Data Fetching**: TanStack Query (React Query)
*   **Charts & Visualization**: Recharts
*   **Routing**: React Router DOM (v6)
*   **Icons**: Lucide React

---

## 📁 Project Structure

```text
pricecomp/
├── backend/                  # Express REST API & Background Workers
│   ├── adapters/             # Crawler adapters (Amazon, Flipkart, Croma, SerpAPI)
│   ├── controllers/          # Business logic handlers (Auth, Search, Wishlist, Alerts, Chat)
│   ├── models/               # MongoDB Mongoose schemas
│   ├── routes/               # API endpoint routing
│   ├── services/             # Helper integrations (Email, Affiliates, AI Review Summary)
│   ├── jobs/                 # Cron triggers and Bull queue job processors
│   └── server.js             # API entrypoint
│
└── frontend/                 # React Single Page Application (SPA)
    ├── src/
    │   ├── components/       # Reusable UI parts (Charts, Chat bubbles, Forms)
    │   ├── pages/            # Core views (Search, Details, Alerts, Wishlist)
    │   ├── hooks/            # Custom React hooks
    │   └── App.jsx           # Routing & Layout definitions
```

---

## 🚦 Getting Started

### Prerequisites
*   Node.js (>= 18.0.0)
*   MongoDB Instance
*   Redis Server (for queues & search caching)
*   Groq API Key (Optional; fallback engines are active if not provided)
*   SMTP Server details (for sending price alert emails)

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/yourusername/price-comparison-agent.git
   cd price-comparison-agent
   ```

2. **Configure Backend Env:**
   Create a `.env` file inside the `backend` directory matching the configuration in `backend/.env.example`:
   ```env
   PORT=5000
   MONGODB_URI=mongodb://localhost:27017/pricecomp
   REDIS_URL=redis://localhost:6379
   GROQ_API_KEY=your_groq_api_key
   EMAIL_USER=your_smtp_email
   EMAIL_PASS=your_smtp_password
   ```

3. **Install dependencies and start the backend:**
   ```bash
   cd backend
   npm install
   npm run seed # Optional: seed sample catalog data
   npm run dev
   ```

4. **Install dependencies and start the frontend:**
   ```bash
   cd ../frontend
   npm install
   npm run dev
   ```

5. **Build for Production (Frontend):**
   ```bash
   npm run build
   ```

---

## 🛡️ License
This project is licensed under the MIT License - see the LICENSE file for details.
