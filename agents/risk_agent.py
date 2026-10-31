from datetime import datetime
from typing import List, Dict, Any, Tuple, Optional
import re

def safe_float(val: Any) -> Optional[float]:
    """Safely converts an input value to a float, stripping extraneous text."""
    if val is None:
        return None
    try:
        if isinstance(val, (int, float)):
            return float(val)
        if isinstance(val, str):
            cleaned = re.sub(r"[^\d.-]", "", val.strip())
            return float(cleaned) if cleaned else None
        return float(val)
    except (ValueError, TypeError):
        return None

def parse_bp(bp_val: Any) -> Tuple[Optional[float], Optional[float]]:
    """Extracts systolic and diastolic values from strings like '120/80'."""
    if not bp_val:
        return None, None
    if isinstance(bp_val, (tuple, list)) and len(bp_val) >= 2:
        return safe_float(bp_val[0]), safe_float(bp_val[1])
    if not isinstance(bp_val, str):
        bp_val = str(bp_val)
    parts = re.split(r"[/\\]", bp_val.strip())
    if len(parts) >= 2:
        return safe_float(parts[0]), safe_float(parts[1])
    return None, None

def analyze_vitals(vitals: Dict[str, Any]) -> str:
    """
    Evaluates vitals against clinical safety thresholds.
    Returns:
      'HIGH_RISK' if any vital is in high-risk or critical range.
      'LOW_RISK' if all monitored vitals are within safe clinical limits.
    """
    spo2 = safe_float(vitals.get("spo2"))
    temp = safe_float(vitals.get("temperature"))
    hr = safe_float(vitals.get("heart_rate"))
    resp = safe_float(vitals.get("resp_rate")) or safe_float(vitals.get("respiration"))
    systolic, diastolic = parse_bp(vitals.get("bp") or vitals.get("blood_pressure"))

    # 1. SpO2: Normal 95-100%, High Risk < 90%
    if spo2 is not None and spo2 < 90:
        return "HIGH_RISK"

    # 2. Heart Rate: Normal 60-100, High Risk > 120 or < 50
    if hr is not None and (hr > 120 or hr < 50):
        return "HIGH_RISK"

    # 3. Temperature: Normal 36.5-37.5, High Risk > 38.5 or < 35.5
    if temp is not None and (temp > 38.5 or temp < 35.5):
        return "HIGH_RISK"

    # 4. Blood Pressure: Normal 90-120 / 60-80
    if systolic is not None and (systolic >= 140 or systolic < 90):
        return "HIGH_RISK"
    if diastolic is not None and (diastolic >= 90 or diastolic < 60):
        return "HIGH_RISK"

    # 5. Respiration Rate: Normal 12-20, High Risk > 24 or < 10
    if resp is not None and (resp > 24 or resp < 10):
        return "HIGH_RISK"

    return "LOW_RISK"

