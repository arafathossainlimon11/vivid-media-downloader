from flask import Flask, request, jsonify
from flask_cors import CORS
import requests
import re
from urllib.parse import quote

app = Flask(__name__)
CORS(app)

# Official Instagram Mobile App Headers
IG_MOBILE_HEADERS = {
    'User-Agent': 'Instagram 219.0.0.12.117 Android (31/12; 480dpi; 1080x2266; Xiaomi; Redmi Note 10; mojito; qcom; en_US; 352210871)',
    'Accept': '*/*',
    'Accept-Language': 'en-US,en;q=0.9',
    'X-IG-App-ID': '936619743392459',
}

WEB_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
    'Accept-Language': 'en-US,en;q=0.9'
}

@app.route('/api/download', methods=['GET'])
def download():
    video_url = request.args.get('url')
    
    if not video_url:
        return jsonify({'success': False, 'message': 'URL parameter required'}), 400

    # 1. Instagram Dedicated Extractor
    if 'instagram.com' in video_url:
        shortcode = extract_ig_shortcode(video_url)
        if shortcode:
            # Route A: Embed Stream Extraction with Web Headers
            try:
                embed_url = f"https://www.instagram.com/p/{shortcode}/embed/captioned/"
                res = requests.get(embed_url, headers=WEB_HEADERS, timeout=8)
                if res.status_code == 200:
                    video_match = re.search(r'<video[^>]*src="([^"]+)"', res.text) or re.search(r'video_url\\":\\"([^"]+)\\"', res.text)
                    thumb_match = re.search(r'class="EmbeddedMediaImage"[^>]*src="([^"]+)"', res.text)
                    
                    if video_match:
                        clean_vid_url = video_match.group(1).replace('&amp;', '&').replace('\\/', '/')
                        clean_thumb_url = thumb_match.group(1).replace('&amp;', '&').replace('\\/', '/') if thumb_match else ''
                        
                        return jsonify({
                            'success': True,
                            'type': 'single',
                            'title': 'Instagram Reel/Video',
                            'thumb': clean_thumb_url,
                            'picker': [{'label': 'Download Direct Video (HD MP4)', 'url': clean_vid_url}]
                        })
            except Exception:
                pass

            # Route B: Mobile GraphQL Extraction
            try:
                api_url = f"https://www.instagram.com/p/{shortcode}/?__a=1&__d=dis"
                res = requests.get(api_url, headers=IG_MOBILE_HEADERS, timeout=8)
                if res.status_code == 200:
                    data = res.json()
                    items = data.get('items', [])
                    if items and 'video_versions' in items[0]:
                        vid_url = items[0]['video_versions'][0]['url']
                        return jsonify({
                            'success': True,
                            'type': 'single',
                            'title': 'Instagram Video',
                            'thumb': items[0].get('image_versions2', {}).get('candidates', [{}])[0].get('url', ''),
                            'picker': [{'label': 'Download Direct Video (HD MP4)', 'url': vid_url}]
                        })
            except Exception:
                pass

    # 2. TikTok Dedicated Extractor
    if 'tiktok.com' in video_url:
        try:
            tt_res = requests.get(f"https://www.tikwm.com/api/?url={quote(video_url)}", headers=WEB_HEADERS, timeout=8).json()
            if tt_res.get('data'):
                return jsonify({
                    'success': True,
                    'type': 'single',
                    'title': tt_res['data'].get('title', 'TikTok Video'),
                    'thumb': tt_res['data'].get('cover', ''),
                    'picker': [{'label': 'Download No Watermark (HD)', 'url': tt_res['data']['play']}]
                })
        except Exception:
            pass

    return jsonify({'success': False, 'message': 'Could not extract video. Ensure post is public.'}), 400

def extract_ig_shortcode(url):
    match = re.search(r'/(?:p|reel|reels)/([A-Za-z0-9_-]+)', url)
    return match.group(1) if match else None

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
