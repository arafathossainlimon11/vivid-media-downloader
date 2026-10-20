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
    // Attempt 1: Fetch via native serverless parser
    let response = await fetch(`/api/download?url=${encodeURIComponent(targetUrl)}`);
    let data = await response.json();

    if (data.success) {
      loader.classList.add("hidden");
      renderResults(data);
      return;
    }

    // Attempt 2: Client-side Browser Fetch Fallback (Bypasses Datacenter IP Blocks)
    const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(targetUrl)}`;
    const clientResponse = await fetch(proxyUrl);
    const clientData = await clientResponse.json();

    if (clientData.contents) {
      const parsedData = parseHtmlClientSide(clientData.contents);
      loader.classList.add("hidden");

      if (parsedData.success) {
        renderResults(parsedData);
      } else {
        showError("Could not extract media. Ensure the account or post is public.");
      }
    } else {
      loader.classList.add("hidden");
      showError("Failed to resolve content from this link.");
    }

  } catch (err) {
    loader.classList.add("hidden");
    showError("Network connection error. Please try again.");
  }
}

function parseHtmlClientSide(htmlString) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlString, "text/html");

  const videoMeta = doc.querySelector('meta[property="og:video"]') || 
                    doc.querySelector('meta[property="og:video:secure_url"]') ||
                    doc.querySelector('meta[name="twitter:player:stream"]');

  const imageMeta = doc.querySelector('meta[property="og:image"]') || 
                    doc.querySelector('meta[name="twitter:image"]');

  const titleMeta = doc.querySelector('meta[property="og:title"]') || doc.title;

  const videoUrl = videoMeta ? videoMeta.getAttribute("content") : null;
  const imageUrl = imageMeta ? imageMeta.getAttribute("content") : null;
  const title = typeof titleMeta === "string" ? titleMeta : (titleMeta ? titleMeta.getAttribute("content") : "Media File");

  if (videoUrl) {
    return {
      success: true,
      type: "single",
      title: title,
      thumb: imageUrl,
      picker: [
        { label: "Download HD Video", url: videoUrl },
        { label: "Download SD Video", url: videoUrl }
      ]
    };
  } else if (imageUrl) {
    return {
      success: true,
      type: "gallery",
      items: [{ url: imageUrl, isVid: false }]
    };
  }

  return { success: false };
}

function renderResults(data) {
  resultContainer.classList.remove("hidden");

  if (data.type === "single") {
    resultContainer.innerHTML = `
      <div class="media-card">
        ${data.thumb ? `<img src="${data.thumb}" alt="Media Preview" class="media-preview-img" />` : ""}
        <h3 class="media-title">${data.title}</h3>
        
        <div class="quality-selection">
          <label for="qualitySelect">Select Download Option:</label>
          <select id="qualitySelect" class="quality-select">
            ${data.picker.map(item => `<option value="${item.url}">${item.label}</option>`).join("")}
          </select>
        </div>

        <button class="btn-download" onclick="triggerDownloadFromPicker()">
          <i class="fa-solid fa-download"></i> Download Video
        </button>
      </div>
    `;
  } else if (data.type === "gallery") {
    let itemsHtml = data.items.map((item, index) => `
      <div class="grid-item">
        <img src="${item.url}" alt="Photo ${index + 1}" />
        <button class="btn-download" style="padding: 8px 12px; font-size: 0.85rem;" onclick="executeDownload('${item.url}')">
          <i class="fa-solid fa-download"></i> Save Photo ${index + 1}
        </button>
      </div>
    `).join("");

    resultContainer.innerHTML = `
      <h3>Extracted Photo Content:</h3>
      <div class="media-grid">${itemsHtml}</div>
    `;
  }
}

function triggerDownloadFromPicker() {
  const selectedUrl = document.getElementById("qualitySelect").value;
  executeDownload(selectedUrl);
}

function executeDownload(fileUrl) {
  if (SMART_LINK_URL) {
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
