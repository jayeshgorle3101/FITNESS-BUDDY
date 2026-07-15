"""
╔══════════════════════════════════════════════════════════════════════╗
║              AI Fitness Buddy – Flask + IBM Watsonx.ai              ║
║              Powered by IBM Granite Foundation Models               ║
╚══════════════════════════════════════════════════════════════════════╝

PROJECT STRUCTURE
─────────────────
fitness_buddy/
├── app.py                  ← This file (Flask backend + AI logic)
├── requirements.txt        ← Python dependencies
├── .env.example            ← Environment variable template
├── .env                    ← Your real secrets (never commit!)
├── Procfile                ← Gunicorn entry-point (Render / Heroku)
├── render.yaml             ← Render.com deployment config
├── README.md               ← Setup & deployment guide
├── templates/
│   └── index.html          ← Single-page application
└── static/
    ├── css/
    │   └── style.css       ← Custom styles + dark mode
    └── js/
        └── app.js          ← Chat, BMI calc, progress tracker
"""

# ══════════════════════════════════════════════════════════════════════
#  AGENT INSTRUCTIONS  –  Customise the AI assistant's behaviour here
# ══════════════════════════════════════════════════════════════════════
AGENT_INSTRUCTIONS = """
You are FitBuddy, a friendly, motivating, and knowledgeable AI fitness assistant.
Your primary language is English, but you warmly understand Indian cultural context.

## TONE & PERSONALITY
- Warm, encouraging, and positive — never judgmental about weight, diet, or fitness level.
- Use motivational language: "You've got this!", "Small steps lead to big results!"
- Keep responses concise yet actionable (bullet points preferred for workout plans).
- Address users by name when provided.

## FITNESS GOALS SUPPORTED
- Weight loss / fat burning
- Muscle gain / strength building
- Flexibility & yoga
- Cardiovascular health
- General fitness & active lifestyle
- Stress reduction through exercise

## WORKOUT GUIDELINES
- Default to HOME workouts requiring zero equipment unless the user mentions a gym.
- Always include warm-up (5 min) and cool-down (5 min) in full plans.
- Intensity levels: Beginner (low impact), Intermediate, Advanced.
- For users over 50 or with health conditions, recommend low-impact exercises and always
  advise consulting a doctor before starting any new exercise program.
- Rest days: recommend at least 1–2 rest days per week.
- Workout durations: 20–45 minutes for beginners, up to 60 minutes for advanced.

## NUTRITION & INDIAN FOOD PREFERENCES
- Prioritise Indian food suggestions: dal, sabzi, roti, rice, idli, dosa, poha, upma,
  paneer dishes, curd/yogurt, sprouts, chana, rajma, fruits, nuts.
- Suggest healthy Indian breakfasts: poha, upma, idli with sambar, besan chilla, oats dalia.
- Healthy lunch ideas: dal-rice, roti-sabzi, mixed vegetable curry, salads with chaat masala.
- Healthy dinner: light khichdi, moong dal soup, grilled paneer, vegetable stir-fry with roti.
- Hydration reminders: coconut water, lassi (low-sugar), buttermilk, nimbu pani.
- Avoid recommending non-vegetarian food unless the user explicitly asks.
- For weight loss: recommend a mild caloric deficit, not extreme dieting.
- Provide approximate calorie counts when discussing meals.

## BMI INTERPRETATION
- Underweight: < 18.5 → Suggest calorie-dense healthy foods + strength training.
- Normal: 18.5–24.9 → Maintain current habits + encourage consistency.
- Overweight: 25–29.9 → Gradual lifestyle changes, no crash diets.
- Obese: ≥ 30 → Empathetic tone, suggest doctor consultation, gentle exercise start.

## DAILY FITNESS PLANS
- Morning routine: stretching + light cardio (10–15 min).
- Main workout: strength or cardio based on goal.
- Evening: yoga / walk / meditation.
- Include sleep hygiene tips (7–8 hours recommended).

## HABIT BUILDING & MOTIVATION
- Encourage the 21-day habit formation principle.
- Celebrate small wins: completing first week, drinking 8 glasses of water, etc.
- Suggest habit stacking: "After your morning tea, do 10 minutes of stretching."
- Remind users that consistency beats intensity.

## SAFETY GUIDELINES  ⚠️
- NEVER diagnose medical conditions or prescribe medication.
- Always recommend consulting a certified doctor or physiotherapist for injuries/pain.
- For pregnant users: recommend only prenatal-safe exercises; advise doctor consultation.
- Do not recommend extremely low-calorie diets (< 1200 kcal/day for women, < 1500 for men).
- If a user mentions eating disorders, respond with empathy and recommend professional help.

## RESPONSE FORMAT
- For workout plans: use numbered lists with sets × reps.
- For meal plans: use a structured daily breakdown (Breakfast / Lunch / Dinner / Snacks).
- For BMI results: provide the number, category, and 2–3 actionable next steps.
- For motivation: keep it to 2–3 sentences — punchy and personal.
- End every response with an encouraging closing line.
"""

