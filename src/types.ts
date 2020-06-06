import { Browser, Page } from 'puppeteer';

export interface Driver {
    browser: Browser;
    page: Page;
}

export interface Post {
    id: string;
    username: string;
    userID: string;
    parentID?: string;
    timestamp: string;
    postBody: string;
    children?: Post[];
}

export interface ViewPort {
    height: number,
    width: number,
}

export interface LoginInputFields {
    usernameField: string;
    passwordField: string;
    submitField: string;
}

export type DOMElement = Element | null | undefined
export type List<DOMElement> = DOMElement[] | NodeListOf<Element>;
