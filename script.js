const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

// Render এর Environment Variables থেকে ইউজারনেম ও পাসওয়ার্ড নেওয়া
const IG_USERNAME = process.env.INSTAGRAM_USERNAME || 'mariyakhan01721';
const IG_PASSWORD = process.env.INSTAGRAM_PASSWORD || 'mariya4545';

let sessionCookie = '';

// অটোমেটিক ইনস্টাগ্রাম ব্যাকগ্রাউন্ড লগইন ফাংশন
async function loginInstagram() {
    try {
        const loginUrl = 'https://www.instagram.com/api/v1/web/accounts/login/ajax/';
        const timestamp = Math.floor(Date.now() / 1000);
        
        const response = await axios({
            method: 'post',
            url: loginUrl,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'X-Requested-With': 'XMLHttpRequest',
                'Referer': 'https://www.instagram.com/accounts/login/',
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            data: new URLSearchParams({
                enc_password: `#PWD_INSTAGRAM_BROWSER:0:${timestamp}:${IG_PASSWORD}`,
                username: IG_USERNAME,
                queryParams: '{}',
                optIntoOneTap: 'false'
            }).toString()
        });

        const cookies = response.headers['set-cookie'];
        if (cookies) {
            sessionCookie = cookies.join('; ');
            console.log('Instagram Auto-Login Successful!');
            return sessionCookie;
        }
    } catch (error) {
        console.error('Auto-login attempt failed:', error.message);
    }
    return '';
}

// ডাউনলোড এপিআই এন্ডপয়েন্ট
app.get('/api/download', async (req, res) => {
    const videoUrl = req.query.url;
    if (!videoUrl) {
        return res.status(400).json({ error: 'Please provide a valid URL' });
    }

    try {
        const match = videoUrl.match(/(?:reel|p|tv)\/([A-Za-z0-9_-]+)/);
        if (!match) {
            return res.status(400).json({ error: 'Invalid Instagram URL' });
        }
        const shortcode = match[1];

        if (!sessionCookie) {
            await loginInstagram();
        }

        const embedUrl = `https://www.instagram.com/p/${shortcode}/?__a=1&__d=dis`;
        const headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': '*/*'
        };
        if (sessionCookie) {
            headers['Cookie'] = sessionCookie;
        }

        const response = await axios.get(embedUrl, { headers });
        const item = response.data?.items?.[0];

        if (item) {
            const videoData = item.video_versions ? item.video_versions[0].url : null;
            const photoData = item.image_versions2 ? item.image_versions2.candidates[0].url : null;

            return res.json({
                status: 'success',
                type: videoData ? 'video' : 'image',
                downloadUrl: videoData || photoData,
                title: item.caption?.text || 'Instagram Media'
            });
        }

        // বিকল্প মেথড (GraphQL)
        const graphqlUrl = `https://www.instagram.com/graphql/query/?query_hash=b30121327ec24ef799f9367dba337211&variables=${encodeURIComponent(JSON.stringify({ shortcode }))}`;
        const gqlResponse = await axios.get(graphqlUrl, { headers });
        const media = gqlResponse.data?.data?.shortcode_media;

        if (media) {
            return res.json({
                status: 'success',
                type: media.is_video ? 'video' : 'image',
                downloadUrl: media.video_url || media.display_url,
                title: media.edge_media_to_caption?.edges[0]?.node?.text || 'Instagram Media'
            });
        }

        throw new Error('Media details not found');

    } catch (err) {
        console.error('Download processing error:', err.message);
        res.status(500).json({ error: 'Failed to fetch video. Please check the link or try again.' });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
