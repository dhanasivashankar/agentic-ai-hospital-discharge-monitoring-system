from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Request
from bson import ObjectId
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import shutil
import os
import uuid
from datetime import datetime, timedelta
from typing import List, Optional
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle

# Database
from database.mongodb import db, patients_col, vitals_col, billing_col, insurance_col, alerts_col, prescriptions_col, payments_col
import hashlib

# Collections
users_col = db.users

# Agents
from agents.risk_agent import (
    analyze_vitals, 
    detect_alerts, 
    detect_critical_alerts,
    calculate_news2_score,
    calculate_composite_risk_score,
    assess_patient_risk,
    evaluate_vitals_trend
)
from agents.pharmacy_agent import check_medicine_availability, get_medicine_price, dispense_medicine
from agents.billing_agent import calculate_bill
from agents.insurance_agent import check_insurance_eligibility
from agents.doctor_agent import decide_discharge

# Existing OCR Module
from vital_extractor.extractor import VitalExtractor
from vital_extractor.preprocess import preprocess_image, load_image



app = FastAPI(title="AI Hospital Monitoring System")

# Helper for security
async def verify_admin(request: Request):
    role = request.headers.get("X-Role")
    if role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")

async def verify_patient_exists(patient_id: str):
    p_id = str(patient_id).strip().lower()
    patient = await patients_col.find_one({"patient_id": p_id})
    if not patient:
        patient = await patients_col.find_one({"patient_id": {"$regex": f"^{p_id}$", "$options": "i"}})
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    return patient

async def verify_patient_active(patient_id: str):
    patient = await verify_patient_exists(patient_id)
    if patient.get("discharge"):
        raise HTTPException(status_code=400, detail="Patient is already discharged")
    return patient

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Static Files for Frontend
os.makedirs("frontend", exist_ok=True)
os.makedirs("uploads", exist_ok=True)
os.makedirs("reports", exist_ok=True)
app.mount("/frontend", StaticFiles(directory="frontend"), name="frontend")
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")
app.mount("/reports", StaticFiles(directory="reports"), name="reports")

# OCR Extractor Instance
extractor = VitalExtractor()

# Helper for password hashing
def hash_password(password: str):
    return hashlib.sha256(password.encode()).hexdigest()

@app.on_event("startup")
async def seed_admin():
    admin = await users_col.find_one({"email": "admin@hospital.com"})
    if not admin:
        await users_col.insert_one({
            "email": "admin@hospital.com",
            "password": hash_password("admin123"),
            "role": "admin"
        })
        print("Admin user seeded: admin@hospital.com / admin123")

@app.get("/")
async def root():
    return {
        "status": "online",
        "service": "AI Hospital Discharge & Vital Monitoring System",
        "docs_url": "/docs",
        "health": "/health"
    }

@app.get("/health")
async def health_check():
    return {"status": "ok", "timestamp": datetime.now().isoformat()}

@app.post("/login")
async def login(email: str = Form(None), password: str = Form(None), patient_id: str = Form(None)):
    if patient_id:
        p_id = patient_id.lower()
        patient = await patients_col.find_one({"patient_id": p_id})
        if not patient:
            raise HTTPException(status_code=404, detail="Patient ID not found")
        return {"role": "patient", "patient_id": p_id, "name": patient['name']}
    
    if email and password:
        user = await users_col.find_one({"email": email, "password": hash_password(password)})
        if not user:
            raise HTTPException(status_code=401, detail="Invalid admin credentials")
        return {"role": "admin", "email": email, "token": "admin-session-id"} # Simplified token
        
    raise HTTPException(status_code=400, detail="Missing login credentials")

@app.post("/register_patient")
async def register_patient(
    request: Request,
    name: str = Form(...),
    age: int = Form(...),
    disease: str = Form(...),
    doctor: str = Form(...),
    bed_number: str = Form(...),
):
    await verify_admin(request)
    patient_id = str(uuid.uuid4())[:8]
    patient_data = {
        "patient_id": patient_id,
        "name": name,
        "age": age,
        "disease": disease,
        "doctor": doctor,
        "bed_number": bed_number,
        "status": "admitted",  # Default status
        "discharge": False,
        "admission_date": datetime.now(),
        "bill_paid": False
    }
    await patients_col.insert_one(patient_data)
    return {"message": "Patient registered successfully", "patient_id": patient_id}

