import dotenv from 'dotenv';
dotenv.config();

import { appendFile } from 'fs';

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
    profileURL: string;
    pageURL: string;
    timestamp: string;
    postContent: string;
    children?: PostData[];
}

function extractItems(count: number) {
    const splitUserID = (hrefString: string): string => {
        let hrefSplit: string[] = hrefString.split('?')[0].split("facebook.com/");
        let userID: string = hrefSplit[1];
        userID = userID === 'profile.php' ? hrefString.split('&')[0].split("facebook.com/")[1] : userID;
        return userID;
    };

    const extractedItems = document.querySelectorAll('div.userContentWrapper:not(.scrubbedByPuppeteer)');
    const items = [];
    for (let element of extractedItems) {
        element.classList.add('scrubbedByPuppeteer');
        const usernameSelector: any   = element.querySelector('h5 a');
        const postContentSelector: any = element.querySelector("[data-testid='post_message']");
        const postImageHrefSelector: any = element.querySelector('a div img.scaledImageFitWidth');
        const timestampSelector: any = element.querySelector('span.timestampContent')?.parentElement;

        const username = usernameSelector?.textContent || "";
        const userID = usernameSelector?.href ? splitUserID(usernameSelector.href) || '';

        let postContent: string = postContentSelector ? postContentSelector.textContent : "";
        postContent = postImageHrefSelector ? `${postContent} ${postImageHrefSelector.src}` : postContent;

        let timestamp = new Date(parseInt(timestampSelector.getAttribute('data-utime')) * 1000).toString();
        const item = { 
            username, 
            userID, 
            profileURL: `https://www.facebook.com/${userID}`,
            pageURL: window.location.href,
            timestamp,
            postContent,
        };

        count += 1;
        items.push(item);

    }

    return {
        count,
        items,
    };
}

async function scrapeInfiniteScrollItems(
    page: Page,
    extractItems: any,
    itemTargetCount: number,
    scrollDelay = 1000,
) {
    let count: any = 0;
    let items: any = [];
    let res: any = {};
    try {
        let previousHeight;
        while (count < itemTargetCount) {
            res = await page.evaluate(extractItems, count);
            count = res.count;
            items = res.items;
            previousHeight = await page.evaluate('document.body.scrollHeight');
            await page.evaluate('window.scrollTo(0, document.body.scrollHeight)');
            await page.waitForFunction(`document.body.scrollHeight > ${previousHeight}`);
            await page.waitFor(scrollDelay);
            items.forEach((item: any) => {
                let json = JSON.stringify(item);
                appendFile('./users.json', json + '\n', () => {});
            });
        }
    } catch (e) {
        console.error(e);
    }

    return count;
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
    const count = await scrapeInfiniteScrollItems(page, extractItems, 3000);
    console.log(count);
    await browser.close();
})();