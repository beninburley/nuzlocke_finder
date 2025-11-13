/**
 * Strategy Results Display Module
 * Handles displaying battle strategy results and timelines
 */

import { capitalize } from "./battle-formatter.js";

/**
 * Display strategy results with timelines
 * @param {Array} timeline - Array of turn events (average case)
 * @param {Object} analysis - Battle analysis object
 * @param {Array} worstCaseTimeline - Array of turn events (worst case)
 */
export function displayStrategyResults(timeline, analysis, worstCaseTimeline) {
  const resultsSection = document.querySelector(".strategy-results-section");
  resultsSection.style.display = "block";

  // Display worst-case risk tier prominently
  const riskTierEl = document.getElementById("riskLevel");
  if (analysis.worstCaseTier) {
    // Display worst-case tier instead of simple risk level
    riskTierEl.textContent = analysis.worstCaseTier;

    // Set color based on tier
    if (analysis.worstCaseTier.includes("RISKLESS")) {
      riskTierEl.className = "stat-value risk-low";
    } else if (analysis.worstCaseTier.includes("RISKY")) {
      riskTierEl.className = "stat-value risk-medium";
    } else if (analysis.worstCaseTier.includes("SACRIFICE")) {
      riskTierEl.className = "stat-value risk-high";
    } else {
      riskTierEl.className = "stat-value risk-high";
    }
  } else {
    riskTierEl.textContent = analysis.riskLevel;
    riskTierEl.className = `stat-value risk-${analysis.riskLevel.toLowerCase()}`;
  }

  // Display death comparison
  document.getElementById(
    "expectedDeaths"
  ).textContent = `${analysis.expectedDeaths} avg / ${analysis.worstCaseDeaths} worst`;
  document.getElementById("turnCount").textContent = analysis.turnCount;

  // Display timeline with collapsible sections
  const timelineEl = document.getElementById("strategyTimeline");
  timelineEl.innerHTML = "";

  // Add comparison header
  const comparisonHeader = createComparisonHeader(analysis);
  timelineEl.appendChild(comparisonHeader);

  // Average Case Section (collapsible)
  const avgCaseSection = createAverageCaseSection(timeline, analysis);
  timelineEl.appendChild(avgCaseSection);

  // Worst Case Section (collapsible, expanded by default)
  if (worstCaseTimeline) {
    const worstCaseSection = createWorstCaseSection(
      worstCaseTimeline,
      analysis
    );
    timelineEl.appendChild(worstCaseSection);
  }
}

/**
 * Create comparison header showing both scenarios
 * @param {Object} analysis - Battle analysis object
 * @returns {HTMLElement} - Comparison header element
 */
function createComparisonHeader(analysis) {
  const comparisonHeader = document.createElement("div");
  comparisonHeader.style.cssText =
    "background: #1e1e1e; padding: 15px; margin-bottom: 15px; border-radius: 8px;";
  comparisonHeader.innerHTML = `
    <h3 style="margin: 0 0 10px 0; color: #fff;">Battle Strategy Comparison</h3>
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
      <div style="background: #2d2d30; padding: 10px; border-radius: 5px;">
        <strong style="color: #4ec9b0;">Average Case:</strong>
        <div>${analysis.expectedDeaths} deaths${
    analysis.victory ? ", Victory ✅" : ""
  }</div>
      </div>
      <div style="background: #2d2d30; padding: 10px; border-radius: 5px;">
        <strong style="color: #ff6b6b;">Worst Case:</strong>
        <div>${analysis.worstCaseDeaths} deaths${
    analysis.worstCaseWin
      ? ", Victory ✅"
      : analysis.worstCaseLoss
      ? ", Loss ❌"
      : ""
  }</div>
      </div>
    </div>
  `;
  return comparisonHeader;
}

/**
 * Create average case scenario section
 * @param {Array} timeline - Array of turn events
 * @param {Object} analysis - Battle analysis object
 * @returns {HTMLElement} - Average case section element
 */
function createAverageCaseSection(timeline, analysis) {
  const avgCaseSection = document.createElement("div");
  avgCaseSection.style.cssText = "margin-bottom: 20px;";

  const avgCaseHeader = document.createElement("div");
  avgCaseHeader.style.cssText =
    "background: #2d2d30; padding: 12px; cursor: pointer; border-radius: 8px; display: flex; justify-content: space-between; align-items: center;";
  avgCaseHeader.innerHTML = `
    <strong style="color: #4ec9b0; font-size: 16px;">📊 Average Case Scenario (${analysis.expectedDeaths} deaths)</strong>
    <span id="avgToggle" style="font-size: 20px;">▼</span>
  `;

  const avgCaseContent = document.createElement("div");
  avgCaseContent.id = "avgCaseContent";
  avgCaseContent.style.cssText = "margin-top: 10px;";

  timeline.forEach((step, index) => {
    const stepEl = createTimelineStep(step);
    avgCaseContent.appendChild(stepEl);
  });

  avgCaseHeader.addEventListener("click", () => {
    const content = avgCaseContent;
    const toggle = document.getElementById("avgToggle");
    if (content.style.display === "none") {
      content.style.display = "block";
      toggle.textContent = "▼";
    } else {
      content.style.display = "none";
      toggle.textContent = "▶";
    }
  });

  avgCaseSection.appendChild(avgCaseHeader);
  avgCaseSection.appendChild(avgCaseContent);
  return avgCaseSection;
}