def calculate_news2_score(vitals: Dict[str, Any]) -> Dict[str, Any]:
    """
    Computes the National Early Warning Score 2 (NEWS2), the international
    clinical gold standard for detecting acute illness and patient deterioration.
    
    Subscores for:
      - Respiration Rate
      - SpO2 (Scale 1)
      - Systolic Blood Pressure
      - Pulse / Heart Rate
      - Temperature
      
    Triggers:
      - 0-4: Low Clinical Risk
      - Individual score of 3: Low-Medium Clinical Risk (Urgent individual trigger)
      - 5-6: Medium Clinical Risk (Key escalation trigger)
      - 7+: High Clinical Risk (High clinical emergency)
    """
    subscores: Dict[str, int] = {}
    
    # 1. Respiration Rate
    resp = safe_float(vitals.get("resp_rate")) or safe_float(vitals.get("respiration"))
    if resp is not None:
        if resp <= 8:
            subscores["resp_rate"] = 3
        elif resp <= 11:
            subscores["resp_rate"] = 1
        elif resp <= 20:
            subscores["resp_rate"] = 0
        elif resp <= 24:
            subscores["resp_rate"] = 2
        else:
            subscores["resp_rate"] = 3
    else:
        subscores["resp_rate"] = 0

    # 2. SpO2 (Scale 1 standard)
    spo2 = safe_float(vitals.get("spo2"))
    if spo2 is not None:
        if spo2 <= 91:
            subscores["spo2"] = 3
        elif spo2 <= 93:
            subscores["spo2"] = 2
        elif spo2 <= 95:
            subscores["spo2"] = 1
        else:
            subscores["spo2"] = 0
    else:
        subscores["spo2"] = 0

    # 3. Systolic Blood Pressure
    systolic, _ = parse_bp(vitals.get("bp") or vitals.get("blood_pressure"))
    if systolic is not None:
        if systolic <= 90:
            subscores["systolic_bp"] = 3
        elif systolic <= 100:
            subscores["systolic_bp"] = 2
        elif systolic <= 110:
            subscores["systolic_bp"] = 1
        elif systolic <= 219:
            subscores["systolic_bp"] = 0
        else:
            subscores["systolic_bp"] = 3
    else:
        subscores["systolic_bp"] = 0

    # 4. Heart Rate / Pulse
    hr = safe_float(vitals.get("heart_rate"))
    if hr is not None:
        if hr <= 40:
            subscores["heart_rate"] = 3
        elif hr <= 50:
            subscores["heart_rate"] = 1
        elif hr <= 90:
            subscores["heart_rate"] = 0
        elif hr <= 110:
            subscores["heart_rate"] = 1
        elif hr <= 130:
            subscores["heart_rate"] = 2
        else:
            subscores["heart_rate"] = 3
    else:
        subscores["heart_rate"] = 0

    # 5. Temperature
    temp = safe_float(vitals.get("temperature"))
    if temp is not None:
        if temp <= 35.0:
            subscores["temperature"] = 3
        elif temp <= 36.0:
            subscores["temperature"] = 1
        elif temp <= 38.0:
            subscores["temperature"] = 0
        elif temp <= 39.0:
            subscores["temperature"] = 1
        else:
            subscores["temperature"] = 2
    else:
        subscores["temperature"] = 0

    total_score = sum(subscores.values())
    has_red_score = any(s >= 3 for s in subscores.values())

    if total_score >= 7:
        risk_category = "HIGH"
        monitoring_plan = "Continuous telemetry & urgent senior medical review"
        action_required = "Immediate escalation to critical care / intensive therapy team"
    elif total_score >= 5 or has_red_score:
        risk_category = "MEDIUM"
        monitoring_plan = "Minimum 1-hourly monitoring"
        action_required = "Urgent clinical review by attending physician"
    elif total_score >= 1:
        risk_category = "LOW"
        monitoring_plan = "4 to 6 hourly monitoring"
        action_required = "Standard ward clinical care & routine observations"
    else:
        risk_category = "LOW"
        monitoring_plan = "12-hourly monitoring"
        action_required = "Patient clinically stable. Favorable trajectory."

    return {
        "total_score": total_score,
        "risk_category": risk_category,
        "has_red_score": has_red_score,
        "subscores": subscores,
        "monitoring_plan": monitoring_plan,
        "action_required": action_required
    }

