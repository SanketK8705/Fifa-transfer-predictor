# FIFAVAL — FIFA Transfer Value Predictor

A full-stack machine learning web application that predicts football players' market transfer values using FIFA 19 dataset attributes. Built with Flask + React, deployed on Render and Vercel.

🔗 **Live Demo:** [fifaval.vercel.app](https://fifa-transfer-predictor-frontend.vercel.app/)  
📦 **Repo:** [github.com/SanketK8705/Fifa-transfer-predictor](https://github.com/SanketK8705/Fifa-transfer-predictor)

---

## Features

- **Predict Tab** — Predict market value for any of 15 famous players or build a fully custom player using sliders across 21 attributes
- **Search Tab** — Search any of 5,000+ players from the FIFA dataset; click to get an instant ML-predicted value
- **Compare Tab** — Head-to-head comparison of two players with overlaid radar chart, stat-by-stat table with winner highlighting, and predicted value difference
- **Analysis Tab** — PCA 2D scatter plot, classification metrics, regression scores, confusion matrix, and feature importance charts
- **History Tab** — Session-scoped prediction history stored in SQLite via SQLAlchemy; supports delete and clear all

---

## ML Models

| Model | R² Score | MAE |
|---|---|---|
| Linear Regression | ~85% | ~€3.2M |
| Random Forest | ~98% | ~€1.1M |
| Gradient Boosting | **99.17%** | **~€0.8M** |

- **PCA:** 21 features → 13 components, retaining 95.81% variance
- **Classification:** Players categorized into Low / Medium / High / Elite tiers using Random Forest and Gradient Boosting classifiers
- **Dataset:** FIFA 19 Kaggle dataset, 18,000+ players, filtered to ~5,000 with valid market values

---

## Tech Stack

### Backend
- Python 3, Flask, SQLAlchemy (SQLite)
- Scikit-learn (Linear Regression, Random Forest, Gradient Boosting, PCA, Logistic Regression)
- Pandas, NumPy
- Deployed on **Render**

### Frontend
- React 18 + Vite
- Recharts (radar chart, scatter plots, bar charts)
- GSAP (animated nav, staggered menus)
- Axios
- Deployed on **Vercel**

---

## Project Structure

```
Fifa-transfer-Project/
├── app/
│   ├── __init__.py          # Flask app factory
│   ├── models.py            # SQLAlchemy Prediction model
│   ├── ml/
│   │   └── engine.py        # ML training, prediction, search, analysis
│   └── routes/
│       ├── predict.py       # POST /api/predict
│       ├── players.py       # GET /api/players/famous, /search, /positions
│       ├── history.py       # GET/DELETE /api/history
│       └── analysis.py      # GET /api/analysis
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── api/client.js
│   │   └── components/
│   │       ├── PredictPanel.jsx
│   │       ├── SearchPanel.jsx
│   │       ├── ComparePanel.jsx
│   │       ├── AnalysisPanel.jsx
│   │       ├── HistoryPanel.jsx
│   │       └── ...          # CardNav, Dock, StaggeredMenu, animations
│   └── index.html
├── data.csv                 # FIFA 19 dataset
├── run.py
└── vercel.json
```

---

## Local Setup

### Backend
```bash
cd Fifa-transfer-Project
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python3 run.py
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

Set `baseURL` in `frontend/src/api/client.js` to `http://127.0.0.1:5000/api` for local development.

---

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/predict` | Predict player market value |
| GET | `/api/players/famous` | Get 15 famous players with full stats |
| GET | `/api/players/search?q=` | Search dataset players (returns full stats) |
| GET | `/api/players/positions` | Get all valid positions |
| GET | `/api/analysis` | PCA, classification, regression analysis data |
| GET | `/api/history?session_id=` | Get session prediction history |
| DELETE | `/api/history/<id>` | Delete a prediction |
| DELETE | `/api/history/clear` | Clear all session history |

---

## Key Design Decisions

- **Session-scoped history** via UUID stored in localStorage — no auth required
- **Keep-alive tab pattern** — panels stay mounted to avoid remount lag on tab switch
- **Full stats on search** — `search_players` returns all 21 attributes so predictions are as accurate as the main predict flow
- **Source tagging** — predictions tagged as `predict` / `search` / `compare` for history labeling

---

## Author

**Sanket Kumar Singh**  
[GitHub](https://github.com/SanketK8705)