# ══════════════════════════════════════════════════════════════════════
#  IMPORTS & CONFIGURATION
# ══════════════════════════════════════════════════════════════════════
import os
import json
import math
import logging
from datetime import datetime
from dotenv import load_dotenv
from flask import Flask, request, jsonify, render_template, session
from flask_cors import CORS

# Load environment variables from .env
load_dotenv()

app = Flask(__name__)
app.secret_key = os.getenv("FLASK_SECRET_KEY", "fitness-buddy-dev-secret-2024")
CORS(app)

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)

# ── Watsonx.ai Configuration ──────────────────────────────────────────
IBM_API_KEY       = os.getenv("IBM_API_KEY")
WATSONX_PROJECT_ID = os.getenv("WATSONX_PROJECT_ID")
WATSONX_URL       = os.getenv("WATSONX_URL", "https://us-south.ml.cloud.ibm.com")

# IBM Granite model — change to any supported Granite variant
GRANITE_MODEL_ID  = "ibm/granite-13b-instruct-v2"

# Lazy-loaded Watsonx client
_watsonx_client = None

def get_watsonx_client():
    """Return (and cache) a Watsonx ModelInference client."""
    global _watsonx_client
    if _watsonx_client is not None:
        return _watsonx_client
    try:
        from ibm_watsonx_ai import Credentials
        from ibm_watsonx_ai.foundation_models import ModelInference
        from ibm_watsonx_ai.metanames import GenTextParamsMetaNames as GenParams

        credentials = Credentials(
            url=WATSONX_URL,
            api_key=IBM_API_KEY,
        )
        params = {
            GenParams.DECODING_METHOD: "greedy",
            GenParams.MAX_NEW_TOKENS:  800,
            GenParams.MIN_NEW_TOKENS:  30,
            GenParams.TEMPERATURE:     0.7,
            GenParams.REPETITION_PENALTY: 1.1,
            GenParams.STOP_SEQUENCES:  ["User:", "Human:", "<|endoftext|>"],
        }
        _watsonx_client = ModelInference(
            model_id=GRANITE_MODEL_ID,
            credentials=credentials,
            project_id=WATSONX_PROJECT_ID,
            params=params,
        )
        logger.info("Watsonx.ai client initialised with model: %s", GRANITE_MODEL_ID)
        return _watsonx_client
    except Exception as exc:
        logger.error("Failed to initialise Watsonx client: %s", exc)
        return None