def calculate_composite_risk_score(vitals: Dict[str, Any]) -> float:
    """
    Calculates a continuous 0-100% composite physiological risk score.
    0% = perfectly optimal vitals, 100% = extreme multi-organ instability.
    """
    spo2 = safe_float(vitals.get("spo2"))
    temp = safe_float(vitals.get("temperature"))
    hr = safe_float(vitals.get("heart_rate"))
    resp = safe_float(vitals.get("resp_rate")) or safe_float(vitals.get("respiration"))
    systolic, diastolic = parse_bp(vitals.get("bp") or vitals.get("blood_pressure"))

    penalty = 0.0

    # SpO2 penalty (Optimal: 96-100)
    if spo2 is not None:
        if spo2 < 85:
            penalty += 35.0
        elif spo2 < 90:
            penalty += 25.0
        elif spo2 < 95:
            penalty += 10.0

    # Heart Rate penalty (Optimal: 60-90)
    if hr is not None:
        if hr > 140 or hr < 40:
            penalty += 30.0
        elif hr > 120 or hr < 50:
            penalty += 20.0
        elif hr > 100 or hr < 55:
            penalty += 10.0

    # Temperature penalty (Optimal: 36.5-37.5)
    if temp is not None:
        if temp > 40.0 or temp < 35.0:
            penalty += 25.0
        elif temp > 38.5 or temp < 35.5:
            penalty += 18.0
        elif temp > 37.8 or temp < 36.0:
            penalty += 8.0

    # Blood Pressure penalty (Optimal: 110-125 / 70-82)
    if systolic is not None:
        if systolic >= 180 or systolic < 80:
            penalty += 30.0
        elif systolic >= 140 or systolic < 90:
            penalty += 18.0
        elif systolic >= 130 or systolic < 100:
            penalty += 8.0

    if diastolic is not None:
        if diastolic >= 120 or diastolic < 50:
            penalty += 25.0
        elif diastolic >= 90 or diastolic < 60:
            penalty += 15.0

    # Respiration Rate penalty (Optimal: 12-18)
    if resp is not None:
        if resp > 30 or resp < 8:
            penalty += 30.0
        elif resp > 24 or resp < 10:
            penalty += 18.0
        elif resp > 20:
            penalty += 8.0

    return round(min(100.0, penalty), 1)

