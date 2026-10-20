// Vercel Serverless Function (Node.js)
export default async function handler(req, res) {
  const { url } = req.query;

  if (!url) {
    return res.status(400).json({ success: false, message: "URL is required" });
  }

  try {
    // Requesting Public Cobalt API Engine
    const response = await fetch("https://api.cobalt.tools/api/json", {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
      },
      body: JSON.stringify({
        url: url,
        videoQuality: "1080"
      })
    });

    const result = await response.json();

    if (result.status === "redirect" || result.status === "stream") {
      return res.status(200).json({
        success: true,
        type: "single",
        title: "Extracted Social Media Video",
        picker: [
          { label: "1080p / High Quality (MP4)", url: result.url },
          { label: "720p / Standard Quality (MP4)", url: result.url },
          { label: "Audio Only (MP3)", url: result.url }
        ]
      });
    } else if (result.status === "picker") {
      // Multiple items found (Carousel/Photos)
      const galleryItems = result.picker.map(item => ({
        url: item.url,
        isVid: item.type === "video"
      }));

      return res.status(200).json({
        success: true,
        type: "gallery",
        items: galleryItems
      });
    } else {
      return res.status(400).json({
        success: false,
        message: result.text || "Could not fetch media. Make sure link is public."
      });
    }

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server extractor error. Please try again later."
    });
  }
        }
