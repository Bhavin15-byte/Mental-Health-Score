
import joblib
import pandas as pd

from pathlib import Path
from typing import Literal

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field


# --------------------------------------------------
# 1. LOAD MACHINE LEARNING MODEL
# --------------------------------------------------

BASE_DIR = Path(__file__).resolve().parent
MODEL_PATH = BASE_DIR / "Mental_Health_Model.pkl"

try:
    model = joblib.load(MODEL_PATH)
    print("Machine learning model loaded successfully!")

except Exception as e:
    print(f"Error loading model: {e}")
    raise RuntimeError("Could not load Mental_Health_Model.pkl")


# --------------------------------------------------
# 2. COUNTRY GROUPS
# --------------------------------------------------

top_countries = [
    "Other",
    "India",
    "USA",
    "Canada",
    "Australia",
    "UK",
    "Germany",
    "Mexico",
    "Turkey",
    "France"
]


# --------------------------------------------------
# 3. CREATE FASTAPI APPLICATION
# --------------------------------------------------

app = FastAPI(
    title="Mental Health Signal API",
    description="Student Wellness Analytics - Mental Health Prediction",
    version="1.0.0"
)


# --------------------------------------------------
# 4. CONFIGURE CORS
# --------------------------------------------------

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"]
)


# --------------------------------------------------
# 5. INPUT DATA MODEL
# --------------------------------------------------

class StudentData(BaseModel):

    age: int = Field(..., ge=10, le=100)

    gender: Literal["Male", "Female"]

    country: str

    academic_level: Literal[
        "Undergraduate",
        "Graduate",
        "High School"
    ]

    most_used_platform: Literal[
        "Facebook",
        "LinkedIn",
        "Instagram",
        "Snapchat",
        "Twitter",
        "YouTube",
        "TikTok",
        "LINE",
        "KakaoTalk",
        "VKontakte",
        "WhatsApp",
        "WeChat"
    ]

    purpose_of_use: Literal[
        "Networking",
        "Education",
        "Entertainment",
        "News"
    ]

    avg_daily_usage_hours: float = Field(..., ge=0, le=24)

    daily_unlocks: int = Field(..., ge=0)

    study_hours: float = Field(..., ge=0, le=24)

    physical_activity_hours: float = Field(..., ge=0, le=24)

    sleep_hours_per_night: float = Field(..., ge=0, le=24)

    stress_level: Literal[
        "Medium",
        "Low",
        "Very High",
        "High"
    ]


# --------------------------------------------------
# 6. OUTPUT RESPONSE MODEL
# --------------------------------------------------

class PredictionResponse(BaseModel):

    predicted_mental_health_score: float


# --------------------------------------------------
# 7. HOME ENDPOINT
# --------------------------------------------------

@app.get("/")
def greet():

    return {
        "message": "Welcome to Mental Health Signal API",
        "status": "Running"
    }


# --------------------------------------------------
# 8. HEALTH CHECK ENDPOINT
# --------------------------------------------------

@app.get("/health")
def health_check():

    return {
        "status": "healthy",
        "model_loaded": model is not None
    }


# --------------------------------------------------
# 9. PREDICTION ENDPOINT
# --------------------------------------------------

@app.post("/predict", response_model=PredictionResponse)
def predict(data: StudentData):

    try:

        print("Received student data:", data.model_dump())

        # Group countries not present in top_countries
        country_group = (
            data.country
            if data.country in top_countries
            else "Other"
        )

        # Create input DataFrame
        input_row = pd.DataFrame([{

            "Age": data.age,

            "Gender": data.gender,

            "Country": data.country,

            "Academic_Level": data.academic_level,

            "Most_Used_Platform": data.most_used_platform,

            "Purpose_Of_Use": data.purpose_of_use,

            "Avg_Daily_Usage_Hours": data.avg_daily_usage_hours,

            "Daily_Unlocks": data.daily_unlocks,

            "Study_Hours": data.study_hours,

            "Physical_Activity_Hours": data.physical_activity_hours,

            "Sleep_Hours_Per_Night": data.sleep_hours_per_night,

            "Stress_Level": data.stress_level,

            "Grouped_country": country_group

        }])

        print("Input DataFrame:")
        print(input_row)

        # Generate prediction
        prediction = model.predict(input_row)[0]

        print("Raw model prediction:", prediction)

        # Convert prediction into float
        score = round(float(prediction), 2)

        # Prepare API response
        response = PredictionResponse(
            predicted_mental_health_score=score
        )

        print("API response:", response.model_dump())

        return response

    except Exception as e:

        print("Prediction error:", repr(e))

        raise HTTPException(
            status_code=500,
            detail=f"Prediction failed: {str(e)}"
        )
