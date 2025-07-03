const config = require('./config');
const { getContentItems } = require('./content');
const { createClient, postTweet, uploadMediaFromUrl } = require('./twitter');



/**
 * Selects a random item from an array.
 * @param {Array<string>} items The array of items.
 * @returns {string|null} A random item or null.
 */
function selectRandomItem(allItems) {
    if (!allItems || allItems.length === 0) {
        return null;
    }
    const randomIndex = Math.floor(Math.random() * allItems.length);
    return allItems[randomIndex];
}

async function main() {
    console.log('Starting Twitter bot...');

    if (config.accounts.length === 0) {
        console.error('No accounts configured. Please check acc.txt. Exiting.');
        return;
    }

    const startupLogs = [];
    const processContent = async (name, source) => {
        const { items, warnings } = await getContentItems(source);
        if (warnings.length > 0) {
            startupLogs.push(...warnings);
        }
        startupLogs.push(`- Found ${items.length} ${name}.`);
        return items;
    };

    const allTweets = await processContent('tweets', config.sources.tweets);
    const allRetweetIds = await processContent('retweets', config.sources.retweets);
    const allMediaUrls = await processContent('media URLs', config.sources.media);
    const allHashtags = await processContent('hashtags', config.sources.hashtags);

    console.log(`Found ${config.accounts.length} account(s).`);
    console.log(startupLogs.join('\n'));

    for (const account of config.accounts) {
        const client = createClient(account);

        // --- Start of Log Block ---
        console.log(`\n==================================================`);
        console.log(`  Processing Account (API Key: ...${account.appKey.slice(-4)})`);
        console.log(`==================================================`);

        // Step 1: Content Selection
        console.log('\n[Step 1/3] Selecting Content...');
        let tweetText = selectRandomItem(allTweets);
        if (!tweetText) {
            console.log('  [Error] No available tweets to post. Skipping account.');
            console.log(`==================================================`);
            continue;
        }
        console.log(`  - Base tweet selected.`);

        // Step 2: Composition
        console.log('\n[Step 2/3] Composing Final Tweet...');
        // Add hashtags
        if (allHashtags.length > 0) {
            const hashtagsToUse = allHashtags.slice(0, 2).map(h => `#${h}`).join(' ');
            tweetText = `${tweetText} ${hashtagsToUse}`;
            console.log(`  - Hashtags added: ${hashtagsToUse}`);
        }

        // Append a retweet link
        const retweetId = selectRandomItem(allRetweetIds);
        if (retweetId) {
            const retweetUrl = `https://twitter.com/any/status/${retweetId}`;
            tweetText = `${tweetText}\n\n${retweetUrl}`;
            console.log(`  - Retweet link appended: ${retweetUrl}`);
        }
        console.log(`  - Final composed text: "${tweetText.replace(/\n/g, ' ')}"`);

        // Step 3: Posting
        console.log('\n[Step 3/3] Posting to Twitter...');
        let mediaId = null;
        const mediaUrl = selectRandomItem(allMediaUrls);

        if (mediaUrl) {
            console.log(`  - Media found. Uploading from: ${mediaUrl}`);
            const uploadResult = await uploadMediaFromUrl(client, mediaUrl);
            if (uploadResult.success) {
                mediaId = uploadResult.mediaId;
                console.log(`  - [Success] Media uploaded. ID: ${mediaId}`);
            } else {
                console.log(`  - [Error] Media upload failed: ${uploadResult.error}`);
            }
        } else {
            console.log('  - No media selected for this tweet.');
        }

        const postResult = await postTweet(client, tweetText, mediaId);
        if (postResult.success) {
            console.log(`  - [Success] Tweet posted! URL: ${postResult.url}`);
        } else {
            console.log(`  - [Error] Failed to post tweet: ${postResult.error}`);
        }

        // --- End of Log Block ---
        console.log(`==================================================`);
    }

    console.log('\n----------------------------------');
    console.log('Bot has finished its run.');
}

main().catch(error => {
    console.error('An unexpected error occurred:', error);
});
