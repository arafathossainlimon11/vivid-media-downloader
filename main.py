from flask import Flask, request, jsonify
from flask_cors import CORS
import yt_dlp

app = Flask(__name__)
CORS(app)

@app.route('/api/download', methods=['GET'])
def download():
    video_url = request.args.get('url')
    
    if not video_url:
        return jsonify({'success': False, 'message': 'URL parameter required'}), 400

    ydl_opts = {
        'format': 'bestvideo+bestaudio/best',
        'quiet': True,
        'no_warnings': True,
        'extract_flat': False
    }

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(video_url, download=False)
            
            title = info.get('title', 'Social Media Video')
            thumbnail = info.get('thumbnail', '')
            direct_url = info.get('url', '')

            if not direct_url and 'requested_formats' in info and len(info['requested_formats']) > 0:
                direct_url = info['requested_formats'][0].get('url', '')

            return jsonify({
                'success': True,
                'type': 'single',
                'title': title,
                'thumb': thumbnail,
                'picker': [
                    {'label': 'Download HD Video (Direct MP4)', 'url': direct_url}
                ]
            })

    except Exception as e:
        return jsonify({'success': False, 'message': 'Could not extract video. Ensure post is public.'}), 400

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