def build_prompt(user_message: str, chat_history: list, user_profile: dict) -> str:
    """Construct the full prompt sent to IBM Granite."""
    profile_ctx = ""
    if user_profile:
        parts = []
        if user_profile.get("name"):
            parts.append(f"Name: {user_profile['name']}")
        if user_profile.get("age"):
            parts.append(f"Age: {user_profile['age']}")
        if user_profile.get("weight"):
            parts.append(f"Weight: {user_profile['weight']} kg")
        if user_profile.get("height"):
            parts.append(f"Height: {user_profile['height']} cm")
        if user_profile.get("goal"):
            parts.append(f"Fitness Goal: {user_profile['goal']}")
        if user_profile.get("level"):
            parts.append(f"Fitness Level: {user_profile['level']}")
        if parts:
            profile_ctx = "User Profile: " + " | ".join(parts) + "\n"

    history_text = ""
    for turn in chat_history[-6:]:          # keep last 3 exchanges for context
        role = "User" if turn["role"] == "user" else "FitBuddy"
        history_text += f"{role}: {turn['content']}\n"

    prompt = (
        f"<<SYS>>\n{AGENT_INSTRUCTIONS}\n<</SYS>>\n\n"
        f"{profile_ctx}"
        f"{history_text}"
        f"User: {user_message}\n"
        f"FitBuddy:"
    )
    return prompt


def query_granite(user_message: str, chat_history: list, user_profile: dict) -> str:
    """Send a prompt to IBM Granite and return the response text."""
    client = get_watsonx_client()
    if client is None:
        return fallback_response(user_message)

    prompt = build_prompt(user_message, chat_history, user_profile)
    try:
        result = client.generate_text(prompt=prompt)
        response = result.strip() if isinstance(result, str) else str(result).strip()
        if not response:
            return fallback_response(user_message)
        return response
    except Exception as exc:
        logger.error("Granite generation error: %s", exc)
        return fallback_response(user_message)


def fallback_response(user_message: str) -> str:
    """Rule-based fallback when Watsonx.ai is unavailable."""
    msg_lower = user_message.lower()

    if any(k in msg_lower for k in ["bmi", "body mass"]):
        return (
            "To calculate your BMI, use our **BMI Calculator** tab! "
            "Enter your height and weight and I'll interpret the result for you. 💪"
        )
    if any(k in msg_lower for k in ["workout", "exercise", "training"]):
        return (
            "Here's a quick **beginner home workout**:\n\n"
            "🔥 **Warm-up (5 min):** Jumping jacks + arm circles\n"
            "1. Squats – 3 × 15\n"
            "2. Push-ups – 3 × 10\n"
            "3. Plank – 3 × 30 sec\n"
            "4. Lunges – 3 × 12 each leg\n"
            "5. Mountain climbers – 3 × 20\n"
            "🧘 **Cool-down (5 min):** Deep stretches\n\n"
            "Stay consistent — you've got this! 🌟"
        )
    if any(k in msg_lower for k in ["diet", "food", "meal", "nutrition", "eat"]):
        return (
            "Here's a healthy **Indian daily meal plan**:\n\n"
            "🌅 **Breakfast:** Poha with peanuts + green tea\n"
            "🕛 **Lunch:** 2 rotis + dal + mixed sabzi + curd\n"
            "🌆 **Dinner:** Moong dal khichdi + salad\n"
            "🍎 **Snacks:** Sprouts chaat / banana / handful of nuts\n"
            "💧 Drink 8–10 glasses of water daily!\n\n"
            "Small consistent changes lead to big results! 🥗"
        )
    if any(k in msg_lower for k in ["motivat", "inspire", "tired", "give up"]):
        return (
            "Remember: **Every expert was once a beginner.** 🌱\n\n"
            "You didn't come this far to only come this far. "
            "Even a 10-minute workout today is better than zero. "
            "Keep showing up — your future self will thank you! 💥"
        )
    if any(k in msg_lower for k in ["weight loss", "lose weight", "fat"]):
        return (
            "**Weight Loss Tips (Healthy & Sustainable):**\n\n"
            "✅ Aim for a 300–500 calorie daily deficit\n"
            "✅ Include 30 min cardio 5× per week\n"
            "✅ Eat more protein: paneer, dal, eggs, sprouts\n"
            "✅ Avoid sugary drinks; choose nimbu pani or buttermilk\n"
            "✅ Sleep 7–8 hours — poor sleep hinders fat loss\n"
            "✅ Walk 8,000–10,000 steps daily\n\n"
            "Slow and steady wins the race — no crash diets! 🏃‍♂️"
        )
    return (
        "I'm your AI Fitness Buddy! 🏋️ I can help you with:\n\n"
        "💪 **Personalised workout plans**\n"
        "🥗 **Indian meal & nutrition suggestions**\n"
        "📊 **BMI calculation & interpretation**\n"
        "🗓️ **Daily fitness schedules**\n"
        "🌟 **Motivation & habit building**\n\n"
        "What would you like to work on today?"
    )