def detect_alerts(patient_id: str, vitals: Dict[str, Any]) -> List[Dict[str, Any]]:
    """
    Comprehensive vital sign alert detection for both Critical emergencies
    and High-Risk abnormalities. Returns structured alert records.
    """
    alerts = []
    now = datetime.now()

    spo2 = safe_float(vitals.get("spo2"))
    temp = safe_float(vitals.get("temperature"))
    hr = safe_float(vitals.get("heart_rate"))
    resp = safe_float(vitals.get("resp_rate")) or safe_float(vitals.get("respiration"))
    systolic, diastolic = parse_bp(vitals.get("bp") or vitals.get("blood_pressure"))

    # 1. SpO2 Alerts
    if spo2 is not None:
        if spo2 < 85:
            alerts.append({
                "patient_id": patient_id,
                "alert_type": "CRITICAL_VITAL",
                "severity": "CRITICAL",
                "vital": "SpO2",
                "value": spo2,
                "message": f"CRITICAL: SpO2 dangerously low ({spo2}%). Severe hypoxia risk.",
                "timestamp": now
            })
        elif spo2 < 90:
            alerts.append({
                "patient_id": patient_id,
                "alert_type": "HIGH_RISK_VITAL",
                "severity": "HIGH",
                "vital": "SpO2",
                "value": spo2,
                "message": f"HIGH RISK: SpO2 abnormally low ({spo2}%). Hypoxemia detected.",
                "timestamp": now
            })

    # 2. Heart Rate Alerts
    if hr is not None:
        if hr > 140:
            alerts.append({
                "patient_id": patient_id,
                "alert_type": "CRITICAL_VITAL",
                "severity": "CRITICAL",
                "vital": "Heart Rate",
                "value": hr,
                "message": f"CRITICAL: Heart Rate dangerously high ({hr} bpm). Severe tachycardia.",
                "timestamp": now
            })
        elif hr > 120:
            alerts.append({
                "patient_id": patient_id,
                "alert_type": "HIGH_RISK_VITAL",
                "severity": "HIGH",
                "vital": "Heart Rate",
                "value": hr,
                "message": f"HIGH RISK: Elevated Heart Rate ({hr} bpm). Tachycardia warning.",
                "timestamp": now
            })
        elif hr < 40:
            alerts.append({
                "patient_id": patient_id,
                "alert_type": "CRITICAL_VITAL",
                "severity": "CRITICAL",
                "vital": "Heart Rate",
                "value": hr,
                "message": f"CRITICAL: Heart Rate dangerously low ({hr} bpm). Severe bradycardia.",
                "timestamp": now
            })
        elif hr < 50:
            alerts.append({
                "patient_id": patient_id,
                "alert_type": "HIGH_RISK_VITAL",
                "severity": "HIGH",
                "vital": "Heart Rate",
                "value": hr,
                "message": f"HIGH RISK: Low Heart Rate ({hr} bpm). Bradycardia warning.",
                "timestamp": now
            })

    # 3. Temperature Alerts
    if temp is not None:
        if temp > 40.0:
            alerts.append({
                "patient_id": patient_id,
                "alert_type": "CRITICAL_VITAL",
                "severity": "CRITICAL",
                "vital": "Temperature",
                "value": temp,
                "message": f"CRITICAL: Temperature dangerously high ({temp}°C). Hyperpyrexia alert.",
                "timestamp": now
            })
        elif temp > 38.5:
            alerts.append({
                "patient_id": patient_id,
                "alert_type": "HIGH_RISK_VITAL",
                "severity": "HIGH",
                "vital": "Temperature",
                "value": temp,
                "message": f"HIGH RISK: High fever detected ({temp}°C).",
                "timestamp": now
            })
        elif temp < 35.0:
            alerts.append({
                "patient_id": patient_id,
                "alert_type": "CRITICAL_VITAL",
                "severity": "CRITICAL",
                "vital": "Temperature",
                "value": temp,
                "message": f"CRITICAL: Temperature dangerously low ({temp}°C). Severe hypothermia.",
                "timestamp": now
            })
        elif temp < 35.5:
            alerts.append({
                "patient_id": patient_id,
                "alert_type": "HIGH_RISK_VITAL",
                "severity": "HIGH",
                "vital": "Temperature",
                "value": temp,
                "message": f"HIGH RISK: Hypothermia warning ({temp}°C).",
                "timestamp": now
            })

    # 4. Blood Pressure Alerts
    if systolic is not None or diastolic is not None:
        bp_label = f"{int(systolic) if systolic else '--'}/{int(diastolic) if diastolic else '--'}"
        if (systolic is not None and systolic >= 180) or (diastolic is not None and diastolic >= 120):
            alerts.append({
                "patient_id": patient_id,
                "alert_type": "CRITICAL_VITAL",
                "severity": "CRITICAL",
                "vital": "Blood Pressure",
                "value": bp_label,
                "message": f"CRITICAL: Hypertensive crisis (BP {bp_label} mmHg).",
                "timestamp": now
            })
        elif systolic is not None and systolic < 80:
            alerts.append({
                "patient_id": patient_id,
                "alert_type": "CRITICAL_VITAL",
                "severity": "CRITICAL",
                "vital": "Blood Pressure",
                "value": bp_label,
                "message": f"CRITICAL: Severe hypotension / shock (BP {bp_label} mmHg).",
                "timestamp": now
            })
        elif (systolic is not None and systolic >= 140) or (diastolic is not None and diastolic >= 90):
            alerts.append({
                "patient_id": patient_id,
                "alert_type": "HIGH_RISK_VITAL",
                "severity": "HIGH",
                "vital": "Blood Pressure",
                "value": bp_label,
                "message": f"HIGH RISK: High Blood Pressure (BP {bp_label} mmHg). Hypertension warning.",
                "timestamp": now
            })
        elif (systolic is not None and systolic < 90) or (diastolic is not None and diastolic < 60):
            alerts.append({
                "patient_id": patient_id,
                "alert_type": "HIGH_RISK_VITAL",
                "severity": "HIGH",
                "vital": "Blood Pressure",
                "value": bp_label,
                "message": f"HIGH RISK: Low Blood Pressure (BP {bp_label} mmHg). Hypotension detected.",
                "timestamp": now
            })

    # 5. Respiration Rate Alerts
    if resp is not None:
        if resp > 30:
            alerts.append({
                "patient_id": patient_id,
                "alert_type": "CRITICAL_VITAL",
                "severity": "CRITICAL",
                "vital": "Resp Rate",
                "value": resp,
                "message": f"CRITICAL: Severe Tachypnea ({resp} br/min). Acute respiratory distress.",
                "timestamp": now
            })
        elif resp > 24:
            alerts.append({
                "patient_id": patient_id,
                "alert_type": "HIGH_RISK_VITAL",
                "severity": "HIGH",
                "vital": "Resp Rate",
                "value": resp,
                "message": f"HIGH RISK: Elevated Respiration ({resp} br/min). Tachypnea warning.",
                "timestamp": now
            })
        elif resp < 8:
            alerts.append({
                "patient_id": patient_id,
                "alert_type": "CRITICAL_VITAL",
                "severity": "CRITICAL",
                "vital": "Resp Rate",
                "value": resp,
                "message": f"CRITICAL: Severe Bradypnea ({resp} br/min). Respiratory failure risk.",
                "timestamp": now
            })
        elif resp < 10:
            alerts.append({
                "patient_id": patient_id,
                "alert_type": "HIGH_RISK_VITAL",
                "severity": "HIGH",
                "vital": "Resp Rate",
                "value": resp,
                "message": f"HIGH RISK: Low Respiration ({resp} br/min). Bradypnea detected.",
                "timestamp": now
            })

    return alerts

