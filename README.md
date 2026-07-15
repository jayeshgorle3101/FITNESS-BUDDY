# 🏋️ AI Fitness Buddy

> **Powered by IBM Granite Foundation Models via IBM Watsonx.ai**

A full-stack AI-powered fitness web application built with **Python Flask** and **IBM Watsonx.ai**. Get personalised workout plans, healthy Indian meal suggestions, BMI calculations, progress tracking, and daily motivation — all driven by IBM's Granite language models.

---

## ✨ Features

| Feature | Description |
|---|---|
| 🤖 **AI Chat** | Chat with FitBuddy powered by IBM Granite — ask anything fitness-related |
| 💪 **Workout Planner** | Auto-generate weekly home workout plans by level & goal |
| 🥗 **Nutrition Guide** | Indian-focused meal plans with calorie estimates |
| 📊 **BMI Calculator** | Instant BMI + personalised advice + ideal weight range |
| 📈 **Progress Tracker** | Log daily workouts, weight, calories, mood — with streak tracking |
| 🌟 **Daily Motivation** | Fresh motivational quotes refreshed on demand |
| 💧 **Water Tracker** | Visual 8-glass daily hydration tracker |
| 👤 **User Profile** | Saves your name, age, weight, height, goal — personalises all AI responses |
| 🌙 **Dark Mode** | Full dark/light mode toggle with system-aware design |
| 📱 **Mobile Responsive** | Optimised for all screen sizes via Bootstrap 5 |

---

## 🛠️ Tech Stack

- **Backend:** Python 3.11+, Flask 3.0, Flask-CORS
- **AI:** IBM Watsonx.ai, IBM Granite (`ibm/granite-13b-instruct-v2`)
- **Frontend:** Bootstrap 5.3, Bootstrap Icons, Google Fonts (Inter)
- **Storage:** Browser `localStorage` for user data (no database required)
- **Deployment:** Render.com / IBM Cloud Code Engine / Heroku

---

## 📁 Project Structure

```
fitness_buddy/
├── app.py                  ← Flask backend + IBM Watsonx.ai integration
├── requirements.txt        ← Python dependencies
├── .env.example            ← Environment variable template
├── .env                    ← Your secrets (DO NOT commit!)
├── Procfile                ← Gunicorn entry-point
├── render.yaml             ← Render.com one-click deploy config
├── README.md               ← This file
├── templates/
│   └── index.html          ← Single-page application (SPA)
└── static/
    ├── css/
    │   └── style.css       ← Custom styles + dark mode + animations
    └── js/
        └── app.js          ← Chat, BMI calc, progress tracker, profile
```

---

## 🚀 Quick Start (Local)

### 1. Clone / Download
```bash
git clone <your-repo-url>
cd fitness_buddy
```

### 2. Create a virtual environment
```bash
python -m venv venv
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate
```

### 3. Install dependencies
```bash
pip install -r requirements.txt
```

### 4. Set up environment variables
```bash
cp .env.example .env
```
Edit `.env` and fill in your real values:
```env
IBM_API_KEY=your_ibm_cloud_api_key
WATSONX_PROJECT_ID=your_watsonx_project_id
WATSONX_URL=https://us-south.ml.cloud.ibm.com
FLASK_SECRET_KEY=your_strong_random_secret
FLASK_ENV=development
```

### 5. Run the app
```bash
python app.py
```
Open **http://localhost:5000** in your browser.

---

## 🔑 Getting IBM Cloud Credentials (Free Tier)

