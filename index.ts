import dotenv from 'dotenv';
dotenv.config();

import { appendFileSync } from 'fs';

import puppeteer, { Browser, Page, ElementHandle } from 'puppeteer';
const FB_EMAIL = process.env.FB_EMAIL || 'test@gmail.com';
const FB_PASSWORD = process.env.FB_PASSWORD || 'test_password';
const FB_ID = process.env.FB_ID || 'idk';

interface FBPage {
    browser: Browser;
    page: Page;
}

interface PostData {
    username: string;
    userID: string;
    parentID?: string;
    timestamp: string;
    postBody: string;
    children?: PostData[];
}

interface MetaData {
    href: string;
    timestamp: number;
}

async function extractPosts(): Promise<MetaData[]> {
    const metadata: MetaData[] = [];
    // const extractedItems : any = document.querySelectorAll('div.userContentWrapper a abbr');
    const extractedItems: any = document.querySelectorAll('div.userContentWrapper:not(.scrubbedByPuppeteer)');

    for (let element of extractedItems) {
        element.classList.add('scrubbedByPuppeteer');
        const el = element.querySelector('a abbr');
        const anchor = el.parentElement;
        let timestamp = parseInt(el.getAttribute('data-utime'));
        const href = anchor.href;
        if ( href.includes('groups/51064045878') && !href.includes('comment_id') && !href.includes('entry_source') ) {
            metadata.push({ href, timestamp });
        }
    }

    return metadata;
}

async function scrapeInfiniteScrollItems(
    page: Page,
    extractPosts: any,
    itemTargetCount: number,
    scrollDelay = 1000,
) {
    const set: { [key: string]: number } = {};
    const start = Date.now();
    let counter: number = 0;
    let extractedPosts: any = [];
    try {
        let previousHeight;
        while (counter < itemTargetCount) {
            extractedPosts = await page.evaluate(extractPosts);
            counter += extractedPosts.length;

            extractedPosts.forEach((metadata: MetaData) => {
                if (!set[metadata.href]) {
                    set[metadata.href] = metadata.timestamp;
                }
            });
            
            console.dir(Object.keys(set).length);

            previousHeight = await page.evaluate('document.body.scrollHeight');
            await page.evaluate('window.scrollTo(0, document.body.scrollHeight)');
            await page.waitForFunction(`document.body.scrollHeight > ${previousHeight}`);
            await page.waitFor(scrollDelay);
            console.log(`Processed ${counter} total posts in ${Math.floor(( Date.now() - start) / 1000 )} seconds....`);
        }

        extractedPosts = [];

        for (let key in set) {
            extractedPosts.push({ href: key, timestamp: set[key] });
        }

        extractedPosts.sort((a: any, b: any) => b.timestamp - a.timestamp);
        // extractedPosts.forEach((post: any) => {
        appendFileSync('./posts.json', JSON.stringify(extractedPosts) + '\n');
        // });
        
    } catch (e) {
        console.error(e);
    }

}


async function navigate(): Promise<FBPage> {
    const browser: Browser = await puppeteer.launch({ headless: true });
    const page: Page = await browser.newPage();
    await page.setViewport({ width: 1024, height: 480 });

    await page.goto('https://facebook.com');
    await page.type('[id=email]', FB_EMAIL);
    await page.type('[id=pass]', FB_PASSWORD);
    await page.click('[type=submit]');

    await page.waitFor(3000);
    await page.goto(`https://www.facebook.com/${FB_ID}/`);
    await page.waitFor(3000);

    return {
        browser, 
        page,
    };
}

(async () => {
    const { browser, page } = await navigate();
    await scrapeInfiniteScrollItems(page, extractPosts, 5000);
    await browser.close();
    process.exit(1);
})();