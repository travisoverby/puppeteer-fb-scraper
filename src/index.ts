import { scrapeInfiniteScrollItems, navigate, shutdown } from './navigation';
import { DOMAIN } from './constants';
import { extractPosts } from './helpers';

async function run() {
  try {
    const { browser, page } = await navigate(DOMAIN);
	  await scrapeInfiniteScrollItems(page, extractPosts, 250, 2000);
	  await shutdown({ browser });
  } catch (error) {
    console.error(error);
  } finally {
    process.exit(1);
  }
}

run();
