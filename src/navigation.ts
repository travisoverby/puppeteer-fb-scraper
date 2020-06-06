import { promisify } from 'util';
import { appendFile } from 'fs';
const appendFilePromise = promisify(appendFile);

import { ViewPort, Driver } from "./types";
import { Browser, Page, launch } from "puppeteer";
import {
  LOGIN_FIELDS,
  USERNAME,
  PASSWORD,
  SUB_DOMAIN,
  getDomainURL,
  DATA_DIR,
} from "./constants";

export async function navigate(
  domain: string,
  dimensions: ViewPort = { height: 1920, width: 1080 }
): Promise<Driver> {
  const browser: Browser = await launch({ headless: true });
  const page: Page = await browser.newPage();
  await page.setViewport(dimensions);

  await page.goto(getDomainURL(domain));
  await page.type(LOGIN_FIELDS.usernameField, USERNAME);
  await page.type(LOGIN_FIELDS.passwordField, PASSWORD);
  await page.click(LOGIN_FIELDS.submitField);
  await page.goto(`${getDomainURL(domain)}${SUB_DOMAIN}/`);

  return {
    browser,
    page,
  };
}

export async function shutdown({ browser }: Partial<Driver>): Promise<void> {
  await browser?.close();
}

export async function scrapeInfiniteScrollItems(
  page: Page,
  extractPosts: any,
  itemTargetCount: number,
  scrollDelay = 1000
) {
  const start = Date.now();
  let counter: number = 0;
  let extractedPosts: any = [];

  let previousHeight;
  while (counter < itemTargetCount) {
    extractedPosts = await page.evaluate(extractPosts);
    counter += extractedPosts.length;

    extractedPosts.forEach((post: any) => {
      appendFilePromise(`${DATA_DIR}/posts.json`, JSON.stringify(post) + "\n");
    });

    previousHeight = await page.evaluate("document.body.scrollHeight");
    await page.evaluate("window.scrollTo(0, document.body.scrollHeight)");
    await page.waitForFunction(`document.body.scrollHeight > ${previousHeight}`);
    await page.waitFor(scrollDelay);
    console.log(`Processed ${counter} total posts in ${Math.floor( (Date.now() - start) / 1000 )} seconds....`);
  }
}
