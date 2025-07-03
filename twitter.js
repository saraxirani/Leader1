const { TwitterApi } = require('twitter-api-v2');
const axios = require('axios');

/**
 * Creates a Twitter API client for a specific user.
 * @param {object} credentials The user's API credentials.
 * @returns {TwitterApi} The authenticated Twitter client.
 */
function createClient(credentials) {
    return new TwitterApi(credentials);
}

/**
 * Posts a tweet.
 * @param {TwitterApi} client The authenticated Twitter client.
 * @param {string} text The text of the tweet.
 * @param {string|null} mediaId The media ID to attach to the tweet, if any.
 * @returns {Promise<{success: boolean, url?: string, error?: string}>}
 */
async function postTweet(client, text, mediaId = null) {
    try {
        const tweetOptions = { text };
        if (mediaId) {
            tweetOptions.media = { media_ids: [mediaId] };
        }
        const postedTweet = await client.v2.tweet(tweetOptions);
        const { data: me } = await client.v2.me({ 'user.fields': ['username'] });
        const tweetUrl = `https://twitter.com/${me.username}/status/${postedTweet.data.id}`;
        return { success: true, url: tweetUrl };
    } catch (e) {
        let errorMessage = 'An unknown error occurred while posting the tweet.';
        if (e.code === 401) {
            errorMessage = 'Authentication Error (401): Your credentials in acc.txt are invalid or your Twitter App does not have Read and Write permissions.';
        } else if (e.data && e.data.detail) {
            errorMessage = e.data.detail;
        } else if (e.message) {
            errorMessage = e.message;
        }
        return { success: false, error: errorMessage };
    }
}

/**
 * Uploads media from a URL to Twitter.
 * @param {TwitterApi} client The authenticated Twitter client.
 * @param {string} mediaUrl The URL of the media to upload.
 * @returns {Promise<{success: boolean, mediaId?: string, error?: string}>} The media ID string, or null if upload fails.
 */
async function uploadMediaFromUrl(client, mediaUrl) {
    try {
        const response = await axios.get(mediaUrl, { responseType: 'arraybuffer' });
        const mediaBuffer = Buffer.from(response.data, 'binary');
        const mimeType = response.headers['content-type'] || 'image/jpeg';

        const mediaId = await client.v1.uploadMedia(mediaBuffer, { mimeType });
        return { success: true, mediaId: mediaId };
    } catch (e) {
        let errorMessage = 'An unknown error occurred while uploading media.';
        if (e.message) { // Axios and other network errors usually have a message
            errorMessage = e.message;
        }
        return { success: false, error: errorMessage };
    }
}

module.exports = { createClient, postTweet, uploadMediaFromUrl };
