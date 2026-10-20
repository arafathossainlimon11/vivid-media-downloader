from flask import Flask, request, jsonify
from flask_cors import CORS
import yt_dlp
import requests
import re

app = Flask(__name__)
CORS(app)

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
    'Accept-Language': 'en-US,en;q=0.9',
}

@app.route('/api/download', methods=['GET'])
def download():
    video_url = request.args.get('url')
    
    if not video_url:
        return jsonify({'success': False, 'message': 'URL parameter required'}), 400

    # 1. Instagram Dedicated Bypass Route (Embed Scraper)
    if 'instagram.com' in video_url:
        try:
            clean_url = video_url.split('?')[0].rstrip('/') + '/embed/captioned/'
            res = requests.get(clean_url, headers=HEADERS, timeout=10)
            if res.status_code == 200:
                mp4_match = re.search(r'<video[^>]*src="([^"]+)"', res.text) or re.search(r'video_url\\":\\"([^"]+)\\"', res.text)
                img_match = re.search(r'class="EmbeddedMediaImage"[^>]*src="([^"]+)"', res.text)
                
                final_url = None
                if mp4_match:
                    final_url = mp4_match.group(1).replace('&amp;', '&').replace('\\/', '/')
                elif img_match:
                    final_url = img_match.group(1).replace('&amp;', '&').replace('\\/', '/')

                if final_url:
                    return jsonify({
                        'success': True,
                        'type': 'single',
                        'title': 'Instagram Media',
                        'thumb': '',
                        'picker': [{'label': 'Download Direct Media (HD)', 'url': final_url}]
                    })
        except Exception:
            pass

    # 2. TikTok Dedicated Bypass Route
    if 'tiktok.com' in video_url:
        try:
            tt_res = requests.get(f"https://www.tikwm.com/api/?url={encode_url(video_url)}", headers=HEADERS, timeout=10).json()
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

    # 3. Universal yt-dlp Extractor with Headers
    ydl_opts = {
        'format': 'best',
        'quiet': True,
        'no_warnings': True,
        'http_headers': HEADERS,
    }

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(video_url, download=False)
            title = info.get('title', 'Social Media Video')
            thumbnail = info.get('thumbnail', '')
            direct_url = info.get('url', '')

            if not direct_url and 'entries' in info and len(info['entries']) > 0:
                direct_url = info['entries'][0].get('url', '')

            if direct_url:
                return jsonify({
                    'success': True,
                    'type': 'single',
                    'title': title,
                    'thumb': thumbnail,
                    'picker': [{'label': 'Download HD Video', 'url': direct_url}]
                })

    except Exception:
        pass

    return jsonify({'success': False, 'message': 'Could not extract video. Ensure post is public.'}), 400

def encode_url(url):
    from urllib.parse import quote
    return quote(url, safe='')

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
