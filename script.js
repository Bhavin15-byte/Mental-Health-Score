
// ==========================================
// MENTAL HEALTH SIGNAL - FRONTEND JAVASCRIPT
// ==========================================

// IMPORTANT:
// Replace this with your actual deployed FastAPI backend URL.
// Do not use your frontend URL unless FastAPI is hosted there too.
const API_BASE = "https://mental-health-score-1-qdl2.onrender.com";


// ==========================================
// DOM ELEMENTS
// ==========================================

const form = document.getElementById("predict-form");

const submitBtn = document.getElementById("submit-btn");
const resetBtn = document.getElementById("reset-btn");
const retryBtn = document.getElementById("error-retry-btn");

const idleState = document.getElementById("state-idle");
const loadingState = document.getElementById("state-loading");
const resultState = document.getElementById("state-result");
const errorState = document.getElementById("state-error");

const scoreNumber = document.getElementById("score-number");
const scoreBand = document.getElementById("score-band");
const scoreContext = document.getElementById("score-context");
const gaugeFill = document.getElementById("gauge-fill");

const errorCopy = document.getElementById("error-copy");


// ==========================================
// STRESS LEVEL ELEMENTS
// ==========================================

const stressGroup = document.getElementById("stress_level_group");
const stressInput = document.getElementById("stress_level");


// Directly attach click listeners to the four buttons.
// This ensures the selected stress value is saved correctly.

if (stressGroup && stressInput) {

    const stressButtons = stressGroup.querySelectorAll(".seg-btn");

    stressButtons.forEach(button => {

        button.addEventListener("click", function () {

            const selectedValue = this.dataset.value;

            // Save selected value in hidden input
            stressInput.value = selectedValue;

            // Update selected button appearance
            stressButtons.forEach(btn => {

                btn.classList.remove("active", "selected");

                btn.setAttribute("aria-pressed", "false");

            });

            this.classList.add("active", "selected");

            this.setAttribute("aria-pressed", "true");

            console.log("Selected stress level:", selectedValue);

        });

    });

}


// ==========================================
// FOUR HOURS INPUT FIELDS
// ==========================================

const hoursFields = [
    document.getElementById("avg_daily_usage_hours"),
    document.getElementById("study_hours"),
    document.getElementById("physical_activity_hours"),
    document.getElementById("sleep_hours_per_night")
].filter(Boolean);


// Create remaining-hours message

let hoursStatus = document.getElementById("hours-status");

if (!hoursStatus && hoursFields.length > 0) {

    hoursStatus = document.createElement("p");

    hoursStatus.id = "hours-status";

    hoursStatus.style.marginTop = "10px";
    hoursStatus.style.fontSize = "13px";

    const sleepField = hoursFields[hoursFields.length - 1];

    sleepField.closest(".field").appendChild(hoursStatus);

}


// Calculate total hours

function getTotalHours() {

    return hoursFields.reduce((total, field) => {

        return total + (Number(field.value) || 0);

    }, 0);

}


// Update available hours

function updateHoursBudget(changedField = null) {

    let totalHours = getTotalHours();

    // Prevent total from exceeding 24 hours
    if (totalHours > 24 && changedField) {

        const otherHours = hoursFields.reduce((total, field) => {

            if (field === changedField) {
                return total;
            }

            return total + (Number(field.value) || 0);

        }, 0);

        const availableHours = Math.max(0, 24 - otherHours);

        changedField.value = Math.min(
            Number(changedField.value) || 0,
            availableHours
        );

        totalHours = getTotalHours();

    }


    // Dynamically update maximum allowed hours

    hoursFields.forEach(field => {

        const otherHours = hoursFields.reduce((total, otherField) => {

            if (otherField === field) {
                return total;
            }

            return total + (Number(otherField.value) || 0);

        }, 0);

        field.max = Math.max(0, 24 - otherHours);

    });


    // Display remaining hours

    const remainingHours = Math.max(0, 24 - totalHours);

    if (hoursStatus) {

        hoursStatus.textContent =
            `${remainingHours.toFixed(1)} hours remaining out of 24`;

    }

}


// Attach listeners

hoursFields.forEach(field => {

    field.addEventListener("input", function () {

        updateHoursBudget(this);

    });

    field.addEventListener("change", function () {

        updateHoursBudget(this);

    });

});

updateHoursBudget();


// ==========================================
// STATE MANAGEMENT
// ==========================================

function showState(state) {

    const states = [
        idleState,
        loadingState,
        resultState,
        errorState
    ];

    states.forEach(element => {

        if (element) {
            element.hidden = true;
        }

    });

    const stateMap = {
        idle: idleState,
        loading: loadingState,
        result: resultState,
        error: errorState
    };

    if (stateMap[state]) {

        stateMap[state].hidden = false;

    }

}


// ==========================================
// ERROR HANDLING
// ==========================================

function showError(message) {

    if (errorCopy) {

        errorCopy.textContent = message;

    }

    showState("error");

}


// ==========================================
// FORM VALIDATION
// ==========================================

function validateForm() {

    // Validate normal form fields

    if (!form.checkValidity()) {

        form.reportValidity();

        return false;

    }


    // Validate four hours fields

    for (const field of hoursFields) {

        const value = Number(field.value);

        if (!Number.isFinite(value) || value < 0 || value > 24) {

            alert("Please enter valid hours between 0 and 24.");

            field.focus();

            return false;

        }

    }


    // Total hours must not exceed 24

    const totalHours = getTotalHours();

    if (totalHours > 24.001) {

        alert("The combined hours cannot exceed 24 hours.");

        return false;

    }


    // Validate stress level

    if (!stressInput || !stressInput.value) {

        alert("Please select your perceived stress level.");

        stressGroup?.scrollIntoView({
            behavior: "smooth",
            block: "center"
        });

        return false;

    }

    return true;

}


