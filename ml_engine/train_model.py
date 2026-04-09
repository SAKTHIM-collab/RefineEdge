# refine-edge/ml_engine/train_model.py
import pandas as pd
import numpy as np
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler
import joblib
import os

# Define paths relative to the script
DATA_PATH = '../data/tep_simulation_data.csv'
MODEL_DIR = './models'
MODEL_PATH = f'{MODEL_DIR}/isolation_forest.pkl'
SCALER_PATH = f'{MODEL_DIR}/scaler.pkl'

def load_data(filepath):
    """
    Ingests the TEP dataset. If the file isn't present, generates 
    synthetic steady-state data to allow pipeline testing.
    """
    if os.path.exists(filepath):
        print(f"Loading industrial dataset from {filepath}...")
        df = pd.read_csv(filepath)
    else:
        print("Dataset not found. Generating synthetic baseline TEP data for testing...")
        # Simulating 52 process variables (41 measured, 11 manipulated)
        np.random.seed(42)
        columns = [f'xmeas_{i}' for i in range(1, 42)] + [f'xmv_{i}' for i in range(1, 12)]
        # Normal steady-state operation with slight Gaussian noise
        data = np.random.normal(loc=50.0, scale=2.5, size=(5000, 52))
        df = pd.DataFrame(data, columns=columns)
        
        # Inject synthetic anomalies (simulating fouling or valve stiction)
        anomaly_indices = np.random.choice(df.index, size=50, replace=False)
        df.loc[anomaly_indices, 'xmeas_9'] += 25.0  # e.g., Reactor temperature spike
        df.loc[anomaly_indices, 'xmeas_21'] -= 15.0 # e.g., Separator pressure drop
        
    return df

def train_anomaly_detector():
    # 1. Ingestion
    df = load_data(DATA_PATH)
    
    # We drop any string identifiers or timestamps; ML needs pure numerical matrices
    features = [col for col in df.columns if col.startswith('xmeas') or col.startswith('xmv')]
    X = df[features]
    
    # 2. Preprocessing
    # Standardization is critical. A pressure reading of 2000 kPa will otherwise 
    # overpower a flow rate reading of 1.5 L/min in the distance calculations.
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)
    
    # 3. Model Initialization
    # contamination=0.01 assumes 1% of our historical data represents faulty states
    print("Training Isolation Forest...")
    clf = IsolationForest(
        n_estimators=150, 
        max_samples='auto', 
        contamination=0.01, 
        random_state=42,
        n_jobs=-1 # Utilize all CPU cores
    )
    
    # 4. Training
    clf.fit(X_scaled)
    print("Model training complete.")
    
    # 5. Serialization
    os.makedirs(MODEL_DIR, exist_ok=True)
    joblib.dump(clf, MODEL_PATH)
    joblib.dump(scaler, SCALER_PATH)
    print(f"Artifacts saved to {MODEL_DIR}/")

if __name__ == "__main__":
    train_anomaly_detector()