# ══════════════════════════════════════════════════════════════════════
#  HELPER UTILITIES
# ══════════════════════════════════════════════════════════════════════
def calculate_bmi(weight_kg: float, height_cm: float) -> dict:
    """Return BMI value, category, and advice."""
    if height_cm <= 0 or weight_kg <= 0:
        return {"error": "Invalid height or weight values."}
    height_m = height_cm / 100
    bmi = round(weight_kg / (height_m ** 2), 1)

    if bmi < 18.5:
        category = "Underweight"
        color    = "#3b82f6"
        advice   = [
            "Increase calorie intake with nutrient-dense foods (nuts, paneer, banana, ghee in moderation).",
            "Add strength training 3× per week to build muscle mass.",
            "Eat 5–6 small meals throughout the day.",
            "Consult a nutritionist for a personalised weight-gain plan.",
        ]
    elif bmi < 25:
        category = "Normal Weight"
        color    = "#22c55e"
        advice   = [
            "Great job! Maintain your current healthy habits.",
            "Focus on consistency: 150 min of moderate exercise per week.",
            "Keep eating balanced Indian meals rich in vegetables and protein.",
            "Stay hydrated and prioritise sleep for optimal health.",
        ]
    elif bmi < 30:
        category = "Overweight"
        color    = "#f59e0b"
        advice   = [
            "Aim for a gradual 0.5 kg weight loss per week — no crash diets.",
            "Start with 30-minute daily walks and progress to structured workouts.",
            "Reduce refined carbs (maida, sugary snacks) and increase vegetables.",
            "Track your meals for 2 weeks to understand eating patterns.",
        ]
    else:
        category = "Obese"
        color    = "#ef4444"
        advice   = [
            "Please consult your doctor before starting any new exercise program.",
            "Begin with low-impact activities: walking, swimming, chair yoga.",
            "Focus on diet quality first: more vegetables, less fried & processed food.",
            "Set small, achievable weekly goals and celebrate every milestone.",
        ]

    ideal_min = round(18.5 * (height_m ** 2), 1)
    ideal_max = round(24.9 * (height_m ** 2), 1)

    return {
        "bmi":      bmi,
        "category": category,
        "color":    color,
        "advice":   advice,
        "ideal_weight_range": f"{ideal_min}–{ideal_max} kg",
    }


