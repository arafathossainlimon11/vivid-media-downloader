// Native Serverless Fetcher & HTML Scraper (No External API Required)
export default async function handler(req, res) {
  const { url } = req.query;

  if (!url) {
    return res.status(400).json({ success: false, message: "URL is required" });
  }

  try {
    // 1. Fetch raw HTML content from the social media URL
    const targetResponse = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5"
      }
    });

    if (!targetResponse.ok) {
      return res.status(400).json({ success: false, message: "Unable to access post. Ensure it is public." });
    }

    const html = await targetResponse.text();

    // 2. Extract OpenGraph & Twitter Meta Tags via Regex
    const videoMatch = html.match(/<meta\s+(?:property|name)=["'](?:og:video|og:video:secure_url|twitter:player:stream)["']\s+content=["']([^"']+)["']/i) ||
                       html.match(/content=["']([^"']+)["']\s+(?:property|name)=["'](?:og:video|og:video:secure_url)["']/i);

    const imageMatch = html.match(/<meta\s+(?:property|name)=["'](?:og:image|og:image:secure_url|twitter:image)["']\s+content=["']([^"']+)["']/i) ||
                       html.match(/content=["']([^"']+)["']\s+(?:property|name)=["'](?:og:image)["']/i);

    const titleMatch = html.match(/<meta\s+(?:property|name)=["'](?:og:title|twitter:title)["']\s+content=["']([^"']+)["']/i);

    const extractedVideo = videoMatch ? decodeHtmlEntities(videoMatch[1]) : null;
    const extractedImage = imageMatch ? decodeHtmlEntities(imageMatch[1]) : null;
    const extractedTitle = titleMatch ? decodeHtmlEntities(titleMatch[1]) : "Social Media Post";

    // 3. Return Extracted Media
    if (extractedVideo) {
      return res.status(200).json({
        success: true,
        type: "single",
        title: extractedTitle,
        thumb: extractedImage,
        picker: [
          { label: "Download HD Video (MP4)", url: extractedVideo },
          { label: "Download SD Quality", url: extractedVideo }
        ]
      });
    } else if (extractedImage) {
      return res.status(200).json({
        success: true,
        type: "gallery",
        items: [
          { url: extractedImage, isVid: false }
        ]
      });
    } else {
      return res.status(404).json({
        success: false,
        message: "No direct media link found in source code. Make sure the link is a valid public post."
      });
    }

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Parsing error. Please verify the link and try again."
    });
  }
}

function decodeHtmlEntities(str) {
  return str.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"');
                                                           }
