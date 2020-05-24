
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
    postContent: string;
}

async function scrapeData(): Promise<void> {
    const { browser, page } = await navigate();

    const data = await buildUserData(page, extractElements);
    console.log(data);

    await browser.close();
    process.exit(0);
}

async function navigate(): Promise<FBPage> {
    const browser: Browser = await puppeteer.launch({ headless: true });
    const page: Page = await browser.newPage();

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

async function buildUserData(page: Page, extractElements: (element: Element) => PostData): Promise<PostData[]> {
    const userData: Promise<PostData>[] = [];
    let elementHandles: ElementHandle[] = await page.$x('//div[contains(@class, "userContentWrapper")]');

    for (let elementHandle of elementHandles) {
        const data = page.evaluate(extractElements, elementHandle);
        userData.push(data);
    }

    return await Promise.all(userData);
}

function extractElements(element: Element): PostData {
    const splitUserID = (hrefString: string): string => {
        let hrefSplit: string[] = hrefString.split('?')[0].split("facebook.com/");
        let userID: string = hrefSplit[1];
        userID = userID === 'profile.php' ? hrefString.split('&')[0].split("facebook.com/")[1] : userID;
        return userID;
    };

    const usernameSelector: any   = element.querySelector('h5 a');
    const postContentSelector: any = element.querySelector("[data-testid='post_message']");
    const postImageHrefSelector: any = element.querySelector('a div img.scaledImageFitWidth');
    const commentLinkSelector: any = element.querySelector('form a');

    const username = usernameSelector.textContent || "";
    const userID = splitUserID(usernameSelector.href);

    let postContent: string = postContentSelector ? postContentSelector.textContent : "";
    postContent = postImageHrefSelector ? `${postContent} ${postImageHrefSelector.src}` : postContent;
    
    return { 
        username, 
        userID, 
        profileURL: `https://www.facebook.com/${userID}`,
        postContent,
    };
}


scrapeData();