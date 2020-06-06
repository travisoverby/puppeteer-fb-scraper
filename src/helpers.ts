import { DOMElement, Post, List } from './types';
import { sleep, getTimestamp } from './utils';
import { SUB_DOMAIN } from './constants';

export async function extractPosts(): Promise<Post[]> {
	const posts: Post[] = [];
	const extractedItems: NodeListOf<Element> = document.querySelectorAll('div.userContentWrapper:not(.scrubbedByPuppeteer)');

  for (let element of extractedItems) {
    element.classList.add('scrubbedByPuppeteer');

    const post: Post = getPost(element);
    const comments: Post[] = await extractComments(element, post.id);

    if (comments.length > 0) {
      post.children = [...comments];
    }

    posts.push(post);
  }

    return posts;
  }

async function extractComments(element: DOMElement, parentID: string): Promise<Post[]> {
    const comments: Post[] = []
    const commentContainer = element?.lastElementChild;
    
    await handleLoadCommentSelector(commentContainer);
    await handleLoadCommentSelector(commentContainer, false);

    const extractedComments: List<DOMElement> | undefined = commentContainer?.querySelectorAll('div[aria-label="Comment"]:not(.scrubbedByPuppeteer)');

    if (extractedComments) {
      for (let extractedComment of extractedComments) {
        extractedComment?.classList.add('scrubbedByPuppeteer');
        const usernameSelector: any = extractedComment.lastElementChild?.querySelector('div a');
        const username = usernameSelector?.textContent;
        const userID = splitUserID(usernameSelector?.href);
        const postBody = usernameSelector?.nextElementSibling?.textContent;

        const timestampSelector: DOMElement = extractedComment.querySelector('abbr.livetimestamp');
        const timestamp = new Date(parseInt(timestampSelector?.getAttribute('data-utime') || '') * 1000).toString();

        const comment: Post = {
            id: getPostID(userID, timestamp), 
            username,
            userID,
            parentID,
            timestamp,
            postBody,
            children: [],
        };

        comments.push(comment);
      }
    }

    return comments;
};

async function handleLoadCommentSelector(selector: any, firstCommentButton: boolean = true, pause: number = 3000) {
    let loadCommentSelector;

    if (!firstCommentButton) {
        loadCommentSelector = selector?.firstElementChild?.lastElementChild?.lastElementChild?.querySelector('div a');
    } else {
        loadCommentSelector = selector?.lastElementChild?.querySelector('ul')?.nextSibling?.querySelector('a');    
    }

    let textContent = loadCommentSelector?.textContent;

    if (textContent?.length !== "" && textContent.toLowerCase().includes("comment")) {
        await sleep(pause);
        loadCommentSelector?.click();
        handleLoadCommentSelector(selector, firstCommentButton, pause);
    }

    return;
};

function splitUserID(hrefString: string): string {
    if (hrefString.length === 0) return '';
    let hrefSplit: string[] = hrefString.split('?')[0].split("facebook.com/");
    let userID: string = hrefSplit[1];
    userID = userID === 'profile.php' ? hrefString.split('&')[0].split("facebook.com/")[1] : userID;
    return userID;
};

function getPost(element: DOMElement): Post {
    const usernameSelector: DOMElement = element?.querySelector('h5 a');
		const postBodySelector: DOMElement = element?.querySelector("[data-testid='post_message']");
		const postImageHrefSelector: DOMElement = element?.querySelector('a div img.scaledImageFitWidth');
		const timestampSelector: DOMElement = element?.querySelector('abbr.timestamp');

		const username = usernameSelector?.textContent || '';
		const userID = splitUserID(usernameSelector?.getAttribute('href') || '');

		let postBody: string = postBodySelector?.textContent || '';
		postBody = postImageHrefSelector ? `${postBody} ${postImageHrefSelector.getAttribute('src')}` : postBody;

    let timestamp = getTimestamp(timestampSelector?.getAttribute('data-utime'));
    
    return { 
      id: getPostID(userID, timestamp),
			username, 
			userID, 
			parentID: window.location.href,
			timestamp,
			postBody,
		};
}

function getPostID(userID: string, timestamp: string) {
  return `${SUB_DOMAIN}_${userID}_${new Date(timestamp).toISOString()}`;
}