def detect_critical_alerts(patient_id: str, vitals: Dict[str, Any]) -> List[Dict[str, Any]]:
    """
    Backward-compatible method returning only CRITICAL severity vital alerts.
    """
    all_alerts = detect_alerts(patient_id, vitals)
    return [a for a in all_alerts if a.get("severity") == "CRITICAL" or a.get("alert_type") == "CRITICAL_VITAL"]

def evaluate_vitals_trend(vitals_history: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Longitudinal trend analysis across a patient's historical vital records.
    Detects trajectory: IMPROVING, STABLE, or DETERIORATING.
    Identifies acute shifts in SpO2, Heart Rate, and Blood Pressure.
    """
    if not vitals_history or len(vitals_history) < 2:
        return {
            "trend_direction": "STABLE",
            "is_stable": True,
            "observations_count": len(vitals_history) if vitals_history else 0,
            "deterioration_warnings": [],
            "summary": "Insufficient readings for longitudinal trend evaluation."
        }

    # Sort chronological
    try:
        sorted_history = sorted(
            vitals_history, 
            key=lambda x: x.get("timestamp") or datetime.min
        )
    except Exception:
        sorted_history = vitals_history

    warnings = []
    first_rec = sorted_history[0]
    last_rec = sorted_history[-1]

    spo2_first = safe_float(first_rec.get("spo2"))
    spo2_last = safe_float(last_rec.get("spo2"))
    hr_first = safe_float(first_rec.get("heart_rate"))
    hr_last = safe_float(last_rec.get("heart_rate"))
    temp_first = safe_float(first_rec.get("temperature"))
    temp_last = safe_float(last_rec.get("temperature"))

    deteriorating_points = 0
    improving_points = 0

    # SpO2 trend
    if spo2_first is not None and spo2_last is not None:
        delta_spo2 = spo2_last - spo2_first
        if delta_spo2 <= -4.0:
            warnings.append(f"SpO2 decreased by {abs(delta_spo2):.1f}% across observation window.")
            deteriorating_points += 2
        elif delta_spo2 >= 3.0:
            improving_points += 1

    # Heart Rate trend
    if hr_first is not None and hr_last is not None:
        delta_hr = hr_last - hr_first
        if delta_hr >= 25.0:
            warnings.append(f"Tachycardic acceleration: Heart rate climbed by +{delta_hr:.0f} bpm.")
            deteriorating_points += 2
        elif abs(delta_hr) <= 10.0 and 60 <= hr_last <= 95:
            improving_points += 1

    # Temperature trend
    if temp_first is not None and temp_last is not None:
        delta_temp = temp_last - temp_first
        if delta_temp >= 1.2 and temp_last >= 38.0:
            warnings.append(f"Fever spike detected (+{delta_temp:.1f}°C to {temp_last}°C).")
            deteriorating_points += 2
        elif delta_temp <= -0.8 and 36.5 <= temp_last <= 37.3:
            improving_points += 1

    # Overall recent stability
    recent_risk_levels = [v.get("risk_level") for v in sorted_history[-5:]]
    if any(r == "HIGH_RISK" for r in recent_risk_levels):
        deteriorating_points += 1

    if deteriorating_points >= 2:
        trend = "DETERIORATING"
        is_stable = False
    elif improving_points >= 2 and deteriorating_points == 0:
        trend = "IMPROVING"
        is_stable = True
    else:
        trend = "STABLE"
        is_stable = (deteriorating_points == 0)

    summary = (
        f"Patient trajectory is {trend}. "
        f"Evaluated {len(sorted_history)} readings. "
        + (" ".join(warnings) if warnings else "Vitals demonstrating steady equilibrium.")
    )

    return {
        "trend_direction": trend,
        "is_stable": is_stable,
        "observations_count": len(sorted_history),
        "deterioration_warnings": warnings,
        "summary": summary
    }

def assess_patient_risk(patient_id: str, vitals: Dict[str, Any], vitals_history: Optional[List[Dict[str, Any]]] = None) -> Dict[str, Any]:
    """
    Comprehensive multi-modal clinical risk assessment orchestration.
    Returns:
      - risk_level (LOW_RISK, HIGH_RISK)
      - news2 (complete clinical score + clinical triggers)
      - composite_risk_score (0-100%)
      - alerts (critical + high risk)
      - longitudinal_trend (if history provided)
      - clinical_recommendations
    """
    risk_level = analyze_vitals(vitals)
    news2 = calculate_news2_score(vitals)
    composite_score = calculate_composite_risk_score(vitals)
    alerts = detect_alerts(patient_id, vitals)

    trend_info = evaluate_vitals_trend(vitals_history) if vitals_history else None

    recommendations = []
    if news2["total_score"] >= 7:
        recommendations.append("High clinical risk: Immediate medical escalation required.")
    elif news2["total_score"] >= 5:
        recommendations.append("Medium clinical risk: Increase vital checks to every 1 hour.")
    else:
        recommendations.append("Routine vital observation: Patient meets baseline safety profile.")

    if any(a.get("vital") == "SpO2" for a in alerts):
        recommendations.append("Evaluate airway patency and consider supplemental oxygen.")
    if any(a.get("vital") == "Heart Rate" for a in alerts):
        recommendations.append("Perform 12-lead ECG to rule out cardiac arrhythmias.")
    if any(a.get("vital") == "Temperature" for a in alerts):
        recommendations.append("Initiate infection/sepsis protocol and hydration therapy.")

    return {
        "patient_id": patient_id,
        "risk_level": risk_level,
        "news2": news2,
        "composite_risk_score": composite_score,
        "alerts_count": len(alerts),
        "critical_alerts_count": len([a for a in alerts if a.get("severity") == "CRITICAL"]),
        "alerts": alerts,
        "trend": trend_info,
        "recommendations": recommendations,
        "timestamp": datetime.now().isoformat()
    }

class RiskAssessmentAgent:
    """
    Agentic AI Risk Assessment Agent.
    Orchestrates vital sign interpretation, computer vision data translation,
    NEWS2 scoring, and clinical safety alerting.
    """
    def __init__(self, agent_name: str = "VitalGuard Risk Agent"):
        self.agent_name = agent_name

    def evaluate(self, patient_id: str, vitals: Dict[str, Any], vitals_history: Optional[List[Dict[str, Any]]] = None) -> Dict[str, Any]:
        return assess_patient_risk(patient_id, vitals, vitals_history)

    def is_safe_for_discharge(self, vitals_history: List[Dict[str, Any]]) -> Tuple[bool, str]:
        """Validates that patient has sustained physiological stability."""
        if not vitals_history or len(vitals_history) < 5:
            return False, f"Insufficient records for stability clearance (found {len(vitals_history) if vitals_history else 0}, need >= 5)."
        
        trend = evaluate_vitals_trend(vitals_history)
        if not trend["is_stable"]:
            return False, f"Unstable physiological trajectory: {trend['summary']}"

        latest = vitals_history[-1] if vitals_history else {}
        latest_risk = analyze_vitals(latest)
        if latest_risk == "HIGH_RISK":
            return False, "Latest recorded vitals remain in HIGH_RISK category."

        return True, "Patient exhibits sustained physiological stability."
