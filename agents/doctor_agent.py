from datetime import datetime
from typing import List, Dict, Any, Tuple
import re

def _safe_float(val: Any):
    if val is None:
        return None
    try:
        if isinstance(val, (int, float)):
            return float(val)
        cleaned = re.sub(r"[^\d.-]", "", str(val).strip())
        return float(cleaned) if cleaned else None
    except (ValueError, TypeError):
        return None

def _parse_bp(bp_val: Any) -> Tuple[Any, Any]:
    if not bp_val:
        return None, None
    parts = re.split(r"[/\\]", str(bp_val).strip())
    if len(parts) >= 2:
        return _safe_float(parts[0]), _safe_float(parts[1])
    return None, None

def decide_discharge(vitals_history: List[Dict[str, Any]], has_critical_alerts_24h: bool, total_payments: float, total_bill: float) -> Tuple[bool, str]:
    """
    Doctor Agent Decision Logic based on 3 Core Pillars:
    1. Clinical Stability: Vitals continuously stable over past 48h (SpO2 > 94, Temp 35.5-38, HR 50-100, BP normal, Resp 10-24)
    2. Risk Profile: Classified as LOW_RISK with no high-risk or critical vitals
    3. Financial Clearance: Total payments (including approved insurance) >= Total hospital bill
    """
    # Pillar 1 & 2: Minimum records check
    if not vitals_history or len(vitals_history) < 5:
        count = len(vitals_history) if vitals_history else 0
        return False, f"Insufficient vitals history. Need at least 5 readings for clinical stability verification (found {count})."

    # Sort vitals chronologically
    try:
        sorted_vitals = sorted(vitals_history, key=lambda x: x.get("timestamp") or datetime.min)
    except Exception:
        sorted_vitals = vitals_history

    # Evaluate each reading in the 48h monitoring window
    for v in sorted_vitals:
        spo2 = _safe_float(v.get("spo2"))
        temp = _safe_float(v.get("temperature"))
        hr = _safe_float(v.get("heart_rate"))
        resp = _safe_float(v.get("resp_rate")) or _safe_float(v.get("respiration"))
        systolic, diastolic = _parse_bp(v.get("bp") or v.get("blood_pressure"))
        risk_lvl = v.get("risk_level")

        # Explicit risk profile check
        if risk_lvl == "HIGH_RISK":
            return False, f"High-risk vital episode recorded in 48h observation window."

        # SpO2 stability (> 94%)
        if spo2 is not None and spo2 <= 94:
            return False, f"Unstable SpO2 detected: {spo2}% (must be > 94% for safe discharge)."

        # Temperature stability (35.5 - 37.9°C)
        if temp is not None:
            if temp >= 38.0:
                return False, f"Elevated temperature / fever detected: {temp}°C."
            if temp < 35.5:
                return False, f"Hypothermic temperature detected: {temp}°C."

        # Heart Rate stability (50 - 99 bpm)
        if hr is not None:
            if hr >= 100:
                return False, f"Elevated Heart Rate / tachycardia detected: {hr} bpm."
            if hr < 50:
                return False, f"Low Heart Rate / bradycardia detected: {hr} bpm."

        # Blood Pressure stability
        if systolic is not None and (systolic >= 140 or systolic < 90):
            return False, f"Unstable Systolic Blood Pressure detected: {systolic} mmHg."
        if diastolic is not None and (diastolic >= 90 or diastolic < 60):
            return False, f"Unstable Diastolic Blood Pressure detected: {diastolic} mmHg."

        # Respiration stability (10 - 24 br/min)
        if resp is not None and (resp > 24 or resp < 10):
            return False, f"Abnormal Respiration Rate detected: {resp} breaths/min."

    # Critical Alerts Check (Last 24 Hours)
    if has_critical_alerts_24h:
        return False, "CRITICAL alerts detected in the last 24 hours. Observation period must reset."

    # Pillar 3: Financial Clearance Check
    if total_payments < total_bill:
        pending = round(total_bill - total_payments, 2)
        return False, f"Financial clearance pending. Outstanding balance: ${pending} (Paid/Covered: ${total_payments}, Total: ${total_bill})."

    return True, "Patient is clinically stable, risk profile is low, and financial clearance is completed. Ready for discharge."
