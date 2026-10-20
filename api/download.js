// Vercel Serverless Function (Updated for Cobalt v10 & Multi-Instance Fallback)
export default async function handler(req, res) {
  const { url } = req.query;

  if (!url) {
    return res.status(400).json({ success: false, message: "URL is required" });
  }

  // Cobalt v10 Active Public Instances Array
  const instances = [
    "https://api.cobalt.tools/",
    "https://co.wuk.sh/",
    "https://cobalt.streamlabs.com/"
  ];

  let lastErrorMessage = "Unable to process link. Make sure the content is public.";

  for (const instanceApi of instances) {
    try {
      const response = await fetch(instanceApi, {
        method: "POST",
        headers: {
          "Accept": "application/json",
          "Content-Type": "application/json",
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
        },
        body: JSON.stringify({
          url: url,
          videoQuality: "1080",
          youtubeVideoCodec: "h264"
        })
      });

      if (!response.ok) {
        continue;
      }

      const result = await response.json();

      // Cobalt v10 Response Status Handlers (tunnel, redirect, stream, picker)
      if (result.status === "redirect" || result.status === "tunnel" || result.status === "stream") {
        return res.status(200).json({
          success: true,
          type: "single",
          title: "Extracted Social Media Media",
          picker: [
            { label: "Download HD Quality (MP4/Media)", url: result.url },
            { label: "Download Standard Quality", url: result.url }
          ]
        });
      } 
      // Handle Multiple Items (Carousel Posts / Multi-Photos)
      else if (result.status === "picker") {
        const galleryItems = result.picker.map(item => ({
          url: item.url,
          isVid: item.type === "video" || (item.url && item.url.includes(".mp4"))
        }));

        return res.status(200).json({
          success: true,
          type: "gallery",
          items: galleryItems
        });
      } else if (result.status === "error") {
        lastErrorMessage = result.text || "Could not parse video from this link.";
      }
    } catch (err) {
      // Continue to next instance if current one fails
      continue;
    }
  }

  return res.status(400).json({
    success: false,
    message: lastErrorMessage
  });
  }
