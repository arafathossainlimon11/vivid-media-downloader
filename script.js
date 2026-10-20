// Monetag / Adsterra SmartLink URL (Replace with your actual ad link)
const SMART_LINK_URL = "https://www.google.com"; // Put your smartlink here

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

  // Reset UI
  hideError();
  resultContainer.classList.add("hidden");
  resultContainer.innerHTML = "";
  loader.classList.remove("hidden");

  try {
    const response = await fetch(`/api/download?url=${encodeURIComponent(targetUrl)}`);
    const data = await response.json();

    loader.classList.add("hidden");

    if (!data.success) {
      showError(data.message || "Failed to parse video. Please check the link.");
      return;
    }

    renderResults(data);
  } catch (err) {
    loader.classList.add("hidden");
    showError("Server timeout or network error. Please try again.");
  }
}

function renderResults(data) {
  resultContainer.classList.remove("hidden");

  // Single Media / Video Result
  if (data.type === "single") {
    resultContainer.innerHTML = `
      <div class="media-card">
        ${data.thumb ? `<img src="${data.thumb}" alt="Media Preview" class="media-preview-img" />` : ""}
        <h3 class="media-title">${data.title || "Social Media Video"}</h3>
        
        <div class="quality-selection">
          <label for="qualitySelect">Select Download Quality:</label>
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
  // Multi-item / Gallery (e.g. Instagram Carousel / Multi-photos)
  else if (data.type === "gallery") {
    let itemsHtml = data.items.map((item, index) => `
      <div class="grid-item">
        ${item.isVid ? `<video src="${item.url}" controls></video>` : `<img src="${item.url}" alt="Photo ${index + 1}" />`}
        <button class="btn-download" style="padding: 8px 12px; font-size: 0.85rem;" onclick="executeDownload('${item.url}')">
          <i class="fa-solid fa-download"></i> Save Item ${index + 1}
        </button>
      </div>
    `).join("");

    resultContainer.innerHTML = `
      <h3>Extracted ${data.items.length} Items:</h3>
      <div class="media-grid">${itemsHtml}</div>
    `;
  }
}

function triggerDownloadFromPicker() {
  const selectedUrl = document.getElementById("qualitySelect").value;
  executeDownload(selectedUrl);
}

function executeDownload(fileUrl) {
  // 1. Open SmartLink Ad in a new background tab
  if (SMART_LINK_URL && SMART_LINK_URL !== "") {
    window.open(SMART_LINK_URL, "_blank");
  }

  // 2. Trigger File Download
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
