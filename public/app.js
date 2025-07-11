// Authentication variables
let authToken = null;
const authModal = document.getElementById("authModal");
const authForm = document.getElementById("authForm");
const authError = document.getElementById("authError");
const mainContent = document.getElementById("mainContent");

// Fact check form variables
const form = document.getElementById("factCheckForm");
const submitBtn = document.getElementById("submitBtn");
const loading = document.getElementById("loading");
const error = document.getElementById("error");
const result = document.getElementById("result");
const resultLabel = document.getElementById("resultLabel");
const resultAnswer = document.getElementById("resultAnswer");
const copyButton = document.getElementById("copyButton");

// Get API URLs from environment or use default
const AUTH_URL = `${window.FACT_CHECK_API_URL}/api/auth`;
const FACT_CHECK_URL = `${window.FACT_CHECK_API_URL}/api/fact-check`;

// Check authentication on page load
window.addEventListener("load", async () => {
  const savedAuth = sessionStorage.getItem("authToken");
  if (savedAuth) {
    // Verify the saved auth is still valid
    try {
      const response = await fetch(AUTH_URL, {
        method: "POST",
        headers: {
          Authorization: savedAuth,
        },
      });

      if (response.ok) {
        authToken = savedAuth;
        authModal.style.display = "none";
        mainContent.style.display = "block";
      } else {
        sessionStorage.removeItem("authToken");
      }
    } catch (err) {
      console.log("Authentication check failed:", err);
      sessionStorage.removeItem("authToken");
    }
  }
});

// Handle authentication form submission
authForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  authError.style.display = "none";

  const username = document.getElementById("authUsername").value;
  const password = document.getElementById("authPassword").value;
  const basicAuth = "Basic " + btoa(`${username}:${password}`);

  try {
    // Test authentication
    const response = await fetch(AUTH_URL, {
      method: "POST",
      headers: {
        Authorization: basicAuth,
      },
    });

    if (response.ok) {
      authToken = basicAuth;
      sessionStorage.setItem("authToken", authToken);
      authModal.style.display = "none";
      mainContent.style.display = "block";
    } else if (response.status === 401) {
      authError.textContent =
        "認証に失敗しました。ユーザー名とパスワードを確認してください。";
      authError.style.display = "block";
    } else {
      authError.textContent = "エラーが発生しました。";
      authError.style.display = "block";
    }
  } catch (err) {
    console.error("Authentication error:", err);
    authError.textContent = "サーバーに接続できません。";
    authError.style.display = "block";
  }
});

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
        Authorization: authToken,
      },
      body: JSON.stringify({ text }),
    });

    if (!response.ok) {
      if (response.status === 401) {
        // Clear auth and show login modal
        sessionStorage.removeItem("authToken");
        authToken = null;
        authModal.style.display = "flex";
        mainContent.style.display = "none";
        throw new Error(
          "認証の有効期限が切れました。再度ログインしてください。",
        );
      }
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
