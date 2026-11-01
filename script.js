
// ==========================================
// MENTAL HEALTH PREDICTION - FRONTEND SCRIPT
// ==========================================

// FastAPI backend URL
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

const errorLabel = document.getElementById("error-label");
const errorCopy = document.getElementById("error-copy");

// Stress level elements
const stressGroup = document.getElementById("stress_level_group");
const stressInput = document.getElementById("stress_level");

// ==========================================
// FOUR HOURS INPUT FIELDS
// ==========================================

const hoursFields = [
    document.querySelector('[name="avg_daily_usage_hours"]'),
    document.querySelector('[name="study_hours"]'),
    document.querySelector('[name="physical_activity_hours"]'),
    document.querySelector('[name="sleep_hours_per_night"]')
].filter(Boolean);

// Create remaining-hours status message
let hoursStatus = document.getElementById("hours-status");

if (!hoursStatus && hoursFields.length > 0) {
    hoursStatus = document.createElement("p");
    hoursStatus.id = "hours-status";
    hoursStatus.style.marginTop = "10px";
    hoursStatus.style.fontSize = "13px";

    const lastField = hoursFields[hoursFields.length - 1];

    lastField.parentElement.insertAdjacentElement(
        "afterend",
        hoursStatus
    );
}

// ==========================================
// HOURS VALIDATION
// TOTAL MUST NOT EXCEED 24 HOURS
// ==========================================

function getTotalHours() {
    return hoursFields.reduce((total, field) => {
        return total + (Number(field.value) || 0);
    }, 0);
}

function updateHoursBudget(changedField = null) {

    let totalHours = getTotalHours();

    // If the total exceeds 24, limit the field
    // that the user has just changed.
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

    // Dynamically update maximum allowed values
    hoursFields.forEach(field => {

        const otherHours = hoursFields.reduce((total, otherField) => {

            if (otherField === field) {
                return total;
            }

            return total + (Number(otherField.value) || 0);

        }, 0);

        const availableHours = Math.max(0, 24 - otherHours);

        field.max = availableHours;
    });

    // Update remaining hours message
    const remainingHours = Math.max(0, 24 - totalHours);

    if (hoursStatus) {

        hoursStatus.textContent =
            `${remainingHours.toFixed(1)} hours remaining out of 24`;

        hoursStatus.style.color = "#16a34a";
    }
}

// Attach listeners to all four fields
hoursFields.forEach(field => {

    field.addEventListener("input", () => {
        updateHoursBudget(field);
    });

    field.addEventListener("change", () => {
        updateHoursBudget(field);
    });

});

// Initial calculation
updateHoursBudget();

// ==========================================
// STRESS LEVEL SELECTION
// ==========================================

if (stressGroup && stressInput) {

    stressGroup.addEventListener("click", function (event) {

        const selectedOption = event.target.closest(
            "button, [data-value], [data-stress-level]"
        );

        if (!selectedOption || !stressGroup.contains(selectedOption)) {
            return;
        }

        const selectedValue =
            selectedOption.dataset.stressLevel ??
            selectedOption.dataset.value ??
            selectedOption.value;

        if (selectedValue === undefined || selectedValue === "") {
            return;
        }

        stressInput.value = selectedValue;

        // Update selected appearance
        stressGroup.querySelectorAll(
            "button, [data-value], [data-stress-level]"
        ).forEach(option => {

            option.classList.remove("active", "selected");
            option.setAttribute("aria-pressed", "false");

        });

        selectedOption.classList.add("active");
        selectedOption.setAttribute("aria-pressed", "true");

    });
}

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

    const selectedState = {
        idle: idleState,
        loading: loadingState,
        result: resultState,
        error: errorState
    }[state];

    if (selectedState) {
        selectedState.hidden = false;
    }
}

// ==========================================
// ERROR HANDLING
// ==========================================

function showError(title, message) {

    if (errorLabel) {
        errorLabel.textContent = title;
    }

    if (errorCopy) {
        errorCopy.textContent = message;
    }

    showState("error");
}

// ==========================================
// CLIENT-SIDE FORM VALIDATION
// ==========================================

