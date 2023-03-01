export declare const allowedTypes: string[];
export declare function checkConventionalMessage(message: string, { debug }: Pick<Console, 'debug'>): {
    type: string | undefined;
    breaking: boolean;
    subject: string | undefined;
    errors: string[];
};
