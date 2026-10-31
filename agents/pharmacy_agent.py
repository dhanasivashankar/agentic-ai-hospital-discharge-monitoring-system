import pandas as pd
import os
import re
from typing import List, Dict, Any

DATASET_PATH = os.path.join("dataset", "hospital_pharmacy_inventory.csv")

COMMON_ALIASES = {
    "amoxicilin": "amoxicillin",
    "amox": "amoxicillin",
    "amoxil": "amoxicillin",
    "paracitamol": "paracetamol",
    "paracetemol": "paracetamol",
    "dolo": "dolo",
    "azithro": "azithromycin",
    "cipro": "ciprofloxacin",
    "ibu": "ibuprofen",
}

def _normalize_query(name: str) -> str:
    cleaned = re.sub(r'[^a-zA-Z0-9\s]', '', str(name)).strip().lower()
    return COMMON_ALIASES.get(cleaned, cleaned)

def _find_matches(df: pd.DataFrame, medicine_name: str) -> pd.DataFrame:
    query = str(medicine_name).strip()
    if not query:
        return df.iloc[0:0]

    # 1. Exact or direct substring match (escaped for regex safety)
    match = df[df['medicine_name'].str.contains(re.escape(query), case=False, na=False)]
    if not match.empty:
        return match

    # 2. Check normalized alias (e.g. 'amoxicilin' -> 'amoxicillin')
    norm = _normalize_query(query)
    match = df[df['medicine_name'].str.contains(re.escape(norm), case=False, na=False)]
    if not match.empty:
        return match

    # 3. Word-by-word search for multi-word queries
    words = [w for w in query.split() if len(w) >= 4]
    for w in words:
        sub = df[df['medicine_name'].str.contains(re.escape(w), case=False, na=False)]
        if not sub.empty:
            return sub

    return df.iloc[0:0]

def check_medicine_availability(medicine_name: str, quantity: int) -> str:
    """
    Check medicine availability using the dataset.
    Returns: available, limited, out_of_stock
    """
    if not os.path.exists(DATASET_PATH):
        return "out_of_stock"
    
    try:
        df = pd.read_csv(DATASET_PATH)
        match = _find_matches(df, medicine_name)
        
        if match.empty:
            return "out_of_stock"
        
        available_qty = int(match.iloc[0]['quantity'])
        
        if available_qty >= quantity:
            return "available"
        elif available_qty > 0:
            return "limited"
        else:
            return "out_of_stock"
    except Exception as e:
        print("Pharmacy availability check error:", e)
        return "out_of_stock"

def get_medicine_price(medicine_name: str) -> float:
    if not os.path.exists(DATASET_PATH):
        return 0.0
    
    try:
        df = pd.read_csv(DATASET_PATH)
        match = _find_matches(df, medicine_name)
        
        if match.empty:
            return 0.0
        
        return float(match.iloc[0]['price'])
    except Exception as e:
        print("Pharmacy price lookup error:", e)
        return 0.0

def search_medicines(query: str, limit: int = 8) -> List[Dict[str, Any]]:
    """
    Returns list of matching medicine records for autocomplete / suggestions.
    """
    if not os.path.exists(DATASET_PATH) or not query.strip():
        return []
    
    try:
        df = pd.read_csv(DATASET_PATH)
        match = _find_matches(df, query)
        if match.empty:
            return []
        
        results = []
        for _, row in match.head(limit).iterrows():
            results.append({
                "medicine_name": str(row['medicine_name']),
                "price": float(row['price']),
                "quantity": int(row['quantity']),
                "availability": str(row['availability'])
            })
        return results
    except Exception:
        return []

def dispense_medicine(medicine_name: str, quantity: int) -> Dict[str, Any]:
    """
    Deducts dispensed medicine quantity from the pharmacy inventory CSV.
    Updates the availability status ('available', 'limited', 'out_of_stock').
    """
    if not os.path.exists(DATASET_PATH) or quantity <= 0:
        return {"status": "error", "message": "Inventory file not found or invalid quantity"}

    try:
        df = pd.read_csv(DATASET_PATH)
        match = _find_matches(df, medicine_name)
        if match.empty:
            return {"status": "error", "message": "Medicine not found in inventory"}

        idx = match.index[0]
        curr_qty = int(df.at[idx, 'quantity'])
        if curr_qty < quantity:
            return {"status": "insufficient", "available_qty": curr_qty}

        new_qty = curr_qty - quantity
        df.at[idx, 'quantity'] = new_qty

        if new_qty == 0:
            df.at[idx, 'availability'] = 'out_of_stock'
        elif new_qty < 30:
            df.at[idx, 'availability'] = 'limited'
        else:
            df.at[idx, 'availability'] = 'available'

        df.to_csv(DATASET_PATH, index=False)
        return {
            "status": "success",
            "medicine_name": df.at[idx, 'medicine_name'],
            "dispensed": quantity,
            "remaining": new_qty,
            "availability": df.at[idx, 'availability']
        }
    except Exception as e:
        print("Pharmacy dispense error:", e)
        return {"status": "error", "message": str(e)}
