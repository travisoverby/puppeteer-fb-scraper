import { promisify } from 'util';
import dotenv from 'dotenv';
dotenv.config();

import { appendFile } from 'fs';
const appendFilePromise = promisify(appendFile);

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

async function extractPosts(): Promise<PostData[]> {
    const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

    const splitUserID = (hrefString: string): string => {
        if (hrefString.length === 0) return '';
        let hrefSplit: string[] = hrefString.split('?')[0].split("facebook.com/");
        let userID: string = hrefSplit[1];
        userID = userID === 'profile.php' ? hrefString.split('&')[0].split("facebook.com/")[1] : userID;
        return userID;
    };

    const extractComments = async (element: any) => {
        const comments: PostData[] = []
        const commentContainer = element.lastElementChild;

        let loadCommentSelector = commentContainer?.firstElementChild?.lastElementChild?.lastElementChild?.querySelector('div a');
        
        if (loadCommentSelector?.textContent.length > 0) {
            loadCommentSelector?.click();
            await sleep(1000);
        }

        if (loadCommentSelector?.textContent.length > 0) {
            loadCommentSelector?.click();
            await sleep(1000);
        }

        if (loadCommentSelector?.textContent.length > 0) {
            loadCommentSelector?.click();
            await sleep(1000);
        }
        // const loadLastCommentSelector = commentContainer?.lastElementChild?.querySelector('ul')?.nextSibling?.querySelector('a');
        // if (loadLastCommentSelector?.textContent.length > 15) {
        //     loadLastCommentSelector?.click();
        // }

        const extractedComments = commentContainer?.querySelectorAll('div[aria-label="Comment"]:not(.scrubbedByPuppeteer)');

        for (let extractedComment of extractedComments) {
            extractedComment.classList.add('scrubbedByPuppeteer');
            const usernameSelector: any = extractedComment.lastElementChild?.querySelector('div a');
            const username = usernameSelector?.textContent;
            const userID = splitUserID(usernameSelector?.href);
            const postBody = usernameSelector?.nextElementSibling?.textContent;

            const timestampSelector = extractedComment.querySelector('abbr.livetimestamp');
            const timestamp = new Date(parseInt(timestampSelector?.getAttribute('data-utime')) * 1000).toString();

            const comment: PostData = {
                username,
                userID,
                timestamp,
                postBody,
                children: [],
            };

            comments.push(comment);
        }

        return comments;
    };

    const posts: PostData[] = [];
    const extractedItems = document.querySelectorAll('div.userContentWrapper:not(.scrubbedByPuppeteer)');

    for (let element of extractedItems) {
        element.classList.add('scrubbedByPuppeteer');
        const usernameSelector: any = element.querySelector('h5 a');
        const postBodySelector: any = element.querySelector("[data-testid='post_message']");
        const postImageHrefSelector: any = element.querySelector('a div img.scaledImageFitWidth');
        const timestampSelector: any = element.querySelector('span.timestampContent')?.parentElement;

        const username = usernameSelector?.textContent ? usernameSelector?.textContent : '';
        const userID = usernameSelector?.href ? splitUserID(usernameSelector.href) : '';

        let postBody: string = postBodySelector ? postBodySelector.textContent : '';
        postBody = postImageHrefSelector ? `${postBody} ${postImageHrefSelector.src}` : postBody;

        let timestamp = new Date(parseInt(timestampSelector.getAttribute('data-utime')) * 1000).toString();
        const post: PostData = { 
            username, 
            userID, 
            parentID: window.location.href,
            timestamp,
            postBody,
            children: [],
        };

        const comments = await extractComments(element);
        if (comments.length > 0) {
            post.children?.push(...comments);
        }

        posts.push(post);
    }

    return posts;
}

async function scrapeInfiniteScrollItems(
    page: Page,
    extractPosts: any,
    itemTargetCount: number,
    scrollDelay = 1000,
) {
    const start = Date.now();
    let counter: number = 0;
    let extractedPosts: any = [];
    try {
        let previousHeight;
        while (counter < itemTargetCount) {
            extractedPosts = await page.evaluate(extractPosts);
            counter += extractedPosts.length;

            if (extractedPosts.children?.length > 0) {
                counter += extractedPosts.children.length;
            }

            extractedPosts.forEach((post: any) => {
                appendFilePromise('./posts.json', JSON.stringify(post) + '\n');
            });

            previousHeight = await page.evaluate('document.body.scrollHeight');
            await page.evaluate('window.scrollTo(0, document.body.scrollHeight)');
            await page.waitForFunction(`document.body.scrollHeight > ${previousHeight}`);
            await page.waitFor(scrollDelay);
            console.log(`Processed ${counter} total posts in ${Math.floor(( Date.now() - start) / 1000 )} seconds....`);
        }
        
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
    await scrapeInfiniteScrollItems(page, extractPosts, 250, 2000);
    await browser.close();
    process.exit(1);
})();