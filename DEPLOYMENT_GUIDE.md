# 🚀 MedFlow-AI Cloud Deployment Guide

This guide covers deploying MedFlow-AI to cloud hosting platforms with zero hassle. The codebase includes a production multi-stage [Dockerfile](file:///c:/Users/PC/OneDrive/Desktop/aj_hackathon/MedFlow-AI/Dockerfile), [render.yaml](file:///c:/Users/PC/OneDrive/Desktop/aj_hackathon/MedFlow-AI/render.yaml), and [railway.json](file:///c:/Users/PC/OneDrive/Desktop/aj_hackathon/MedFlow-AI/railway.json) so the frontend is automatically compiled and served alongside the FastAPI backend.

---

## 🔑 Required & Optional Environment Variables

Configure these in your cloud provider's **Environment Variables** / **Secrets** dashboard:

| Variable | Required? | Description |
| :--- | :---: | :--- |
| `GEMINI_API_KEY` (or `GOOGLE_API_KEY`) | **Yes** | Google Gemini API key from [Google AI Studio](https://aistudio.google.com/app/apikey) |
| `MODEL_NAME` | No | Defaults to `gemini-2.0-flash` or `gemini-3.5-flash-lite` |
| `GROK_API_KEY` | No | Optional xAI Grok API key |
| `LLM_PROVIDER` | No | `gemini` (default) or `grok` |
| `SARVAM_API_KEY` | Optional | Sarvam AI telephony key for autonomous Kannada/Hindi IVR |
| `TWILIO_ACCOUNT_SID` | Optional | Twilio telephony SID for phone & SMS alerts |
| `TWILIO_AUTH_TOKEN` | Optional | Twilio authentication token |
| `TWILIO_PHONE_NUMBER` | Optional | Twilio phone number |
| `TARGET_STAFF_PHONE` | Optional | Emergency hospital contact number |
| `SUPABASE_URL` | Optional | Supabase database URL for persistence |
| `SUPABASE_KEY` | Optional | Supabase service role key |
| `PORT` | Auto | Provided automatically by Render/Railway (defaults to `8000`) |

---

## 🌟 Option 1: Render (Recommended — Free & Easiest)

Render provides free hosting and automatically builds the Docker container.

### Method A: Connect via Blueprint (Fastest)
1. Push the repository to GitHub:
   ```bash
   git add .
   git commit -m "Configure deployment files"
   git push origin <your-branch>
   ```
2. Open [dashboard.render.com](https://dashboard.render.com).
3. Click **"New +"** ➔ **"Blueprint"**.
4. Select your `MedFlow-AI` repository. Render will automatically read `render.yaml`.
5. Enter your `GEMINI_API_KEY` when prompted and click **Apply**.
6. Render builds the container and provides a live HTTPS URL (e.g. `https://medflow-ai.onrender.com`).

### Method B: Manual Web Service
1. On [Render Dashboard](https://dashboard.render.com), click **"New +"** ➔ **"Web Service"**.
2. Connect your `MedFlow-AI` repository.
3. Select **Docker** as the Runtime.
4. Set Instance Type to **Free**.
5. In **Environment Variables**, add:
   - `GEMINI_API_KEY`: `<your_gemini_api_key>`
6. Click **Create Web Service**.

---

## 🚆 Option 2: Railway

Railway offers seamless Docker deployments with high memory limits.

1. Go to [railway.app](https://railway.app) and sign in with GitHub.
2. Click **"New Project"** ➔ **"Deploy from GitHub repo"**.
3. Select `MedFlow-AI`. Railway detects `railway.json` and builds via [Dockerfile](file:///c:/Users/PC/OneDrive/Desktop/aj_hackathon/MedFlow-AI/Dockerfile).
4. Go to **Variables** tab in your Railway service and add:
   - `GEMINI_API_KEY` = `<your_gemini_api_key>`
5. Go to **Settings** ➔ **Networking** ➔ Click **Generate Domain**.
6. Your app is live at the generated public URL!

---

## 🤗 Option 3: Hugging Face Spaces (Free Cloud Container)

Ideal for AI showcases and hackathon demos.

1. Go to [huggingface.co/spaces](https://huggingface.co/spaces) and click **Create new Space**.
2. Enter Space name: `medflow-ai`.
3. Select SDK: **Docker** (Blank).
4. Choose **Free CPU** hardware.
5. In Space Settings ➔ **Variables and secrets**, add a secret:
   - `GEMINI_API_KEY` = `<your_api_key>`
6. Clone the HF git repository or push your files:
   ```bash
   git remote add space https://huggingface.co/spaces/YOUR_USERNAME/medflow-ai
   git push space main
   ```
7. Hugging Face builds the image and exposes port `8000` publicly.

---

## 🐳 Option 4: Self-Hosted Docker / VPS

If deploying to a Linux VPS (Ubuntu/Debian, AWS EC2, DigitalOcean, Hetzner):

```bash
# 1. Clone repository
git clone https://github.com/blanijoystan-droid/MedFlow-AI.git
cd MedFlow-AI

# 2. Configure .env
cp .env.example .env
nano .env   # Add GEMINI_API_KEY

# 3. Build & Run Docker Container
docker build -t medflow-ai .
docker run -d -p 8000:8000 --env-file .env --name medflow medflow-ai

# 4. Access the app
# Open http://YOUR_SERVER_IP:8000
```

---

## 🩺 Verifying Production Health

Once deployed, verify your service is responsive:
- Health check: `https://<YOUR_DEPLOYMENT_URL>/health` (Returns `{"status": "healthy"}`)
- API status: `https://<YOUR_DEPLOYMENT_URL>/api/status`
- Web Dashboard: `https://<YOUR_DEPLOYMENT_URL>/`
