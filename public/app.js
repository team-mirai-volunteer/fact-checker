// Fact check form variables
const form = document.getElementById("factCheckForm");
const submitBtn = document.getElementById("submitBtn");
const loading = document.getElementById("loading");
const error = document.getElementById("error");
const result = document.getElementById("result");
const resultLabel = document.getElementById("resultLabel");
const resultAnswer = document.getElementById("resultAnswer");
const copyButton = document.getElementById("copyButton");

// Get API URL from environment or use default
const API_BASE_URL = window.FACT_CHECK_API_URL || "http://localhost:8080";
const FACT_CHECK_URL = `${API_BASE_URL}/api/fact-check`;

// Handle fact check form submission
form.addEventListener("submit", async (e) => {
  e.preventDefault();

  // Hide previous results
  error.style.display = "none";
  result.style.display = "none";

  // Show loading
  loading.style.display = "block";
  submitBtn.disabled = true;

  const formData = new FormData(form);
  const text = formData.get("text");

  try {
    const response = await fetch(FACT_CHECK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ text }),
    });

    if (!response.ok) {
      throw new Error("ファクトチェックに失敗しました。");
    }

    const data = await response.json();

    // Show result
    result.className = `result ${data.ok ? "ok" : "ng"}`;
    resultLabel.textContent = data.ok ? "✅ OK" : "❌ NG";
    resultAnswer.textContent = data.answer;
    result.style.display = "block";
  } catch (err) {
    error.textContent = err.message;
    error.style.display = "block";
  } finally {
    loading.style.display = "none";
    submitBtn.disabled = false;
  }
});

// Handle copy button click
copyButton.addEventListener("click", async () => {
  const label = resultLabel.textContent;
  const answer = resultAnswer.textContent;
  const textToCopy = `${label}\n${answer}`;

  try {
    await navigator.clipboard.writeText(textToCopy);

    // Show success feedback
    copyButton.textContent = "コピーしました！";
    copyButton.classList.add("copied");

    // Reset button after 2 seconds
    setTimeout(() => {
      copyButton.textContent = "結果をコピー";
      copyButton.classList.remove("copied");
    }, 2000);
  } catch (err) {
    console.error("Failed to copy text: ", err);
    copyButton.textContent = "コピーに失敗しました";

    // Reset button after 2 seconds
    setTimeout(() => {
      copyButton.textContent = "結果をコピー";
    }, 2000);
  }
});