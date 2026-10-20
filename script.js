const RENDER_BACKEND_URL = "https://vivid-media-downloader.onrender.com"; // Your Render Backend URL
const SMART_LINK_URL = ""; // Monetag / Adsterra SmartLink URL

const urlInput = document.getElementById("urlInput");
const searchBtn = document.getElementById("searchBtn");
const loader = document.getElementById("loader");
const errorMessage = document.getElementById("errorMessage");
const resultContainer = document.getElementById("resultContainer");

searchBtn.addEventListener("click", processMedia);
urlInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") processMedia();
});

async function processMedia() {
  const targetUrl = urlInput.value.trim();

  if (!targetUrl) {
    showError("Please paste a valid social media video or photo link.");
    return;
  }

  hideError();
  resultContainer.classList.add("hidden");
  resultContainer.innerHTML = "";
  loader.classList.remove("hidden");

  try {
    const response = await fetch(`${RENDER_BACKEND_URL}/api/download?url=${encodeURIComponent(targetUrl)}`);
    const data = await response.json();

    loader.classList.add("hidden");

    if (!data.success) {
      showError(data.message || "Failed to process video. Make sure link is public.");
      return;
    }

    renderResults(data);
  } catch (err) {
    loader.classList.add("hidden");
    showError("Backend server is starting up or network error. Please wait 15 seconds and try again.");
  }
}

function renderResults(data) {
  resultContainer.classList.remove("hidden");

  if (data.type === "single") {
    resultContainer.innerHTML = `
      <div class="media-card">
        ${data.thumb ? `<img src="${data.thumb}" alt="Media Preview" class="media-preview-img" />` : ""}
        <h3 class="media-title">${data.title || "Social Media Media"}</h3>
        
        <div class="quality-selection">
          <label for="qualitySelect">Available Quality Option:</label>
          <select id="qualitySelect" class="quality-select">
            ${data.picker.map(item => `<option value="${item.url}">${item.label}</option>`).join("")}
          </select>
        </div>

        <button class="btn-download" onclick="triggerDownloadFromPicker()">
          <i class="fa-solid fa-download"></i> Download Video
        </button>
      </div>
    `;
  }
}

function triggerDownloadFromPicker() {
  const selectedUrl = document.getElementById("qualitySelect").value;
  executeDownload(selectedUrl);
}

function executeDownload(fileUrl) {
  if (SMART_LINK_URL && SMART_LINK_URL !== "") {
    window.open(SMART_LINK_URL, "_blank");
  }

  const tempAnchor = document.createElement("a");
  tempAnchor.href = fileUrl;
  tempAnchor.target = "_blank";
  tempAnchor.download = "downloaded-media";
  document.body.appendChild(tempAnchor);
  tempAnchor.click();
  document.body.removeChild(tempAnchor);
}

function showError(msg) {
  errorMessage.innerText = msg;
  errorMessage.classList.remove("hidden");
}

function hideError() {
  errorMessage.classList.add("hidden");
}
