# RefineEdge // Industrial Digital Twin V1.0

![React](https://img.shields.io/badge/Frontend-React.js-blue)
![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688)
![Optimization](https://img.shields.io/badge/Solver-SciPy-orange)
![Status](https://img.shields.io/badge/Status-Production_Prototype-success)

RefineEdge is an advanced **Digital Twin and Decision Support System** designed for high-stakes process control in Chemical Refineries (e.g., Crude Distillation Units). It bridges the gap between core Chemical Engineering principles and modern Full-Stack AI.

By integrating real-time telemetry with Mathematical Optimization and Explainable AI (XAI), RefineEdge transforms a refinery's raw data into actionable, safe, and sustainable operational strategies.

---

## 🚀 Core Architecture & Features

### 1. Multi-Objective Economic Optimizer (SciPy)
* Utilizes **Linear Programming** to calculate the optimal crude feed rate and product mix (Naphtha, Diesel, Fuel Oil).
* **ESG "Green Mode":** Dynamically re-weights the objective function with virtual carbon tax penalties, prioritizing lower $CO_2$ intensity yields to meet sustainability compliance.

### 2. Explainable AI & Predictive Maintenance (Isolation Forest + SHAP)
* **Real-time Anomaly Detection:** Ingests live telemetry to detect equipment deviations.
* **SHAP Diagnostics:** Moves beyond "Black Box" AI by statistically isolating the exact sensor causing the anomaly, providing operators with immediate root-cause corrective actions.
* **RUL Forecasting:** Linear degradation modeling to predict the Remaining Useful Life of critical assets.

### 3. OSHA-Compliant Safety Gate (Management of Change)
* Adheres to **OSHA PSM 1910.119** standards by preventing autonomous AI setpoint changes.
* Implements a **Human-in-the-Loop (HITL)** "Management of Change" authorization protocol, requiring mandatory Hazard Identification (HIRA) input.
* Automatically dispatches SMTP executive alerts and maintains a tamper-proof digital shift log for regulatory audits.

---

## 🛠️ Technology Stack

* **Core AI/Math:** Python, NumPy, Pandas, Scikit-Learn, SciPy (Highs Solver), SHAP.
* **Backend API:** FastAPI, Uvicorn, Pydantic.
* **Frontend UI:** React.js, TypeScript, Tailwind CSS, Recharts, Lucide Icons.

---

## ⚙️ Installation & Setup

### 1. Backend Engine (FastAPI)
Navigate to the `ml_engine` directory and install the dependencies:
```bash
cd ml_engine
pip install -r requirements.txt
# Run the API server
uvicorn main:app --reload
