import puppeteer, { Browser, Page, ElementHandle } from 'puppeteer';

const FB_EMAIL = process.env.FB_EMAIL || 'test@gmail.com';
const FB_PASSWORD = process.env.FB_PASSWORD || 'test_password';
const FB_GROUP = process.env.FB_GROUP || 'idk';

async function scrapeData(): Promise<void> {
    const browser: Browser = await puppeteer.launch({ headless: true});
    const page: Page = await browser.newPage();

    await page.goto('https://facebook.com');
    await page.type('[id=email]', FB_EMAIL);
    await page.type('[id=pass]', FB_PASSWORD);

    await page.waitFor(2500);
    await page.goto(`https://www.facebook.com/groups/${FB_GROUP}/`);
    await page.waitFor(6000);

    let elHandles: ElementHandle[] = await page.$x('//div[contains(@class, "userContentWrapper")]');

    let html: any = elHandles.map(element => page.evaluate(el => {
        const firstChildEl = el.firstElementChild;
        const username = firstChildEl.getElementsByTagName('h5')[0].textContent;
        const postContentSelector = firstChildEl.querySelectorAll("[data-testid='post_message']")[0];
        const postImageHrefSelector = firstChildEl.querySelector('a div img.scaledImageFitWidth');

        let postContent = "";

        if (postContentSelector) {
            postContent = postContentSelector.textContent;
        } else if (postImageHrefSelector) {
            postContent = postImageHrefSelector.src;
        }

        return { username, postContent };
    }, element));

    html = await Promise.all(html);

    console.log(html);
    await browser.close();
}

scrapeData();