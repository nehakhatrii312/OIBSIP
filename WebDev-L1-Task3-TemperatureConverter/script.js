"use strict";

/* ---------- Configuration ---------- */

// Lowest physically valid value for each unit (absolute zero)
const ABSOLUTE_ZERO = { C: -273.15, F: -459.67, K: 0 };

// Unit symbols used in the output
const UNIT_SYMBOLS = { C: "°C", F: "°F", K: " K" };

// Accepts: 12, -12, +12, 12.5, .5, -.5, 12., 1e5, -1.5E-3
const NUMBER_PATTERN = /^[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$/;

// Formatter: always 2 decimals, thousands separators for readability
const numberFormatter = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/* ---------- DOM references ---------- */
const form = document.getElementById("converter-form");
const inputEl = document.getElementById("temperature-input");
const unitEl = document.getElementById("unit-select");
const errorEl = document.getElementById("error-message");
const resetBtn = document.getElementById("reset-button");
const resultsEl = document.getElementById("results");

/* ---------- Validation ---------- */

/**
 * Validates the current input.
 * @param {boolean} isSubmit - true when triggered by Convert/Enter (empty input becomes an error).
 * @returns {{valid: boolean, value?: number, message?: string, silent?: boolean}}
 */
function validateInput(isSubmit = false) {
  const raw = inputEl.value.trim();
  const unit = unitEl.value;

  // Empty: only an error on submit; while typing/clearing we stay quiet
  if (raw === "") {
    return isSubmit
      ? { valid: false, message: "Please enter a temperature value." }
      : { valid: false, silent: true };
  }

  if (!NUMBER_PATTERN.test(raw)) {
    return { valid: false, message: "Please enter a valid number (e.g. 25, -10, 36.6)." };
  }

  const value = Number(raw);

  // Inputs like 1e999 parse to Infinity
  if (!Number.isFinite(value)) {
    return { valid: false, message: "That number is too large to process." };
  }

  // Physical limit check in the unit entered (exact, no float drift)
  if (value < ABSOLUTE_ZERO[unit]) {
    return { valid: false, message: "Temperature cannot be below absolute zero." };
  }

  return { valid: true, value };
}

/* ---------- Conversion ---------- */

/** Converts a value from the given unit to Celsius (the base unit). */
function toCelsius(value, unit) {
  switch (unit) {
    case "F": return (value - 32) * 5 / 9;
    case "K": return value - 273.15;
    default:  return value;
  }
}

/** Converts a Celsius value to the target unit. */
function fromCelsius(celsius, unit) {
  switch (unit) {
    case "F": return (celsius * 9 / 5) + 32;
    case "K": return celsius + 273.15;
    default:  return celsius;
  }
}

/**
 * Converts a value to all three units via Celsius.
 * @returns {{C: number, F: number, K: number}}
 */
function convertTemperature(value, fromUnit) {
  const celsius = toCelsius(value, fromUnit);
  return {
    C: fromCelsius(celsius, "C"),
    F: fromCelsius(celsius, "F"),
    K: fromCelsius(celsius, "K"),
  };
}

/* ---------- Display ---------- */

/** Formats a number to 2 decimals with its unit symbol (avoids "-0.00"). */
function formatResult(value, unit) {
  const safeValue = Math.abs(value) < 0.005 ? 0 : value;
  return numberFormatter.format(safeValue) + UNIT_SYMBOLS[unit];
}

/** Shows all three converted values and highlights the source unit. */
function displayResults(results, sourceUnit) {
  Object.keys(results).forEach((unit) => {
    document.getElementById(`result-${unit}`).textContent = formatResult(results[unit], unit);
    const item = resultsEl.querySelector(`[data-unit="${unit}"]`);
    item.classList.toggle("result--source", unit === sourceUnit);
  });
  resultsEl.hidden = false;
}

/** Shows an inline error and marks the input as invalid. */
function showError(message) {
  errorEl.textContent = message;
  errorEl.hidden = false;
  inputEl.setAttribute("aria-invalid", "true");
}

/** Hides the error message and clears the invalid state. */
function clearError() {
  errorEl.textContent = "";
  errorEl.hidden = true;
  inputEl.setAttribute("aria-invalid", "false");
}

/** Hides the results panel. */
function clearResults() {
  resultsEl.hidden = true;
}

/* ---------- Event handlers ---------- */

/** Runs validation, then updates the UI with an error or the results. */
function handleConversion(isSubmit) {
  const validation = validateInput(isSubmit);

  if (!validation.valid) {
    clearResults();                       // never show stale or invalid results
    if (validation.silent) {
      clearError();
    } else {
      showError(validation.message);
    }
    return;
  }

  clearError();

  // Real-time typing only validates; results appear on Convert / Enter
  if (isSubmit) {
    const results = convertTemperature(validation.value, unitEl.value);
    displayResults(results, unitEl.value);
  }
}

/** Clears input, results and errors, then refocuses the input. */
function resetForm() {
  inputEl.value = "";
  unitEl.value = "C";
  clearError();
  clearResults();
  inputEl.focus();
}

/* ---------- Event listeners ---------- */

// Submit covers both the Convert button click and pressing Enter in the input
form.addEventListener("submit", (event) => {
  event.preventDefault();
  handleConversion(true);
});

// Real-time validation while typing and when the unit changes
inputEl.addEventListener("input", () => handleConversion(false));
unitEl.addEventListener("change", () => handleConversion(false));

resetBtn.addEventListener("click", resetForm);