def generate_workout_plan(level: str, goal: str, days: int = 5) -> dict:
    """Return a structured weekly workout plan."""
    plans = {
        "beginner": {
            "weight_loss": [
                {"day": "Monday",    "focus": "Full Body Cardio",  "exercises": ["20 min brisk walk/jog", "Jumping jacks 3×30", "Squats 3×15", "Push-ups (knee) 3×10", "Plank 3×20s"]},
                {"day": "Tuesday",   "focus": "Active Rest",       "exercises": ["15 min yoga / stretching", "5 min deep breathing"]},
                {"day": "Wednesday", "focus": "Lower Body",        "exercises": ["Squats 3×20", "Lunges 3×12", "Glute bridges 3×15", "Calf raises 3×20", "15 min walk"]},
                {"day": "Thursday",  "focus": "Active Rest",       "exercises": ["15 min morning yoga", "Evening walk 20 min"]},
                {"day": "Friday",    "focus": "Upper Body + Core", "exercises": ["Push-ups 3×12", "Tricep dips 3×10", "Mountain climbers 3×20", "Bicycle crunches 3×15", "Superman 3×12"]},
                {"day": "Saturday",  "focus": "Dance / Zumba",     "exercises": ["30 min fun cardio (dance/Zumba/cycling)", "10 min cool-down stretch"]},
                {"day": "Sunday",    "focus": "Rest & Recovery",   "exercises": ["Full rest or gentle 20 min walk", "Foam rolling / stretching"]},
            ],
        },
        "intermediate": {
            "weight_loss": [
                {"day": "Monday",    "focus": "HIIT Cardio",       "exercises": ["Burpees 4×15", "Jump squats 4×20", "High knees 4×30s", "Push-ups 4×15", "Plank 4×45s"]},
                {"day": "Tuesday",   "focus": "Strength – Lower",  "exercises": ["Bulgarian split squats 3×12", "Romanian deadlift 3×12", "Leg press 3×15", "Calf raises 4×20", "Wall sit 3×45s"]},
                {"day": "Wednesday", "focus": "Active Recovery",   "exercises": ["30 min yoga or cycling"]},
                {"day": "Thursday",  "focus": "Strength – Upper",  "exercises": ["Pull-ups / inverted rows 3×8", "Pike push-ups 3×12", "Dumbbell rows 3×12", "Diamond push-ups 3×10", "Face pulls 3×15"]},
                {"day": "Friday",    "focus": "Core + Cardio",     "exercises": ["Hanging leg raises 3×12", "Ab wheel rollout 3×10", "Russian twists 3×20", "Jump rope 3×2 min", "Sprint intervals 5×30s"]},
                {"day": "Saturday",  "focus": "Full Body Circuit", "exercises": ["5-exercise circuit × 4 rounds (squats, push-ups, rows, lunges, plank)"]},
                {"day": "Sunday",    "focus": "Rest",              "exercises": ["Full rest — eat well and sleep 8 hours"]},
            ],
        },
    }
    level_key = level.lower() if level.lower() in plans else "beginner"
    goal_key  = "weight_loss"  # default goal key (expandable)
    return {
        "level":    level_key.capitalize(),
        "goal":     goal,
        "schedule": plans[level_key].get(goal_key, plans["beginner"]["weight_loss"])[:days],
        "tips": [
            "Always warm up for 5 minutes before every session.",
            "Cool down and stretch for 5 minutes after every workout.",
            "Stay hydrated — drink water before, during, and after exercise.",
            "Listen to your body; skip a workout if you feel injured.",
        ],
    }


# ══════════════════════════════════════════════════════════════════════
#  FLASK ROUTES
# ══════════════════════════════════════════════════════════════════════
@app.route("/")
def index():
    return render_template("index.html")


@app.route("/api/chat", methods=["POST"])
def chat():
    data         = request.get_json(silent=True) or {}
    user_message = (data.get("message") or "").strip()
    chat_history = data.get("history", [])
    user_profile = data.get("profile", {})

    if not user_message:
        return jsonify({"error": "Message cannot be empty."}), 400

    response_text = query_granite(user_message, chat_history, user_profile)
    return jsonify({
        "response":  response_text,
        "timestamp": datetime.now().strftime("%H:%M"),
        "model":     GRANITE_MODEL_ID,
    })


@app.route("/api/bmi", methods=["POST"])
def bmi():
    data   = request.get_json(silent=True) or {}
    weight = float(data.get("weight", 0))
    height = float(data.get("height", 0))
    result = calculate_bmi(weight, height)
    if "error" in result:
        return jsonify(result), 400
    return jsonify(result)


@app.route("/api/workout-plan", methods=["POST"])
def workout_plan():
    data  = request.get_json(silent=True) or {}
    level = data.get("level", "beginner")
    goal  = data.get("goal", "weight loss")
    days  = int(data.get("days", 5))
    plan  = generate_workout_plan(level, goal, days)
    return jsonify(plan)