function validateForm() {

    // Check normal HTML form validation
    if (!form.checkValidity()) {
        form.reportValidity();
        return false;
    }

    // Check the four hours fields
    for (const field of hoursFields) {

        const value = Number(field.value);

        if (!Number.isFinite(value) || value < 0) {

            alert("Please enter valid non-negative hours.");

            field.focus();

            return false;
        }

    }

    const totalHours = getTotalHours();

    // Total can be less than or equal to 24
    if (totalHours > 24.001) {

        alert(
            "The total of all four hour fields cannot exceed 24 hours."
        );

        return false;
    }

    // Check stress level
    if (stressInput && !stressInput.value) {

        alert("Please select your stress level.");

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

    // Convert numerical fields into numbers
    const numericFields = [
        "age",
        "avg_daily_usage_hours",
        "daily_unlocks",
        "study_hours",
        "physical_activity_hours",
        "sleep_hours_per_night",
        "stress_level"
    ];

    numericFields.forEach(field => {

        if (payload[field] !== undefined && payload[field] !== "") {
            payload[field] = Number(payload[field]);
        }

    });

    return payload;
}

// ==========================================
// SCORE INTERPRETATION
// ==========================================

function getScoreInterpretation(score) {

    if (score < 30) {

        return {
            band: "Low",
            context: "Your predicted score falls in the low range."
        };

    } else if (score < 60) {

        return {
            band: "Moderate",
            context: "Your predicted score falls in the moderate range."
        };

    } else if (score < 80) {

        return {
            band: "High",
            context: "Your predicted score falls in the high range."
        };

    } else {

        return {
            band: "Very High",
            context: "Your predicted score falls in the very high range."
        };

    }
}

// ==========================================
// DISPLAY PREDICTION RESULT
// ==========================================

function displayResult(score) {

    const numericScore = Number(score);

    if (!Number.isFinite(numericScore)) {

        showError(
            "Invalid prediction",
            "The server returned an invalid prediction score."
        );

        return;
    }

    const interpretation = getScoreInterpretation(numericScore);

    // Display score
    if (scoreNumber) {
        scoreNumber.textContent = numericScore.toFixed(2);
    }

    // Display score category
    if (scoreBand) {
        scoreBand.textContent = interpretation.band;
    }

    // Display explanation
    if (scoreContext) {
        scoreContext.textContent = interpretation.context;
    }

    // Update gauge
    const normalizedScore = Math.min(
        100,
        Math.max(0, numericScore)
    );

    if (gaugeFill) {

        gaugeFill.style.width = `${normalizedScore}%`;

        gaugeFill.style.setProperty(
            "--score",
            normalizedScore
        );

        gaugeFill.setAttribute(
            "aria-valuenow",
            normalizedScore
        );
    }

    showState("result");
}

// ==========================================
// SUBMIT FORM AND CALL FASTAPI
// ==========================================

form.addEventListener("submit", async function (event) {

    event.preventDefault();

    // Validate before sending data
    if (!validateForm()) {
        return;
    }

    const payload = collectFormData();

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

        // Handle unsuccessful API responses
        if (!response.ok) {

            let errorMessage = "Unable to process your prediction.";

            try {

                const errorData = await response.json();

                if (errorData.detail) {
                    errorMessage = Array.isArray(errorData.detail)
                        ? errorData.detail.map(item => item.msg).join(", ")
                        : errorData.detail;
                }

            } catch (error) {
                // Keep default error message
            }

            throw new Error(errorMessage);
        }

const responseText = await response.text();

console.log("Backend response:", responseText);

let result;

try {
    result = JSON.parse(responseText);
} catch (error) {
    throw new Error(
        `Backend returned an invalid or empty response. HTTP Status: ${response.status}`
    );
}

if (!response.ok) {
    throw new Error(
        result.detail || "Backend prediction failed."
    );
}

const predictedScore = result.predicted_mental_health_score;

if (predictedScore === undefined || predictedScore === null) {
    throw new Error("Prediction score is missing from backend response.");
}

displayResult(predictedScore);

        // Read prediction from FastAPI response
        const predictedScore =
            result.predicted_mental_health_score;

        if (predictedScore === undefined || predictedScore === null) {

            throw new Error(
                "Prediction score was not found in the API response."
            );
        }

        // Display prediction
        displayResult(predictedScore);

    } catch (error) {

        console.error("Prediction Error:", error);

        showError(
            "Prediction Failed",
            error.message || "Please check your backend connection and try again."
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

    // Reset stress level
    if (stressInput) {
        stressInput.value = "";
    }

    if (stressGroup) {

        stressGroup.querySelectorAll(
            "button, [data-value], [data-stress-level]"
        ).forEach(option => {

            option.classList.remove("active", "selected");

            option.setAttribute("aria-pressed", "false");

        });

    }

    // Reset hour limits and remaining-hours message
    hoursFields.forEach(field => {
        field.max = 24;
    });

    updateHoursBudget();

    // Reset gauge
    if (scoreNumber) {
        scoreNumber.textContent = "--";
    }

    if (scoreBand) {
        scoreBand.textContent = "";
    }

    if (scoreContext) {
        scoreContext.textContent = "";
    }

    if (gaugeFill) {
        gaugeFill.style.width = "0%";
        gaugeFill.style.setProperty("--score", 0);
    }

    // Enable submit button
    if (submitBtn) {
        submitBtn.disabled = false;
    }

    // Return to initial state
    showState("idle");
}

// Reset button
if (resetBtn) {

    resetBtn.addEventListener("click", function (event) {

        event.preventDefault();

        resetForm();

    });

}

// Retry button
if (retryBtn) {

    retryBtn.addEventListener("click", function () {

        showState("idle");

        if (form) {
            form.requestSubmit();
        }

    });

}

// ==========================================
// INITIAL PAGE STATE
// ==========================================

showState("idle");
