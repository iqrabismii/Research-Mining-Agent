export declare const createExtractPrompt: (output: string) => string;
export declare const createScorePrompt: (input: string, statements: string[]) => string;
export declare const createReasonPrompt: ({ input, output, score, results, scale, }: {
    input: string;
    output: string;
    score: number;
    results: {
        result: string;
        reason: string;
    }[];
    scale: number;
}) => string;
//# sourceMappingURL=prompts.d.ts.map