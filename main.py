from flask import Flask, request, jsonify
from flask_cors import CORS
import requests
import re
import os
from urllib.parse import quote

app = Flask(__name__)
CORS(app)

# Option: Set INSTAGRAM_SESSION_ID in Render Environment Variables if needed
IG_SESSION_ID = os.environ.get("IG_SESSION_ID", "")

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Accept-Language': 'en-US,en;q=0.9',
}

@app.route('/api/download', methods=['GET'])
def download():
    video_url = request.args.get('url')
    
    if not video_url:
        return jsonify({'success': False, 'message': 'URL parameter required'}), 400

    # 1. TikTok Extractor (Always Working via TikWM)
    if 'tiktok.com' in video_url:
        try:
            res = requests.get(f"https://www.tikwm.com/api/?url={quote(video_url)}", headers=HEADERS, timeout=10).json()
            if res.get('data'):
                return jsonify({
                    'success': True,
                    'type': 'single',
                    'title': res['data'].get('title', 'TikTok Video'),
                    'thumb': res['data'].get('cover', ''),
                    'picker': [
                        {'label': 'Download No Watermark (HD)', 'url': res['data']['play']},
                        {'label': 'Download Watermark Video', 'url': res['data'].get('wmplay', res['data']['play'])},
                        {'label': 'Download Audio (MP3)', 'url': res['data'].get('music', '')}
                    ]
                })
        except Exception:
            pass

    # 2. Instagram Multi-Route Extractor
    if 'instagram.com' in video_url:
        shortcode = extract_ig_shortcode(video_url)
        if shortcode:
            # Route A: Public API Proxy
            try:
                proxy_api = f"https://api.v1.dumpoir.com/instagram/post/{shortcode}"
                p_res = requests.get(proxy_api, headers=HEADERS, timeout=8)
                if p_res.status_code == 200:
                    p_data = p_res.json()
                    vid = p_data.get('video_url') or p_data.get('url')
                    if vid:
                        return jsonify({
                            'success': True,
                            'type': 'single',
                            'title': 'Instagram Reel/Video',
                            'thumb': p_data.get('display_url', ''),
                            'picker': [{'label': 'Download Direct MP4 (HD)', 'url': vid}]
                        })
            except Exception:
                pass

            # Route B: Authenticated / Cookie GraphQL Request
            try:
                ig_headers = HEADERS.copy()
                ig_headers['X-IG-App-ID'] = '936619743392459'
                if IG_SESSION_ID:
                    ig_headers['Cookie'] = f'sessionid={IG_SESSION_ID}'

                gql_url = f"https://www.instagram.com/graphql/query/?query_hash=b308d035b13473232ee0628450d90d71&variables=%7B%22shortcode%22%3A%22{shortcode}%22%7D"
                g_res = requests.get(gql_url, headers=ig_headers, timeout=8)
                if g_res.status_code == 200:
                    media = g_res.json().get('data', {}).get('shortcode_media', {})
                    vid_url = media.get('video_url')
                    if vid_url:
                        return jsonify({
                            'success': True,
                            'type': 'single',
                            'title': 'Instagram Reel',
                            'thumb': media.get('display_url', ''),
                            'picker': [{'label': 'Download Direct MP4 (HD)', 'url': vid_url}]
                        })
            except Exception:
                pass

    # 3. Universal Fallback via Fast Extraction
    try:
        fb_url = f"https://co.wuk.sh/api/json"
        c_res = requests.post(fb_url, json={"url": video_url}, headers={"Accept": "application/json", "Content-Type": "application/json"}, timeout=8)
        if c_res.status_code == 200:
            c_data = c_res.json()
            if c_data.get('url'):
                return jsonify({
                    'success': True,
                    'type': 'single',
                    'title': 'Social Media Video',
                    'thumb': '',
                    'picker': [{'label': 'Download Media (HD)', 'url': c_data['url']}]
                })
    except Exception:
        pass

    return jsonify({'success': False, 'message': 'Could not extract video. Ensure post is public.'}), 400

def extract_ig_shortcode(url):
    match = re.search(r'/(?:p|reel|reels)/([A-Za-z0-9_-]+)', url)
    return match.group(1) if match else None

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
