
import dotenv from 'dotenv';
dotenv.config();

import { LoginInputFields } from './types';

export const USERNAME = process.env.USERNAME || 'test@gmail.com';
export const PASSWORD = process.env.PASSWORD || 'test_password';

export const SUB_DOMAIN = process.env.SUBDOMAIN || 'idk';
export const DOMAIN = process.env.DOMAIN || 'facebook';

export const DATA_DIR = '../data/';

export const LOGIN_FIELDS = getLoginFields(DOMAIN);

export const getDomainURL = (domain: string): string => {
    if (domain === 'facebook') {
        return `https://www.facebook.com/`;
    }
    return "";
};

function getLoginFields(domain: string): LoginInputFields {
    let inputFields = {
        usernameField: '',
        passwordField: '',
        submitField: '',
    };

    if (domain === 'facebook') {
        inputFields = {
            usernameField: '[id=email]',
            passwordField: '[id=pass]',
            submitField: '[type=submit]',
        };
    }

    return inputFields;
}
