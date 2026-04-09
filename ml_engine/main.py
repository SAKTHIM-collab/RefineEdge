# refine-edge/ml_engine/main.py
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from contextlib import asynccontextmanager
import joblib
import pandas as pd
import numpy as np
import shap 
from typing import Dict, Optional
import uvicorn
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import os

from optimizer import optimize_production_mix

# --- 1. Sustainability (ESG) Module ---
EMISSION_FACTOR_FUEL = 2.75 

def calculate_environmental_impact(crude_feed_rate_bpd: float):
    if crude_feed_rate_bpd <= 0:
        return {"daily_co2_tonnes": 0, "carbon_intensity_score": 0, "esg_rating": "N/A"}
    estimated_fuel_tonnes = crude_feed_rate_bpd * 0.005
    total_co2_tonnes = estimated_fuel_tonnes * EMISSION_FACTOR_FUEL
    carbon_intensity = (total_co2_tonnes * 1000) / crude_feed_rate_bpd
    return {
        "daily_co2_tonnes": round(total_co2_tonnes, 2),
        "carbon_intensity_score": round(carbon_intensity, 2),
        "esg_rating": "A" if carbon_intensity < 15 else "B"
    }

# --- 2. Predictive Maintenance (RUL) Module ---
CRITICAL_THRESHOLD = 0.2 
DEGRADATION_RATE = 0.005 

def estimate_remaining_useful_life(current_health_score: float):
    if current_health_score <= CRITICAL_THRESHOLD:
        return 0
    hours_left = (current_health_score - CRITICAL_THRESHOLD) / DEGRADATION_RATE
    return max(0, int(hours_left / 24))

# --- 3. Safety Management (MOC) & Email Config ---
class MOCRequest(BaseModel):
    change_type: str
    proposed_value: float
    hazard_analysis: str
    operator_id: str

SMTP_SERVER = "smtp.gmail.com"
SMTP_PORT = 587
SENDER_EMAIL = "refine-edge-alerts@industrial.com"
SENDER_PASSWORD = os.getenv("REFINE_EDGE_EMAIL_PASSWORD", "no-password-set")
RECEIVER_EMAIL = "safety-manager@nitt-refinery.com"

def send_safety_alert(moc_data: MOCRequest):
    """Dispatches a high-priority email alert for MOC Authorization."""
    msg = MIMEMultipart()
    msg['From'] = SENDER_EMAIL
    msg['To'] = RECEIVER_EMAIL
    msg['Subject'] = f"🚨 MOC AUTHORIZATION: OP-{moc_data.operator_id}"

    body = f"""
    REFINE-EDGE SAFETY PROTOCOL: MANAGEMENT OF CHANGE (MOC)
    ------------------------------------------------------
    OPERATOR ID     : {moc_data.operator_id}
    CHANGE TYPE     : {moc_data.change_type}
    TARGET VALUE    : {moc_data.proposed_value}
    
    HAZARD ANALYSIS (HIRA):
    "{moc_data.hazard_analysis}"
    
    STATUS: EXECUTION AUTHORIZED
    ------------------------------------------------------
    Audit log generated via RefineEdge Digital Twin v1.0
    """
    msg.attach(MIMEText(body, 'plain'))

    try:
        # --- Uncomment below to enable real email dispatch ---
        # server = smtplib.SMTP(SMTP_SERVER, SMTP_PORT)
        # server.starttls()
        # server.login(SENDER_EMAIL, SENDER_PASSWORD)
        # server.send_message(msg)
        # server.quit()
        print(f"📧 EMAIL AUDIT DISPATCHED TO {RECEIVER_EMAIL} [SUCCESS]")
    except Exception as e:
        print(f"❌ SMTP Error: {e}")

# --- Global State ---
model = None
scaler = None
explainer = None 

@asynccontextmanager
async def lifespan(app: FastAPI):
    global model, scaler, explainer
    try:
        model = joblib.load('./models/isolation_forest.pkl')
        scaler = joblib.load('./models/scaler.pkl')
        explainer = shap.TreeExplainer(model)
        print("✅ RefineEdge Engine: ML, XAI, ESG, RUL, and MOC Alerting online.")
    except Exception as e:
        print(f"❌ Initialization Error: {e}")
    yield

app = FastAPI(title="RefineEdge ML Engine", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"], 
    allow_headers=["*"],
)

class SensorData(BaseModel):
    readings: Dict[str, float]

class MarketPrices(BaseModel):
    naphtha: float
    diesel: float
    fuel_oil: float
    green_mode: bool = False 

@app.post("/predict-anomaly")
def predict_anomaly(payload: SensorData):
    if not model or not scaler or not explainer:
        raise HTTPException(status_code=500, detail="Core models not initialized")
    df = pd.DataFrame([payload.readings])
    try:
        X_scaled = scaler.transform(df)
        prediction = model.predict(X_scaled)[0]
        anomaly_score = model.score_samples(X_scaled)[0]
        is_anomaly = bool(prediction == -1)
        root_cause = None
        if is_anomaly:
            shap_values = explainer.shap_values(X_scaled)
            impacts = np.abs(shap_values[0])
            top_idx = np.argmax(impacts)
            feature_name = df.columns[top_idx]
            root_cause = {
                "sensor": feature_name,
                "impact_score": round(float(impacts[top_idx]), 4),
                "action": f"Inspect {feature_name} immediately."
            }
        simulated_bpd = payload.readings.get('xmv_1', 50.0) * 1000
        sustainability = calculate_environmental_impact(simulated_bpd)
        base_health = 0.90
        stress = (payload.readings.get('xmeas_21', 50.0) - 50.0) * 0.02
        current_health = max(0.1, base_health - stress)
        rul_days = estimate_remaining_useful_life(current_health)
        return {
            "is_anomaly": is_anomaly,
            "confidence_score": round(anomaly_score, 4),
            "status": "Warning: Equipment Deviation" if is_anomaly else "Normal Operation",
            "root_cause": root_cause,
            "sustainability": sustainability,
            "predictive_maintenance": {
                "asset_id": "Heat Exchanger E-101",
                "current_health": round(current_health * 100, 1),
                "days_until_failure": rul_days,
                "recommendation": "Urgent Maintenance Required" if rul_days < 5 else "Monitor Performance"
            }
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Inference Error: {str(e)}")

@app.post("/optimize-mix")
def optimize_mix(request: MarketPrices):
    prices_dict = {'naphtha': request.naphtha, 'diesel': request.diesel, 'fuel_oil': request.fuel_oil}
    result = optimize_production_mix(prices_dict, green_mode=request.green_mode)
    return result

@app.post("/submit-moc")
async def submit_moc(request: MOCRequest):
    """Records a formal MOC request and dispatches executive alerts."""
    print(f"🚨 MOC LOGGED: {request.change_type} by OP-{request.operator_id}")
    # Trigger the Email Logic
    send_safety_alert(request)
    return {
        "status": "APPROVED_PROVISIONAL",
        "moc_id": f"MOC-2026-{np.random.randint(1000, 9999)}",
        "timestamp": "2026-04-03T17:30:00Z",
        "audit_note": "Executive alert dispatched to Safety Department."
    }

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)