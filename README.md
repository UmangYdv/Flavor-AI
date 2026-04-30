# 🍳 Flavor AI

Flavor AI is an AI-powered recipe and cooking assistant that transforms ingredients into delicious recipes using advanced AI models.

Built with a modern frontend stack and integrated with powerful AI services, Flavor AI helps users explore recipes, discover ingredient combinations, and cook smarter.

---

## 🚀 Live Demo

[![Live Demo](https://img.shields.io/badge/Live-Demo-success?style=for-the-badge)](https://flavor-ai-ecru.vercel.app/)
---

## ✨ Features

- 🤖 AI-powered recipe generation using NVIDIA APIs  
- 🥕 Ingredient-based recipe suggestions  
- 🖼️ AI-generated food visuals via Pollinations  
- 🔐 User authentication with Supabase  
- ☁️ Cloud database integration  
- 📱 Fully responsive modern UI  
- ⚡ Fast performance with Vite  

---

## 🛠️ Tech Stack

### Frontend
- React (Vite)
- Tailwind CSS

### Backend & Database
- Supabase (Auth + Database)

### AI Integration
- NVIDIA AI (recipe generation)
- Pollinations AI (image generation)

### Deployment
- Vercel

---

## 📂 Project Structure

```

Flavor-AI/
│── src/
│   ├── components/
│   ├── pages/
│   ├── services/
│── api/                # Vercel serverless functions
│── public/
│── .env.example
│── package.json

````

---

## ⚙️ Run Locally

### Prerequisites
- Node.js (v16+ recommended)

---

### 1. Clone the repository

```bash
git clone https://github.com/UmangYdv/Flavor-AI.git
cd Flavor-AI
````

---

### 2. Install dependencies

```bash
npm install
```

---

### 3. Setup environment variables

```bash
cp .env.example .env.local
```

Edit `.env.local`:

```env
# 🔐 Private (Server-side only)
NVIDIA_API_KEY=your_nvidia_key
POLLINATIONS_SECRET_KEY=your_pollinations_key

# 🌐 Public (Frontend)
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_key
```

---

### 4. Setup Supabase

* Run `supabase_schema.sql` in SQL Editor
* Enable **Google Authentication** in Supabase Auth

---

### 5. Start development server

```bash
npm run dev
```

---

## ☁️ Deployment

Flavor AI can be deployed easily on:

* ▲ Vercel (recommended)
* Netlify
* Any Vite-compatible hosting

---

### 🚀 Deploy on Vercel

1. Import GitHub repository
2. Add environment variables:

   * `NVIDIA_API_KEY`
   * `POLLINATIONS_SECRET_KEY`
   * `VITE_SUPABASE_URL`
   * `VITE_SUPABASE_ANON_KEY`
3. Deploy

---

## 🔐 Environment & Security

* `.env.local` is ignored by Git
* Sensitive keys are handled server-side
* No secrets are exposed to the browser

---

## 🧠 How It Works

1. User enters ingredients or selects options
2. Frontend sends request to backend API
3. Backend securely calls NVIDIA AI
4. AI generates recipes
5. Results displayed with optional AI images

---

## 👨‍💻 Author

**Umang Yadav**
GitHub: [https://github.com/UmangYdv](https://github.com/UmangYdv)

```

