
(() => {
  "use strict";

  const API_BASE = "http://127.0.0.1:2200";

  const form = document.getElementById("predict-form");
  const submitBtn = document.getElementById("submit-btn");
  const resetBtn = document.getElementById("reset-btn");
  const errorRetryBtn = document.getElementById("error-retry-btn");

  const stateIdle = document.getElementById("state-idle");
  const stateLoading = document.getElementById("state-loading");
  const stateResult = document.getElementById("state-result");
  const stateError = document.getElementById("state-error");

  const scoreNumberEl = document.getElementById("score-number");
  const scoreBandEl = document.getElementById("score-band");
  const scoreContextEl = document.getElementById("score-context");
  const gaugeFill = document.getElementById("gauge-fill");
  const errorLabelEl = document.getElementById("error-label");
  const errorCopyEl = document.getElementById("error-copy");

  const GAUGE_ARC_LENGTH = 314;
  const TOTAL_HOURS = 24;

  // ---------------------------------------------------------
  // Four fields sharing the 24-hour daily budget
  // ---------------------------------------------------------

  const hoursFields = [
    "avg_daily_usage_hours",
    "study_hours",
    "physical_activity_hours",
    "sleep_hours_per_night"
  ];

  const hourInputs = hoursFields.map(id =>
    document.getElementById(id)
  );

  let lastEditedHoursField = null;

  // Create remaining-hours information dynamically
  const hoursSummary = document.createElement("p");
  hoursSummary.id = "hours-remaining";
  hoursSummary.className = "hint";
  hoursSummary.setAttribute("aria-live", "polite");

  document
    .getElementById("sleep_hours_per_night")
    .closest(".field")
    .insertAdjacentElement("afterend", hoursSummary);

  // ---------------------------------------------------------
  // Dynamic 24-hour allocation
  // ---------------------------------------------------------

  function updateHoursBudget() {

    const values = hourInputs.map(input => {
      if (input.value.trim() === "") return 0;
      return Number(input.value);
    });

    const totalUsed = values.reduce((sum, value) => sum + value, 0);

    const remaining = TOTAL_HOURS - totalUsed;

    // Update maximum available hours for every field.
    hourInputs.forEach((input, index) => {

      const otherHours = totalUsed - values[index];

      const availableHours = Math.max(
        0,
        TOTAL_HOURS - otherHours
      );

      input.max = availableHours.toFixed(1);
    });

    // Display remaining hours without showing negative values.
    if (remaining > 0) {

      hoursSummary.textContent =
        `${remaining.toFixed(1)} hours remaining out of 24 hours.`;

    } else if (remaining === 0) {

      hoursSummary.textContent =
        "24-hour daily budget fully allocated.";

    } else {

      hoursSummary.textContent =
        `Daily budget exceeded by ${Math.abs(remaining).toFixed(1)} hours. Reduce your entries.`;

    }
  }

  // Listen to changes in all four fields.
  hourInputs.forEach(input => {

    input.addEventListener("input", () => {

      lastEditedHoursField = input;

      clearFieldError(input);

      updateHoursBudget();

    });

    input.addEventListener("change", updateHoursBudget);

  });

  updateHoursBudget();

  // ---------------------------------------------------------
  // Draw gauge tick marks
  // ---------------------------------------------------------

  function drawTicks() {

    document.querySelectorAll(".gauge-ticks").forEach(g => {

      g.innerHTML = "";

      const cx = 120;
      const cy = 140;
      const rOuter = 100;
      const rInner = 90;

      for (let i = 0; i <= 10; i += 2) {

        const angle = Math.PI - (i / 10) * Math.PI;

        const x1 = cx + rOuter * Math.cos(angle);
        const y1 = cy - rOuter * Math.sin(angle);

        const x2 = cx + rInner * Math.cos(angle);
        const y2 = cy - rInner * Math.sin(angle);

        const line = document.createElementNS(
          "http://www.w3.org/2000/svg",
          "line"
        );

        line.setAttribute("x1", x1.toFixed(1));
        line.setAttribute("y1", y1.toFixed(1));
        line.setAttribute("x2", x2.toFixed(1));
        line.setAttribute("y2", y2.toFixed(1));

        g.appendChild(line);

      }

    });

  }

  drawTicks();

  // ---------------------------------------------------------
  // Stress level segmented control
  // ---------------------------------------------------------

  const segGroup = document.getElementById("stress_level_group");
  const stressHiddenInput = document.getElementById("stress_level");

  segGroup.querySelectorAll(".seg-btn").forEach(btn => {

    btn.addEventListener("click", () => {

      segGroup.querySelectorAll(".seg-btn").forEach(b =>
        b.classList.remove("active")
      );

      btn.classList.add("active");

      stressHiddenInput.value = btn.dataset.value;

      clearFieldError(stressHiddenInput);

    });

  });

  // ---------------------------------------------------------
  // Field error helpers
  // ---------------------------------------------------------

  function fieldWrapper(input) {
    return input.closest(".field");
  }

  function setFieldError(input, message) {

    const wrap = fieldWrapper(input);

    if (!wrap) return;

    wrap.classList.add("field-error");

    const msgEl = wrap.querySelector(".error-msg");

    if (msgEl) msgEl.textContent = message;

  }

  function clearFieldError(input) {

    const wrap = fieldWrapper(input);

    if (!wrap) return;

    wrap.classList.remove("field-error");

    const msgEl = wrap.querySelector(".error-msg");

    if (msgEl) msgEl.textContent = "";

  }

  function clearAllErrors() {

    form.querySelectorAll(".field").forEach(f =>
      f.classList.remove("field-error")
    );

    form.querySelectorAll(".error-msg").forEach(m =>
      m.textContent = ""
    );

  }

  // ---------------------------------------------------------
  // Client-side validation
  // ---------------------------------------------------------

  function validate(payload) {

    const errors = [];

    const numericChecks = [
      ["age", 10, 100],
      ["avg_daily_usage_hours", 0, 24],
      ["daily_unlocks", 0, Infinity],
      ["study_hours", 0, 24],
      ["physical_activity_hours", 0, 24],
      ["sleep_hours_per_night", 0, 24]
    ];

    numericChecks.forEach(([key, min, max]) => {

      const input = document.getElementById(key);
      const val = payload[key];

      if (!Number.isFinite(val)) {

        errors.push([input, "Enter a valid number."]);

      } else if (val < min || val > max) {

        errors.push([
          input,
          `Must be between ${min} and ${max === Infinity ? "0+" : max}.`
        ]);

      }

    });

    // Required text and selection fields
    [
      "gender",
      "country",
      "academic_level",
      "most_used_platform",
      "purpose_of_use"
    ].forEach(key => {

      const input = document.getElementById(key);

      if (!payload[key] || String(payload[key]).trim() === "") {

        errors.push([input, "This field is required."]);

      }

    });

    // Stress validation
    if (!payload.stress_level) {

      errors.push([
        stressHiddenInput,
        "Pick a stress level."
      ]);

    }

    // -------------------------------------------------------
    // NEW: Validate total daily hours
    // -------------------------------------------------------

    const allHoursValid = hoursFields.every(key =>
      Number.isFinite(payload[key]) &&
      payload[key] >= 0 &&
      payload[key] <= 24
    );

    if (allHoursValid) {

      const totalHours = hoursFields.reduce(
        (sum, key) => sum + payload[key],
        0
      );

      const difference = TOTAL_HOURS - totalHours;

      if (Math.abs(difference) > 0.001) {

        const targetInput =
          lastEditedHoursField || hourInputs[0];

        if (difference > 0) {

          errors.push([
            targetInput,
            `Your four daily-hour fields must total 24 hours. Add ${difference.toFixed(1)} more hours.`
          ]);

        } else {

          errors.push([
            targetInput,
            `Your four daily-hour fields exceed 24 hours by ${Math.abs(difference).toFixed(1)} hours.`
          ]);

        }

      }

    }

    return errors;

  }

  // ---------------------------------------------------------
  // Collect form data
  // ---------------------------------------------------------

  function collectPayload() {

    const fd = new FormData(form);

    return {

      age: fd.get("age") === ""
        ? NaN : parseInt(fd.get("age"), 10),

      gender: fd.get("gender") || "",

      country: (fd.get("country") || "").trim(),

      academic_level: fd.get("academic_level") || "",

      most_used_platform: fd.get("most_used_platform") || "",

      purpose_of_use: fd.get("purpose_of_use") || "",

      avg_daily_usage_hours: fd.get("avg_daily_usage_hours") === ""
        ? NaN : parseFloat(fd.get("avg_daily_usage_hours")),

      daily_unlocks: fd.get("daily_unlocks") === ""
        ? NaN : parseInt(fd.get("daily_unlocks"), 10),

      study_hours: fd.get("study_hours") === ""
        ? NaN : parseFloat(fd.get("study_hours")),

      physical_activity_hours: fd.get("physical_activity_hours") === ""
        ? NaN : parseFloat(fd.get("physical_activity_hours")),

      sleep_hours_per_night: fd.get("sleep_hours_per_night") === ""
        ? NaN : parseFloat(fd.get("sleep_hours_per_night")),

      stress_level: fd.get("stress_level") || ""

    };

  }

  // ---------------------------------------------------------
  // UI state switching
  // ---------------------------------------------------------

  function showState(name) {

    [stateIdle, stateLoading, stateResult, stateError].forEach(el => {
      el.hidden = true;
    });

    const states = {
      idle: stateIdle,
      loading: stateLoading,
      result: stateResult,
      error: stateError
    };

    states[name].hidden = false;

  }

  function setSubmitting(isSubmitting) {

    submitBtn.disabled = isSubmitting;

    submitBtn.classList.toggle("loading", isSubmitting);

  }

  // ---------------------------------------------------------
  // Score interpretation
  // ---------------------------------------------------------

  function bandFor(score) {

    if (score < 4) {

      return {
        label: "Signal: strained",
        context: "Your responses suggest elevated strain right now. Small shifts in sleep or screen time can go a long way."
      };

    }

    if (score < 7) {

      return {
        label: "Signal: balanced",
        context: "Your rhythm looks fairly steady, with some room to recover and reset."
      };

    }

    return {
      label: "Signal: strong",
      context: "Your habits point to a well-supported, resilient baseline. Keep it up."
    };

  }

  // ---------------------------------------------------------
  // Render prediction result
  // ---------------------------------------------------------

  function renderResult(score) {

    const clamped = Math.max(0, Math.min(10, score));

    const { label, context } = bandFor(clamped);

    scoreNumberEl.textContent = score.toFixed(2);

    scoreBandEl.textContent = label;

    scoreContextEl.textContent = context;

    gaugeFill.style.transition = "none";

    gaugeFill.style.strokeDashoffset = String(GAUGE_ARC_LENGTH);

    requestAnimationFrame(() => {

      gaugeFill.style.transition = "";

      const offset = GAUGE_ARC_LENGTH * (1 - clamped / 10);

      gaugeFill.style.strokeDashoffset = String(offset);

    });

    showState("result");

  }

  function renderError(label, copy) {

    errorLabelEl.textContent = label;

    errorCopyEl.textContent = copy;

    showState("error");

  }

  // ---------------------------------------------------------
  // Handle FastAPI validation errors
  // ---------------------------------------------------------

  function applyServerValidationErrors(detail) {

    if (!Array.isArray(detail)) return false;

    let matched = false;

    detail.forEach(err => {

      const field = Array.isArray(err.loc)
        ? err.loc[err.loc.length - 1]
        : null;

      const input = field
        ? document.getElementById(field)
        : null;

      const target = field === "stress_level"
        ? stressHiddenInput
        : input;

      if (target) {

        setFieldError(target, err.msg || "Invalid value.");

        matched = true;

      }

    });

    return matched;

  }

  // ---------------------------------------------------------
  // Form submission
  // ---------------------------------------------------------

  form.addEventListener("submit", async e => {

    e.preventDefault();

    clearAllErrors();

    const payload = collectPayload();

    const clientErrors = validate(payload);

    if (clientErrors.length > 0) {

      clientErrors.forEach(([input, msg]) => {

        if (input) setFieldError(input, msg);

      });

      clientErrors[0][0]?.focus?.();

      return;

    }

    setSubmitting(true);

    showState("loading");

    try {

      const res = await fetch(`${API_BASE}/predict`, {

        method: "POST",

        headers: {
          "Content-Type": "application/json"
        },

        body: JSON.stringify(payload)

      });

      if (res.status === 422) {

        const body = await res.json().catch(() => null);

        const matched = body && applyServerValidationErrors(body.detail);

        renderError(
          "Check your inputs",
          matched
            ? "The API rejected a few fields. Details are marked on the form."
            : "The API rejected this submission. Please review your inputs."
        );

        return;

      }

      if (!res.ok) {

        let detailMsg = `The API responded with status ${res.status}.`;

        const body = await res.json().catch(() => null);

        if (body && typeof body.detail === "string") {
          detailMsg = body.detail;
        }

        renderError("Prediction failed", detailMsg);

        return;

      }

      const data = await res.json();

      if (typeof data.predicted_mental_health_score !== "number") {

        renderError(
          "Unexpected response",
          "The API responded, but the score was missing or malformed."
        );

        return;

      }

      renderResult(data.predicted_mental_health_score);

    } catch (err) {

      renderError(
        "Can't reach the server",
        `Couldn't connect to ${API_BASE}. Make sure your FastAPI backend is running.`
      );

    } finally {

      setSubmitting(false);

    }

  });

  // ---------------------------------------------------------
  // Clear errors when user edits fields
  // ---------------------------------------------------------

  form.querySelectorAll("input, select").forEach(el => {

    el.addEventListener("input", () => clearFieldError(el));

    el.addEventListener("change", () => clearFieldError(el));

  });

  // ---------------------------------------------------------
  // Reset and retry
  // ---------------------------------------------------------

  resetBtn.addEventListener("click", () => {

    showState("idle");

  });

  errorRetryBtn.addEventListener("click", () => {

    showState("idle");

  });

})();
