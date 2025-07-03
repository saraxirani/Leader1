const fs = require('fs');
const axios = require('axios');

/**
 * Fetches content from a URL, with a fallback to a local file.
 * @param {string} url The URL to fetch content from.
 * @param {string} fallbackPath The path to the local fallback file.
 * @returns {Promise<string>} The content as a string.
 */
async function fetchContent(url, fallbackPath) {
    const warnings = [];
    try {
        const response = await axios.get(url);
        if (response.data && response.data.trim() !== '') {
            return { content: response.data, warnings };
        }
    } catch (error) {
        warnings.push(`  [!] Could not fetch from URL ${url}. Trying local fallback.`);
    }

    if (fs.existsSync(fallbackPath)) {
        const fallbackContent = fs.readFileSync(fallbackPath, 'utf-8');
        if (fallbackContent && fallbackContent.trim() !== '') {
            return { content: fallbackContent, warnings };
        }
    }

    warnings.push(`  [!] Failed to load content from both URL and fallback: ${fallbackPath.split('\\').join('/')}`);
    return { content: '', warnings };
}

/**
 * Gets a list of items from a content source (URL or file).
 * @param {object} source The source object containing url and fallback path.
 * @returns {Promise<Array<string>>} A promise that resolves to an array of content lines.
 */
async function getContentItems(source) {
    const { content, warnings } = await fetchContent(source.url, source.fallback);
    const items = content ? content.split('\n').map(item => item.trim()).filter(Boolean) : [];
    return { items, warnings };
}

module.exports = { getContentItems };