### Step 1 — IBM Cloud API Key
1. Go to [https://cloud.ibm.com/iam/apikeys](https://cloud.ibm.com/iam/apikeys)
2. Click **"Create an IBM Cloud API key"**
3. Give it a name (e.g., `fitness-buddy-key`)
4. Copy the key and paste it into `.env` as `IBM_API_KEY`

### Step 2 — Watsonx.ai Project ID
1. Go to [https://dataplatform.cloud.ibm.com/wx/home](https://dataplatform.cloud.ibm.com/wx/home)
2. Sign in with your IBM Cloud account
3. Create a new **Watsonx.ai project** (or use an existing one)
4. Open the project → **Manage** tab → copy the **Project ID**
5. Paste it into `.env` as `WATSONX_PROJECT_ID`

### Step 3 — Associate Watson Machine Learning service
1. In your Watsonx project → **Manage** → **Services & integrations**
2. Click **"Associate service"**
3. Select or create a **Watson Machine Learning (Lite)** service instance
4. Associate it with your project

> 💡 The IBM Cloud **Lite** tier is free — no credit card required for basic usage.

---

## 🧠 Customising the AI Agent

Open `app.py` and find the `AGENT_INSTRUCTIONS` section near the top of the file:

```python
AGENT_INSTRUCTIONS = """
You are FitBuddy, a friendly, motivating, and knowledgeable AI fitness assistant.
...
"""
```

You can customise:
- **Tone & personality** — change how the AI communicates
- **Fitness goals** — add or remove supported goals
- **Workout intensity** — adjust beginner/intermediate/advanced thresholds
- **Food preferences** — add more regional cuisines, non-vegetarian options
- **Safety guidelines** — adjust medical disclaimers and referral thresholds
- **Response format** — change bullet points, emoji usage, verbosity

---

## 🌐 Deploy to Render.com

### Option A — One-click via `render.yaml`
1. Push your code to GitHub (without the `.env` file!)
2. Go to [https://render.com](https://render.com) → **New** → **Web Service**
3. Connect your GitHub repository
4. Render detects `render.yaml` automatically
5. Add your **secret environment variables** in the Render dashboard:
   - `IBM_API_KEY`
   - `WATSONX_PROJECT_ID`
6. Click **Deploy** — your app will be live in ~2 minutes!

### Option B — Manual configuration on Render
| Setting | Value |
|---|---|
| **Environment** | Python |
| **Build Command** | `pip install -r requirements.txt` |
| **Start Command** | `gunicorn app:app --bind 0.0.0.0:$PORT --workers 2 --timeout 120` |
| **Health Check Path** | `/api/health` |

---

## ☁️ Deploy to IBM Cloud Code Engine

```bash
# Install IBM Cloud CLI and Code Engine plugin first
ibmcloud login
ibmcloud ce project create --name fitness-buddy

ibmcloud ce app create \
  --name fitness-buddy \
  --image YOUR_DOCKER_IMAGE \
  --env IBM_API_KEY=your_key \
  --env WATSONX_PROJECT_ID=your_project_id \
  --env WATSONX_URL=https://us-south.ml.cloud.ibm.com \
  --env FLASK_SECRET_KEY=your_secret \
  --port 5000
```

---

## 🔒 Security Best Practices

- ✅ **Never commit `.env`** — it's in `.gitignore`
- ✅ Use **environment variables** for all secrets
- ✅ IBM API keys are loaded via `python-dotenv` — not hardcoded
- ✅ CORS is configured via `flask-cors`
- ✅ `render.yaml` uses `sync: false` for secrets — set them manually in dashboard
- ✅ Gunicorn is used in production (not Flask dev server)

---

## 📡 API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/` | Main application (SPA) |
| `POST` | `/api/chat` | AI chat via IBM Granite |
| `POST` | `/api/bmi` | BMI calculation + advice |
| `POST` | `/api/workout-plan` | Generate weekly workout plan |
| `POST` | `/api/meal-plan` | Generate Indian meal plan |
| `GET` | `/api/motivation` | Daily motivational quote |
| `GET` | `/api/health` | Health check endpoint |

### Example: Chat API
```bash
curl -X POST http://localhost:5000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Give me a beginner workout plan", "history": [], "profile": {"name": "Arjun", "goal": "weight loss"}}'
```

### Example: BMI API
```bash
curl -X POST http://localhost:5000/api/bmi \
  -H "Content-Type: application/json" \
  -d '{"weight": 75, "height": 175}'
```

---

## 🧪 Testing Without IBM Credentials

The app has a **smart fallback mode** — if `IBM_API_KEY` or `WATSONX_PROJECT_ID` are not set, it uses built-in rule-based responses for:
- Workout queries
- Diet & nutrition questions
- BMI interpretation
- Motivation messages

This lets you test the full UI and all features without IBM credentials.

Check the health endpoint:
```
GET /api/health
```
```json
{
  "status": "healthy",
  "watsonx": "not configured (fallback mode)",
  "model": "ibm/granite-13b-instruct-v2"
}
```

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/your-feature`
5. Open a Pull Request

---

## 📄 License

MIT License — free to use, modify, and distribute.

---

<p align="center">
  Built with ❤️ using <strong>IBM Watsonx.ai</strong> + <strong>IBM Granite</strong> + <strong>Flask</strong>
</p>