/**
 * Create worst case scenario section
 * @param {Array} worstCaseTimeline - Array of turn events (worst case)
 * @param {Object} analysis - Battle analysis object
 * @returns {HTMLElement} - Worst case section element
 */
function createWorstCaseSection(worstCaseTimeline, analysis) {
  const worstCaseSection = document.createElement("div");
  worstCaseSection.style.cssText = "margin-bottom: 20px;";

  const worstCaseHeader = document.createElement("div");
  worstCaseHeader.style.cssText =
    "background: #3d2d2d; padding: 12px; cursor: pointer; border-radius: 8px; display: flex; justify-content: space-between; align-items: center;";
  worstCaseHeader.innerHTML = `
    <strong style="color: #ff6b6b; font-size: 16px;">💀 Worst Case Scenario (${analysis.worstCaseDeaths} deaths)</strong>
    <span id="worstToggle" style="font-size: 20px;">▼</span>
  `;

  const worstCaseContent = document.createElement("div");
  worstCaseContent.id = "worstCaseContent";
  worstCaseContent.style.cssText = "margin-top: 10px;";

  worstCaseTimeline.forEach((step) => {
    const stepEl = document.createElement("div");
    stepEl.className = "timeline-step";
    stepEl.style.cssText = "border-left: 3px solid #ff6b6b;";

    stepEl.innerHTML = `
      <div class="step-header">
        <span class="step-number">Turn ${step.turn}</span>
        <span class="step-action">${step.action}</span>
      </div>
      <div class="step-details">
        ${step.details}
        <span class="step-risk worst-case" style="background: #d32f2f;">Worst Case</span>
      </div>
    `;

    worstCaseContent.appendChild(stepEl);
  });

  worstCaseHeader.addEventListener("click", () => {
    const content = worstCaseContent;
    const toggle = document.getElementById("worstToggle");
    if (content.style.display === "none") {
      content.style.display = "block";
      toggle.textContent = "▼";
    } else {
      content.style.display = "none";
      toggle.textContent = "▶";
    }
  });

  worstCaseSection.appendChild(worstCaseHeader);
  worstCaseSection.appendChild(worstCaseContent);
  return worstCaseSection;
}

/**
 * Create a timeline step element with enhanced details
 * @param {Object} step - Timeline step object
 * @returns {HTMLElement} - Timeline step element
 */
function createTimelineStep(step) {
  const stepEl = document.createElement("div");
  stepEl.className = "timeline-step";

  const riskClass = step.risk || "low";

  // Build enhanced risk details
  let enhancedDetails = step.details;

  // Add crit risks if present
  if (step.critRisks && step.critRisks.length > 0) {
    enhancedDetails += `<div class="crit-risks"><strong>⚠️ Critical Hit Risks:</strong><ul>`;
    step.critRisks.forEach((risk) => {
      enhancedDetails += `<li>${risk}</li>`;
    });
    enhancedDetails += `</ul></div>`;
  }

  // Add status risks if present
  if (step.statusRisks && step.statusRisks.length > 0) {
    enhancedDetails += `<div class="status-risks"><strong>🌀 Status Effect Risks:</strong><ul>`;
    step.statusRisks.forEach((risk) => {
      enhancedDetails += `<li>${risk}</li>`;
    });
    enhancedDetails += `</ul></div>`;
  }

  // Add AI move probability analysis if present
  if (
    step.aiMoveAnalysis &&
    step.aiMoveAnalysis.odds &&
    Object.keys(step.aiMoveAnalysis.odds).length > 0
  ) {
    enhancedDetails += createAIMoveAnalysisSection(step.aiMoveAnalysis);
  }

  stepEl.innerHTML = `
    <div class="step-header">
      <span class="step-number">Turn ${step.turn}</span>
      <span class="step-action">${step.action}</span>
    </div>
    <div class="step-details">
      ${enhancedDetails}
      <span class="step-risk ${riskClass}">Risk: ${capitalize(riskClass)}</span>
    </div>
  `;

  return stepEl;
}

/**
 * Create AI move probability analysis section
 * @param {Object} aiMoveAnalysis - AI move analysis object
 * @returns {string} - HTML string for AI analysis
 */
function createAIMoveAnalysisSection(aiMoveAnalysis) {
  let html = `<div class="ai-move-analysis"><strong>🎲 AI Move Probabilities:</strong><ul>`;

  // Sort moves by probability
  const sortedMoves = Object.entries(aiMoveAnalysis.odds).sort(
    (a, b) => b[1] - a[1]
  );

  sortedMoves.forEach(([move, prob]) => {
    const highlight =
      prob > 50 ? ' style="color: #ff6b6b; font-weight: bold;"' : "";
    html += `<li${highlight}>${capitalize(move)}: ${prob}%</li>`;
  });
  html += `</ul>`;

  // Add influence tips
  if (aiMoveAnalysis.influence && aiMoveAnalysis.influence.length > 0) {
    html += `<div class="influence-tips"><strong>💡 How to Influence AI:</strong><ul>`;
    aiMoveAnalysis.influence.forEach((tip) => {
      html += `<li>${tip}</li>`;
    });
    html += `</ul></div>`;
  }

  html += `</div>`;
  return html;
}
