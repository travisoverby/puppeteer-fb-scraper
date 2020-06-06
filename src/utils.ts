export const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const getTimestamp = (time: string | null | undefined): string => {
    if (!time) return new Date().toString();

    return new Date(parseInt(time) * 1000).toString();
};