// ==========================================
// COLLECT FORM DATA
// ==========================================

function collectFormData() {

    const formData = new FormData(form);

    const payload = Object.fromEntries(formData.entries());


    // Convert numerical values into numbers

    const numericFields = [
        "age",
        "avg_daily_usage_hours",
        "daily_unlocks",
        "study_hours",
        "physical_activity_hours",
        "sleep_hours_per_night"
    ];

    numericFields.forEach(field => {

        if (payload[field] !== undefined) {

            payload[field] = Number(payload[field]);

        }

    });


    // Stress level is a categorical string:
    // Low, Medium, High, Very High

    return payload;

}


// ==========================================
// DISPLAY PREDICTION RESULT (0-10 SCALE)
// ==========================================

function displayResult(score) {

    const numericScore = Number(score);


    // Validate prediction

    if (!Number.isFinite(numericScore) ||
        numericScore < 0 ||
        numericScore > 10) {

        showError(
            "The backend returned an invalid score. Expected a value between 0 and 10."
        );

        return;

    }


    // Display actual model score

    if (scoreNumber) {

        scoreNumber.textContent = numericScore.toFixed(2);

    }


    // Neutral score description:
    // Avoid assuming whether higher means better or worse.

    if (scoreBand) {

        scoreBand.textContent = "Predicted Mental Health Score";

    }

    if (scoreContext) {

        scoreContext.textContent =
            "Your model-generated prediction on a scale of 0 to 10.";

    }


    // Convert 0-10 score into 0-100 percentage
    // ONLY for visual gauge positioning.

    const gaugePercentage = (numericScore / 10) * 100;


    // Update SVG gauge

    if (gaugeFill) {

        const pathLength = gaugeFill.getTotalLength();

        gaugeFill.style.strokeDasharray = pathLength;

        gaugeFill.style.strokeDashoffset =
            pathLength * (1 - gaugePercentage / 100);

        gaugeFill.style.transition =
            "stroke-dashoffset 1s ease";

    }


    showState("result");

}


// ==========================================
// SUBMIT FORM AND CALL FASTAPI
// ==========================================

form.addEventListener("submit", async function (event) {

    event.preventDefault();


    // Validate before API request

    if (!validateForm()) {

        return;

    }


    const payload = collectFormData();

    console.log("Sending prediction data:", payload);


    // Show loading state

    showState("loading");

    if (submitBtn) {

        submitBtn.disabled = true;

    }


    try {

        const response = await fetch(
            `${API_BASE}/predict`,
            {

                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify(payload)

            }
        );


        // Read response as text first

        const responseText = await response.text();

        console.log("Backend response:", responseText);


        // Handle empty response

        if (!responseText) {

            throw new Error(
                `Backend returned an empty response. HTTP status: ${response.status}`
            );

        }


        // Parse JSON safely

        let result;

        try {

            result = JSON.parse(responseText);

        } catch (error) {

            throw new Error(
                `Backend returned invalid JSON. HTTP status: ${response.status}`
            );

        }


        // Handle unsuccessful API response

        if (!response.ok) {

            const detail = result.detail;

            const errorMessage = Array.isArray(detail)
                ? detail.map(item => item.msg).join(", ")
                : detail || "Prediction request failed.";

            throw new Error(errorMessage);

        }


        // Get prediction from FastAPI

        const predictedScore =
            result.predicted_mental_health_score;


        if (predictedScore === undefined ||
            predictedScore === null) {

            throw new Error(
                "Prediction score is missing from the backend response."
            );

        }


        // Display prediction on 0-10 scale

        displayResult(predictedScore);


    } catch (error) {

        console.error("Prediction error:", error);

        showError(
            error.message ||
            "Unable to connect to the prediction server."
        );

    } finally {

        if (submitBtn) {

            submitBtn.disabled = false;

        }

    }

});


// ==========================================
// RESET FORM
// ==========================================

function resetForm() {

    form.reset();


    // Reset stress selection

    if (stressInput) {

        stressInput.value = "";

    }

    if (stressGroup) {

        stressGroup.querySelectorAll(".seg-btn").forEach(button => {

            button.classList.remove("active", "selected");

            button.setAttribute("aria-pressed", "false");

        });

    }


    // Reset hour limits

    hoursFields.forEach(field => {

        field.max = 24;

    });

    updateHoursBudget();


    // Reset prediction display

    if (scoreNumber) {

        scoreNumber.textContent = "0.0";

    }

    if (scoreBand) {

        scoreBand.textContent = "—";

    }

    if (scoreContext) {

        scoreContext.textContent = "";

    }


    // Reset gauge

    if (gaugeFill) {

        gaugeFill.style.strokeDashoffset =
            gaugeFill.getTotalLength();

    }


    // Enable submit button

    if (submitBtn) {

        submitBtn.disabled = false;

    }


    showState("idle");

}


// Reset button

if (resetBtn) {

    resetBtn.addEventListener("click", function () {

        resetForm();

    });

}


// Retry button

if (retryBtn) {

    retryBtn.addEventListener("click", function () {

        showState("idle");

        form.requestSubmit();

    });

}


// ==========================================
// INITIAL PAGE STATE
// ==========================================

showState("idle");
