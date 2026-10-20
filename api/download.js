export default async function handler(req, res) {
  const { url } = req.query;

  if (!url) {
    return res.status(400).json({ success: false, message: "URL is required" });
  }

  try {
    // 1. TikTok Specialized Free API (No key required)
    if (url.includes("tiktok.com")) {
      const ttRes = await fetch(`https://www.tikwm.com/api/?url=${encodeURIComponent(url)}`);
      const ttData = await ttRes.json();
      if (ttData && ttData.data) {
        return res.status(200).json({
          success: true,
          type: "single",
          title: ttData.data.title || "TikTok Video",
          thumb: ttData.data.cover,
          picker: [
            { label: "Download No Watermark (HD)", url: ttData.data.play },
            { label: "Download Watermark Video", url: ttData.data.wmplay },
            { label: "Download Audio (MP3)", url: ttData.data.music }
          ]
        });
      }
    }

    // 2. Multi-instance Cobalt / Fast Engine for Instagram, FB & Youtube
    const apiEndpoints = [
      "https://api.cobalt.tools/",
      "https://co.wuk.sh/",
      "https://cobalt.streamlabs.com/"
    ];

    for (const endpoint of apiEndpoints) {
      try {
        const response = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Accept": "application/json",
            "Content-Type": "application/json",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
          },
          body: JSON.stringify({ url: url })
        });

        if (response.ok) {
          const result = await response.json();
          if (result.url) {
            return res.status(200).json({
              success: true,
              type: "single",
              title: "Social Media Media File",
              picker: [{ label: "Download Media (HD)", url: result.url }]
            });
          } else if (result.picker) {
            return res.status(200).json({
              success: true,
              type: "gallery",
              items: result.picker.map(item => ({ url: item.url, isVid: item.type === "video" }))
            });
          }
        }
      } catch (err) {
        continue;
      }
    }

    return res.status(400).json({
      success: false,
      message: "Could not extract video. Ensure the post is public."
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server extraction error. Please try again."
    });
  }
        }