@app.route("/api/motivation", methods=["GET"])
def motivation():
    quotes = [
        "The only bad workout is the one that didn't happen. 💪",
        "Success is the sum of small efforts, repeated day in and day out. 🌟",
        "Your body can stand almost anything. It's your mind you have to convince. 🧠",
        "Don't stop when you're tired. Stop when you're done. 🔥",
        "Take care of your body. It's the only place you have to live. 🏡",
        "The pain you feel today will be the strength you feel tomorrow. ⚡",
        "Fitness is not about being better than someone else. It's about being better than you used to be. 📈",
        "Wake up with determination. Go to bed with satisfaction. 🌙",
        "You don't have to be great to start, but you have to start to be great. 🚀",
        "Believe in yourself and all that you are. 🌈",
        "एक कदम रोज़ – यही सफलता का राज़ है। (One step daily – that's the secret to success.) 🇮🇳",
        "Strong is the new beautiful. Build strength from the inside out. 💎",
    ]
    import random
    return jsonify({
        "quote":     random.choice(quotes),
        "date":      datetime.now().strftime("%A, %d %B %Y"),
        "timestamp": datetime.now().strftime("%H:%M"),
    })


@app.route("/api/meal-plan", methods=["POST"])
def meal_plan():
    data   = request.get_json(silent=True) or {}
    goal   = data.get("goal", "balanced").lower()
    veg    = data.get("vegetarian", True)

    plans = {
        "weight_loss": {
            "calories":  "1400–1600 kcal",
            "breakfast": "Oats upma with vegetables (250 kcal) + 1 cup green tea",
            "lunch":     "2 whole wheat rotis + moong dal + cucumber raita (450 kcal)",
            "dinner":    "Vegetable khichdi + low-fat curd (350 kcal)",
            "snacks":    "Morning: 1 banana | Evening: sprouts chaat (150 kcal total)",
            "tips":      ["Eat dinner before 8 PM.", "Avoid maida and sugary drinks.", "Drink 3 litres water."],
        },
        "muscle_gain": {
            "calories":  "2200–2500 kcal",
            "breakfast": "Besan chilla × 3 + paneer bhurji (550 kcal) + 1 glass milk",
            "lunch":     "3 rotis + rajma / chana + rice + salad (700 kcal)",
            "dinner":    "Paneer tikka + 2 rotis + dal (550 kcal)",
            "snacks":    "Pre-workout: banana + peanut butter | Post-workout: whey / sattu shake (300 kcal)",
            "tips":      ["Protein at every meal.", "Eat every 3–4 hours.", "Post-workout meal within 45 minutes."],
        },
        "balanced": {
            "calories":  "1800–2000 kcal",
            "breakfast": "Poha with peanuts + 1 seasonal fruit (350 kcal)",
            "lunch":     "2 rotis + dal + sabzi + curd (550 kcal)",
            "dinner":    "Brown rice + dal tadka + salad (450 kcal)",
            "snacks":    "Handful of mixed nuts + nimbu pani (200 kcal)",
            "tips":      ["Eat a rainbow of vegetables.", "Limit processed foods.", "Stay hydrated all day."],
        },
    }

    goal_key = goal.replace(" ", "_")
    plan     = plans.get(goal_key, plans["balanced"])
    plan["goal"] = goal.replace("_", " ").title()
    return jsonify(plan)


@app.route("/api/health", methods=["GET"])
def health():
    """Health check endpoint for Render / load balancers."""
    watsonx_ok = IBM_API_KEY is not None and WATSONX_PROJECT_ID is not None
    return jsonify({
        "status":    "healthy",
        "app":       "AI Fitness Buddy",
        "version":   "1.0.0",
        "watsonx":   "configured" if watsonx_ok else "not configured (fallback mode)",
        "model":     GRANITE_MODEL_ID,
        "timestamp": datetime.now().isoformat(),
    })


# ══════════════════════════════════════════════════════════════════════
#  ENTRY POINT
# ══════════════════════════════════════════════════════════════════════
if __name__ == "__main__":
    port  = int(os.getenv("PORT", 5000))
    debug = os.getenv("FLASK_ENV", "production") == "development"
    logger.info("🏋️  AI Fitness Buddy starting on port %d (debug=%s)", port, debug)
    app.run(host="0.0.0.0", port=port, debug=debug)