@app.post("/upload_vitals")
async def upload_vitals(
    request: Request,
    patient_id: str = Form(...),
    image: UploadFile = File(...),
    heart_rate: Optional[float] = Form(None),
    spo2: Optional[float] = Form(None),
    bp: Optional[str] = Form(None),
    resp_rate: Optional[float] = Form(None),
    temperature: Optional[float] = Form(None)
):
    await verify_admin(request)
    patient_id = patient_id.strip().lower()
    await verify_patient_active(patient_id)

    os.makedirs("uploads", exist_ok=True)
    file_path = os.path.join("uploads", f"{uuid.uuid4()}_{image.filename}")
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(image.file, buffer)
    
    # OCR Extraction
    try:
        # First pass: high-fidelity original image
        extracted_vitals = extractor.extract_vitals_from_image(file_path, filename=image.filename)
        
        # Fallback pass: if key vitals are missing, try preprocessed image
        if any(extracted_vitals.get(k) is None for k in ["heart_rate", "spo2", "blood_pressure", "respiration", "temperature"]):
            try:
                img_bgr = load_image(file_path)
                processed_img = preprocess_image(img_bgr)
                fallback_vitals = extractor.extract_vitals_from_image(processed_img, filename=image.filename)
                for k, val in fallback_vitals.items():
                    if extracted_vitals.get(k) is None and val is not None:
                        extracted_vitals[k] = val
            except Exception:
                pass
        
        # Priority: Explicit manual form fields > OCR extracted > safe clinical defaults
        v_hr = heart_rate if heart_rate is not None else extracted_vitals.get("heart_rate")
        v_spo2 = spo2 if spo2 is not None else extracted_vitals.get("spo2")
        v_bp = bp or extracted_vitals.get("blood_pressure") or extracted_vitals.get("bp") or "120/80"
        v_resp = resp_rate if resp_rate is not None else (extracted_vitals.get("respiration") or extracted_vitals.get("resp_rate"))
        v_temp = temperature if temperature is not None else extracted_vitals.get("temperature")

        vitals = {
            "heart_rate": v_hr if v_hr is not None else 76,
            "spo2": v_spo2 if v_spo2 is not None else 98,
            "bp": v_bp,
            "resp_rate": v_resp if v_resp is not None else 16,
            "temperature": v_temp if v_temp is not None else 37.0,
        }

        # Risk Agent Analysis
        risk_level = analyze_vitals(vitals)
        news2_data = calculate_news2_score(vitals)
        composite_score = calculate_composite_risk_score(vitals)
        
        # Store Vitals
        vitals_data = {
            "patient_id": patient_id,
            "image_path": str(file_path),
            "heart_rate": vitals.get("heart_rate"),
            "spo2": vitals.get("spo2"),
            "bp": vitals.get("bp"),
            "resp_rate": vitals.get("resp_rate"),
            "temperature": vitals.get("temperature"),
            "risk_level": risk_level,
            "news2_score": news2_data.get("total_score", 0),
            "news2_category": news2_data.get("risk_category", "LOW"),
            "composite_risk_score": composite_score,
            "timestamp": datetime.now()
        }
        await vitals_col.insert_one(vitals_data)
        
        # Comprehensive Alert Detection (both Critical and High-Risk)
        all_alerts = detect_alerts(patient_id, vitals)
        if all_alerts:
            for a in all_alerts:
                a["resolved"] = False
            await alerts_col.insert_many(all_alerts)

        critical_alerts = [a for a in all_alerts if a.get("severity") == "CRITICAL" or a.get("alert_type") == "CRITICAL_VITAL"]
        high_risk_alerts = [a for a in all_alerts if a.get("severity") != "CRITICAL" and a.get("alert_type") != "CRITICAL_VITAL"]

        # Update patient status based on severity & auto-resolve alerts when next vitals are good
        alerts_resolved = False
        if critical_alerts:
            await patients_col.update_one({"patient_id": patient_id}, {"$set": {"status": "critical"}})
        elif risk_level == "HIGH_RISK":
            patient_current = await patients_col.find_one({"patient_id": patient_id})
            if patient_current and patient_current.get("status") not in ["discharged", "critical"]:
                await patients_col.update_one({"patient_id": patient_id}, {"$set": {"status": "high_risk"}})
        else:
            # Next vitals are good/normal: normalize status and auto-resolve previous active alerts
            patient_current = await patients_col.find_one({"patient_id": patient_id})
            if patient_current and patient_current.get("status") in ["critical", "high_risk"]:
                await patients_col.update_one({"patient_id": patient_id}, {"$set": {"status": "admitted"}})
            # Mark all previous unresolved alerts as resolved
            await alerts_col.update_many(
                {"patient_id": patient_id, "resolved": {"$ne": True}},
                {"$set": {"resolved": True, "resolved_at": datetime.now(), "resolved_by": "normalized_vitals"}}
            )
            alerts_resolved = True
        
        return {
            "status": "success",
            "vitals": vitals,
            "risk_level": risk_level,
            "news2": news2_data,
            "composite_risk_score": composite_score,
            "critical_alerts": [a['message'] for a in critical_alerts],
            "risk_alerts": [a['message'] for a in high_risk_alerts],
            "all_alerts": [a['message'] for a in all_alerts],
            "alerts_resolved": alerts_resolved
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/add_vitals")
async def add_vitals(request: Request):
    await verify_admin(request)
    content_type = request.headers.get("content-type", "")
    
    patient_id = None
    heart_rate = None
    spo2 = None
    bp = None
    resp_rate = None
    temperature = None

    if "application/json" in content_type:
        try:
            body = await request.json()
            patient_id = body.get("patient_id")
            heart_rate = body.get("heart_rate")
            spo2 = body.get("spo2")
            bp = body.get("bp")
            resp_rate = body.get("resp_rate")
            temperature = body.get("temperature")
        except Exception:
            pass
    
    if not patient_id:
        form = await request.form()
        patient_id = form.get("patient_id")
        heart_rate = form.get("heart_rate")
        spo2 = form.get("spo2")
        bp = form.get("bp")
        resp_rate = form.get("resp_rate")
        temperature = form.get("temperature")

    if not patient_id:
        raise HTTPException(status_code=400, detail="patient_id is required")

    patient_id = str(patient_id).strip().lower()
    await verify_patient_active(patient_id)

    def _to_float(v, default):
        if v is None or v == "":
            return default
        try:
            return float(v)
        except (ValueError, TypeError):
            return default

    try:
        vitals = {
            "heart_rate": _to_float(heart_rate, 76),
            "spo2": _to_float(spo2, 98),
            "bp": str(bp).strip() if bp else "120/80",
            "resp_rate": _to_float(resp_rate, 16),
            "temperature": _to_float(temperature, 37.0),
        }

        risk_level = analyze_vitals(vitals)
        news2_data = calculate_news2_score(vitals)
        composite_score = calculate_composite_risk_score(vitals)

        vitals_data = {
            "patient_id": patient_id,
            "image_path": "manual_entry",
            "heart_rate": vitals.get("heart_rate"),
            "spo2": vitals.get("spo2"),
            "bp": vitals.get("bp"),
            "resp_rate": vitals.get("resp_rate"),
            "temperature": vitals.get("temperature"),
            "risk_level": risk_level,
            "news2_score": news2_data.get("total_score", 0),
            "news2_category": news2_data.get("risk_category", "LOW"),
            "composite_risk_score": composite_score,
            "timestamp": datetime.now()
        }
        await vitals_col.insert_one(vitals_data)

        all_alerts = detect_alerts(patient_id, vitals)
        if all_alerts:
            for a in all_alerts:
                a["resolved"] = False
            await alerts_col.insert_many(all_alerts)

        critical_alerts = [a for a in all_alerts if a.get("severity") == "CRITICAL" or a.get("alert_type") == "CRITICAL_VITAL"]
        high_risk_alerts = [a for a in all_alerts if a.get("severity") != "CRITICAL" and a.get("alert_type") != "CRITICAL_VITAL"]

        alerts_resolved = False
        if critical_alerts:
            await patients_col.update_one({"patient_id": patient_id}, {"$set": {"status": "critical"}})
        elif risk_level == "HIGH_RISK":
            patient_current = await patients_col.find_one({"patient_id": patient_id})
            if patient_current and patient_current.get("status") not in ["discharged", "critical"]:
                await patients_col.update_one({"patient_id": patient_id}, {"$set": {"status": "high_risk"}})
        else:
            # Next vitals are good/normal: normalize status and auto-resolve previous active alerts
            patient_current = await patients_col.find_one({"patient_id": patient_id})
            if patient_current and patient_current.get("status") in ["critical", "high_risk"]:
                await patients_col.update_one({"patient_id": patient_id}, {"$set": {"status": "admitted"}})
            # Mark all previous unresolved alerts as resolved
            await alerts_col.update_many(
                {"patient_id": patient_id, "resolved": {"$ne": True}},
                {"$set": {"resolved": True, "resolved_at": datetime.now(), "resolved_by": "normalized_vitals"}}
            )
            alerts_resolved = True

        return {
            "status": "success",
            "vitals": vitals,
            "risk_level": risk_level,
            "news2": news2_data,
            "composite_risk_score": composite_score,
            "critical_alerts": [a['message'] for a in critical_alerts],
            "risk_alerts": [a['message'] for a in high_risk_alerts],
            "all_alerts": [a['message'] for a in all_alerts],
            "alerts_resolved": alerts_resolved
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/assign_medicine")
async def assign_medicine(request: Request, patient_id: str = Form(...), medicine_name: str = Form(...), quantity: int = Form(...)):
    await verify_admin(request)
    p_id = patient_id.lower()
    await verify_patient_active(p_id)

    availability = check_medicine_availability(medicine_name, quantity)
    if availability == "out_of_stock":
        # Alert doctor agent
        await alerts_col.insert_one({
            "patient_id": p_id,
            "alert_type": "PHARMACY_ALERT",
            "message": f"Medicine {medicine_name} NOT available in pharmacy.",
            "timestamp": datetime.now()
        })
        return {"status": "unavailable", "message": "Medicine not available"}
    
    # Deduct from dynamic inventory
    dispense_result = dispense_medicine(medicine_name, quantity)

    price = get_medicine_price(medicine_name)
    total_cost = price * quantity
    
    prescription = {
        "patient_id": p_id,
        "medicine_name": medicine_name,
        "quantity": quantity,
        "price": price,
        "total_cost": total_cost,
        "status": "assigned",
        "timestamp": datetime.now()
    }
    await prescriptions_col.insert_one(prescription)
    
    return {
        "status": "success", 
        "availability": availability, 
        "total_cost": total_cost,
        "dispensed": quantity,
        "inventory_status": dispense_result.get("availability", availability)
    }

@app.get("/search_medicines")
async def search_pharmacy_medicines(q: str = ""):
    from agents.pharmacy_agent import search_medicines
    return search_medicines(q)

@app.get("/patient/{patient_id}")
async def get_patient(patient_id: str):
    patient = await verify_patient_exists(patient_id)
    # Exclude _id from response
    patient_resp = {k: v for k, v in patient.items() if k != "_id"}
    return patient_resp

@app.get("/vitals/{patient_id}")
async def get_vitals(patient_id: str):
    patient_id = patient_id.lower()
    await verify_patient_exists(patient_id)
    cursor = vitals_col.find({"patient_id": patient_id}, {"_id": 0}).sort("timestamp", -1)
    vitals_list = await cursor.to_list(length=100)
    return vitals_list

@app.get("/billing/{patient_id}")
async def get_billing(patient_id: str):
    patient_id = patient_id.lower()
    # Sum medicine costs
    prescriptions = await prescriptions_col.find({"patient_id": patient_id}).to_list(100)
    medicine_cost = sum(p.get("total_cost", 0) for p in prescriptions)
    
    # Calculate bed days
    patient = await verify_patient_exists(patient_id)
    
    admission_date = patient.get("admission_date") or datetime.now()
    if isinstance(admission_date, str):
        try:
            admission_date = datetime.fromisoformat(admission_date.replace("Z", "+00:00"))
        except:
            admission_date = datetime.now()

    # Ensure both are naive for subtraction
    now = datetime.now()
    if hasattr(admission_date, "tzinfo") and admission_date.tzinfo:
        admission_date = admission_date.replace(tzinfo=None)
    
    days_admitted = max(1, (now - admission_date).days)
    
    # Use dynamic costs if set by admin, else defaults
    bed_cost_per_day = patient.get("bed_cost_per_day", 500)
    treatment_cost = patient.get("treatment_cost", 1000)
    
    bill = calculate_bill(medicine_cost, days_admitted, bed_cost_per_day, treatment_cost)
    
    # Update or insert billing doc
    billing_doc = {
        "medicine_cost": medicine_cost,
        "bed_cost": bill['bed_cost'],
        "treatment_cost": treatment_cost,
        "total_bill": bill['total_bill'],
        "bed_cost_per_day": bed_cost_per_day # Store for record
    }
    
    await billing_col.update_one(
        {"patient_id": patient_id},
        [
            {"$set": billing_doc},
            {"$set": {"bill_paid": {"$ifNull": ["$bill_paid", False]}}}
        ],
        upsert=True
    )
    
    insurance_status = check_insurance_eligibility(patient_id)
    insurance_coverage = 0
    if insurance_status == "approved":
        insurance_coverage = 500  # Mock coverage amount
    
    # Fetch payments
    payments = await payments_col.find({"patient_id": patient_id}).to_list(100)
    paid_amount = sum(p.get("amount", 0) for p in payments)
    
    remaining_balance = max(0, bill['total_bill'] - insurance_coverage - paid_amount)
    
    return {
        "medicine_cost": medicine_cost,
        "bed_cost": bill['bed_cost'],
        "bed_days": days_admitted,
        "bed_rate": bed_cost_per_day,
        "treatment_cost": treatment_cost,
        "total_bill": bill['total_bill'],
        "insurance_coverage": insurance_coverage,
        "paid_amount": paid_amount,
        "remaining_balance": remaining_balance
    }

@app.post("/update_billing_costs")
async def update_billing_costs(request: Request):
    await verify_admin(request)
    data = await request.json()
    patient_id = data.get("patient_id", "").lower()
    field = data.get("field") # 'bed_cost_per_day' or 'treatment_cost'
    new_value = data.get("new_value")
    
    if field not in ["bed_cost_per_day", "treatment_cost"]:
        raise HTTPException(status_code=400, detail="Invalid field")
        
    await patients_col.update_one(
        {"patient_id": patient_id},
        {"$set": {field: float(new_value)}}
    )
    return {"status": "success"}
    
@app.post("/add_payment")
async def add_payment(
    request: Request,
    patient_id: str = Form(...),
    amount: float = Form(...),
    purpose: str = Form(...)
):
    await verify_admin(request)
    patient_id = patient_id.lower()
    await verify_patient_active(patient_id)
    
    payment_doc = {
        "patient_id": patient_id,
        "amount": amount,
        "purpose": purpose,
        "timestamp": datetime.now()
    }
    await payments_col.insert_one(payment_doc)
    return {"status": "success", "message": "Payment recorded successfully"}

@app.get("/payments/{patient_id}")
async def get_payments(patient_id: str):
    patient_id = patient_id.lower()
    await verify_patient_exists(patient_id)
         
    cursor = payments_col.find({"patient_id": patient_id}, {"_id": 0}).sort("timestamp", -1)
    payments = await cursor.to_list(length=100)
    return payments

@app.get("/decision/{patient_id}")
async def get_decision(patient_id: str):
    patient_id = patient_id.lower()
    patient = await verify_patient_exists(patient_id)
    
    if patient.get("discharge"):
        return {"discharge": False, "reason": "Already discharged"}

    # Last 48h vitals
    time_limit_48h = datetime.now() - timedelta(hours=48)
    vitals_history = await vitals_col.find({"patient_id": patient_id, "timestamp": {"$gte": time_limit_48h}}).to_list(100)
    
    # Check for ACTIVE (unresolved) Critical alerts in last 24h
    time_limit_24h = datetime.now() - timedelta(hours=24)
    alerts_24h = await alerts_col.find({
        "patient_id": patient_id, 
        "timestamp": {"$gte": time_limit_24h},
        "resolved": {"$ne": True}
    }).to_list(100)
    has_critical_alerts = any("CRITICAL" in a.get("message", "").upper() or "CRITICAL" in a.get("alert_type", "").upper() for a in alerts_24h)
    
    # Billing info
    bill_info = await get_billing(patient_id)
    total_bill = bill_info.get("total_bill", 0)
    total_payments = bill_info.get("paid_amount", 0) + bill_info.get("insurance_coverage", 0)
    
    discharge, reason = decide_discharge(vitals_history, has_critical_alerts, total_payments, total_bill)
    
    if discharge:
        await patients_col.update_one(
            {"patient_id": patient_id}, 
            {"$set": {
                "status": "discharged", 
                "discharge": True, 
                "discharged_at": datetime.now(), 
                "discharge_type": "Regular", 
                "doctor_notes": "Patient recovered."
            }}
        )
        
    return {
        "patient_id": patient_id,
        "discharge": discharge,
        "reason": reason
    }

@app.get("/patients")
async def get_all_patients():
    patients = await patients_col.find().to_list(100)
    # Convert ObjectIDs to strings
    for p in patients:
        p["_id"] = str(p["_id"])
    return patients

@app.get("/alerts/{patient_id}")
async def get_alerts(patient_id: str):
    patient_id = patient_id.lower()
    await verify_patient_exists(patient_id)
    alerts = await alerts_col.find({"patient_id": patient_id}).sort("timestamp", -1).to_list(50)
    for a in alerts:
        a["_id"] = str(a["_id"])
        if "resolved" not in a:
            a["resolved"] = False
        if "severity" not in a:
            type_str = a.get("alert_type", "").upper()
            msg_str = a.get("message", "").upper()
            if "CRITICAL" in type_str or "CRITICAL" in msg_str:
                a["severity"] = "CRITICAL"
            elif "HIGH" in type_str or "HIGH" in msg_str:
                a["severity"] = "HIGH"
            elif "PHARMACY" in type_str or "PHARMACY" in msg_str:
                a["severity"] = "PHARMACY"
            else:
                a["severity"] = "HIGH"
    return alerts

@app.post("/resolve_alerts/{patient_id}")
async def resolve_alerts(patient_id: str):
    p_id = patient_id.lower()
    await verify_patient_exists(p_id)
    result = await alerts_col.update_many(
        {"patient_id": p_id, "resolved": {"$ne": True}},
        {"$set": {"resolved": True, "resolved_at": datetime.now(), "resolved_by": "manual_action"}}
    )
    latest = await vitals_col.find_one({"patient_id": p_id}, sort=[("timestamp", -1)])
    if latest and latest.get("risk_level") == "LOW_RISK":
        await patients_col.update_one({"patient_id": p_id, "status": {"$in": ["critical", "high_risk"]}}, {"$set": {"status": "admitted"}})
    return {"status": "success", "resolved_count": result.modified_count, "message": "Alerts marked as resolved"}

@app.post("/resolve_alert/{alert_id}")
async def resolve_single_alert(alert_id: str):
    try:
        obj_id = ObjectId(alert_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid alert ID")
    alert = await alerts_col.find_one({"_id": obj_id})
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    await alerts_col.update_one(
        {"_id": obj_id},
        {"$set": {"resolved": True, "resolved_at": datetime.now(), "resolved_by": "manual_action"}}
    )
    p_id = alert.get("patient_id")
    if p_id:
        active_critical = await alerts_col.find_one({
            "patient_id": p_id,
            "resolved": {"$ne": True},
            "$or": [{"severity": "CRITICAL"}, {"alert_type": "CRITICAL_VITAL"}]
        })
        if not active_critical:
            latest = await vitals_col.find_one({"patient_id": p_id}, sort=[("timestamp", -1)])
            if latest and latest.get("risk_level") == "LOW_RISK":
                await patients_col.update_one({"patient_id": p_id, "status": {"$in": ["critical", "high_risk"]}}, {"$set": {"status": "admitted"}})
    return {"status": "success", "message": "Alert marked as solved"}

@app.get("/latest_vitals/{patient_id}")
async def get_latest_vitals(patient_id: str):
    patient_id = patient_id.lower()
    await verify_patient_exists(patient_id)
    latest = await vitals_col.find_one({"patient_id": patient_id}, sort=[("timestamp", -1)])
    if not latest:
        return {}
    latest["_id"] = str(latest["_id"])
    if "news2_score" not in latest:
        n2 = calculate_news2_score(latest)
        latest["news2_score"] = n2.get("total_score", 0)
        latest["news2_category"] = n2.get("risk_category", "LOW")
    if "composite_risk_score" not in latest:
        latest["composite_risk_score"] = calculate_composite_risk_score(latest)
    return latest

@app.get("/risk_assessment/{patient_id}")
async def get_patient_risk_assessment(patient_id: str):
    patient_id = patient_id.lower()
    await verify_patient_exists(patient_id)
    history = await vitals_col.find({"patient_id": patient_id}).sort("timestamp", -1).to_list(50)
    if not history:
        return {"patient_id": patient_id, "message": "No vitals recorded for patient"}
    latest = history[0]
    assessment = assess_patient_risk(patient_id, latest, history)
    return assessment


@app.get("/prescriptions/{patient_id}")
async def get_prescriptions(patient_id: str):
    patient_id = patient_id.lower()
    print(f"DEBUG: Fetching prescriptions for {patient_id}")
    await verify_patient_exists(patient_id)
    cursor = prescriptions_col.find({"patient_id": patient_id}).sort("timestamp", -1)
    prescriptions = await cursor.to_list(length=100)
    print(f"DEBUG: Found {len(prescriptions)} prescriptions")
    for p in prescriptions:
        p["_id"] = str(p["_id"])
    return prescriptions

@app.delete("/prescription/{presc_id}")
async def delete_prescription(request: Request, presc_id: str):
    print(f"DEBUG: DELETE request for {presc_id}")
    print(f"DEBUG: Headers: {request.headers.get('X-Role')}")
    await verify_admin(request)
    try:
        obj_id = ObjectId(presc_id)
        result = await prescriptions_col.delete_one({"_id": obj_id})
        print(f"DEBUG: Deleted count: {result.deleted_count}")
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Prescription not found")
        return {"status": "success", "message": "Prescription deleted"}
    except Exception as e:
        print(f"DEBUG: Delete error: {str(e)}")
        raise HTTPException(status_code=400, detail=f"Invalid ID or error: {str(e)}")

@app.get("/discharge_report/{patient_id}")
async def get_discharge_report(patient_id: str):
    patient_id = patient_id.lower()
    patient = await verify_patient_exists(patient_id)
    patient_resp = {k: v for k, v in patient.items() if k != "_id"}
    
    vitals = await get_vitals(patient_id)
    prescriptions = await get_prescriptions(patient_id)
    billing = await get_billing(patient_id)
    payments = await get_payments(patient_id)
    alerts = await get_alerts(patient_id)
    
    decision = await get_decision(patient_id)
    
    return {
        "patient": patient_resp,
        "vitals": vitals,
        "prescriptions": prescriptions,
        "billing": billing,
        "payments": payments,
        "alerts": alerts,
        "decision": decision
    }

@app.post("/generate_report/{patient_id}")
async def generate_report(request: Request, patient_id: str):
    await verify_admin(request)
    patient_id = patient_id.lower()
    
    report_data = await get_discharge_report(patient_id)
    patient = report_data["patient"]
    vitals = report_data["vitals"]
    prescriptions = report_data["prescriptions"]
    billing = report_data["billing"]
    payments = report_data["payments"]
    
    os.makedirs("reports", exist_ok=True)
    pdf_path = os.path.join("reports", f"{patient_id}_discharge.pdf")
    
    doc = SimpleDocTemplate(pdf_path, pagesize=letter)
    elements = []
    styles = getSampleStyleSheet()
    
    # Title
    title_style = ParagraphStyle('TitleStyle', parent=styles['Heading1'], alignment=1, spaceAfter=20)
    elements.append(Paragraph("VITALGUARD AI - DISCHARGE REPORT", title_style))
    
    # Patient Info
    elements.append(Paragraph("Patient Information", styles['Heading2']))
    p_info = [
        [f"Name: {patient.get('name', 'N/A')}", f"ID: {patient.get('patient_id', 'N/A')}"],
        [f"Age: {patient.get('age', 'N/A')}", f"Disease: {patient.get('disease', 'N/A')}"],
        [f"Status: {patient.get('status', 'N/A')}", f"Discharged At: {patient.get('discharged_at', 'N/A')}"]
    ]
    t_info = Table(p_info, colWidths=[250, 250])
    t_info.setStyle(TableStyle([
        ('TEXTCOLOR', (0,0), (-1,-1), colors.black),
        ('ALIGN', (0,0), (-1,-1), 'LEFT'),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
    ]))
    elements.append(t_info)
    elements.append(Spacer(1, 10))
    
    # Vitals Table
    if vitals:
        elements.append(Paragraph("Vitals History (Last 5 records)", styles['Heading2']))
        v_data = [["Time", "SpO2", "Heart Rate", "Temp", "BP"]]
        for v in vitals[:5]:
            ts = v.get("timestamp")
            ts_str = ts.strftime("%Y-%m-%d %H:%M") if hasattr(ts, 'strftime') else str(ts)
            v_data.append([
                ts_str,
                str(v.get("spo2", "-")),
                str(v.get("heart_rate", "-")),
                str(v.get("temperature", "-")),
                str(v.get("bp", "-"))
            ])
        t_vitals = Table(v_data, colWidths=[120, 70, 80, 70, 100])
        t_vitals.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), colors.grey),
            ('TEXTCOLOR', (0,0), (-1,0), colors.whitesmoke),
            ('ALIGN', (0,0), (-1,-1), 'CENTER'),
            ('GRID', (0,0), (-1,-1), 1, colors.black),
        ]))
        elements.append(t_vitals)
        elements.append(Spacer(1, 10))
        
    # Medicines
    if prescriptions:
        elements.append(Paragraph("Medicines Prescribed", styles['Heading2']))
        m_data = [["Medicine", "Quantity", "Total Cost"]]
        for p in prescriptions:
            m_data.append([
                str(p.get("medicine_name", "-")),
                str(p.get("quantity", "-")),
                f"${p.get('total_cost', 0)}"
            ])
        t_meds = Table(m_data, colWidths=[250, 100, 100])
        t_meds.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), colors.grey),
            ('TEXTCOLOR', (0,0), (-1,0), colors.whitesmoke),
            ('GRID', (0,0), (-1,-1), 1, colors.black),
        ]))
        elements.append(t_meds)
        elements.append(Spacer(1, 10))
        
    # Billing
    elements.append(Paragraph("Billing Summary", styles['Heading2']))
    b_data = [
        ["Total Bill:", f"${billing.get('total_bill', 0)}"],
        ["Total Payments:", f"${sum(p.get('amount',0) for p in payments)}"],
        ["Remaining:", f"${billing.get('remaining_balance', 0)}"]
    ]
    t_bill = Table(b_data, colWidths=[200, 200])
    t_bill.setStyle(TableStyle([
        ('GRID', (0,0), (-1,-1), 1, colors.black),
    ]))
    elements.append(t_bill)
    elements.append(Spacer(1, 10))
    
    # Final Status
    elements.append(Paragraph("Final Decisions & Notes", styles['Heading2']))
    decision_info = report_data.get("decision", {})
    elements.append(Paragraph(f"Discharge Ready: {decision_info.get('discharge', False)}", styles['Normal']))
    elements.append(Paragraph(f"Reason: {decision_info.get('reason', '')}", styles['Normal']))
    if patient.get("doctor_notes"):
        elements.append(Paragraph(f"Doctor Notes: {patient.get('doctor_notes')}", styles['Normal']))
    
    elements.append(Spacer(1, 30))
    footer_style = ParagraphStyle('Footer', parent=styles['Normal'], alignment=1, textColor=colors.gray)
    elements.append(Paragraph("Generated by VitalGuard AI", footer_style))
    
    doc.build(elements)
    
    return {"file_url": f"/reports/{patient_id}_discharge.pdf"}

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
