const fs = require('fs');
const https = require('https');

let f = fs.readFileSync('seed_advanced_data.js', 'utf8');

const getImageUrl = (q) => {
    return new Promise(resolve => {
        https.get('https://www.bing.com/images/search?q=' + encodeURIComponent(q + " isolated white background"), { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' } }, res => {
            let d = ''; res.on('data', c => d += c);
            res.on('end', () => {
                const matches = [...d.matchAll(/murl&quot;:&quot;(https:\/\/[^&"]+\.(jpg|jpeg|png))&quot;/ig)];
                // Find a good match (prefer clear images)
                if (matches.length > 0) {
                    resolve(matches[0][1]);
                } else {
                    resolve('');
                }
            });
        });
    });
};

(async () => {
    // Extract the substring containing the products array
    const startIdx = f.indexOf('const products = [');
    const endIdx = f.indexOf('];', startIdx) + 2;
    let productsStr = f.substring(startIdx, endIdx);

    const names = [...productsStr.matchAll(/name: '([^']+)'/g)].map(m => m[1]);

    for (let name of names) {
        console.log("Fetching for:", name);
        const url = await getImageUrl(name);
        if (url) {
            console.log("Found:", url);

            // Replace the image url under this specific product
            // Find the index of the name
            const nameIdx = productsStr.indexOf(`name: '${name}'`);
            if (nameIdx !== -1) {
                const imgIdx = productsStr.indexOf(`image: '`, nameIdx);
                if (imgIdx !== -1) {
                    const imgEndIdx = productsStr.indexOf(`'`, imgIdx + 8);
                    const oldImg = productsStr.substring(imgIdx + 8, imgEndIdx);
                    productsStr = productsStr.substring(0, imgIdx + 8) + url + productsStr.substring(imgEndIdx);
                }
            }
        }
    }

    f = f.substring(0, startIdx) + productsStr + f.substring(endIdx);
    fs.writeFileSync('seed_advanced_data.js', f);
    console.log("Done updating images.");
})();
