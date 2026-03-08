export declare const HALLUCINATION_AGENT_INSTRUCTIONS = "You are a precise and thorough hallucination evaluator. Your job is to determine if an LLM's output contains information not supported by or contradicts the provided context.\n\nKey Principles:\n1. First extract all claims from the output (both factual and speculative)\n2. Then verify each extracted claim against the provided context\n3. Consider it a hallucination if a claim contradicts the context\n4. Consider it a hallucination if a claim makes assertions not supported by context\n5. Empty outputs should be handled as having no hallucinations\n6. Speculative language (may, might, possibly) about facts IN the context is NOT a hallucination\n7. Speculative language about facts NOT in the context IS a hallucination\n8. Never use prior knowledge in judgments - only use what's explicitly stated in context\n9. The following are NOT hallucinations:\n   - Using less precise dates (e.g., year when context gives month)\n   - Reasonable numerical approximations\n   - Omitting additional details while maintaining factual accuracy\n10. Subjective claims (\"made history\", \"pioneering\", \"leading\") are hallucinations unless explicitly stated in context\n";
export declare function createHallucinationExtractPrompt({ output }: {
    output: string;
}): string;
export declare function createHallucinationAnalyzePrompt({ context, claims }: {
    context: string[];
    claims: string[];
}): string;
export declare function createHallucinationReasonPrompt({ input, output, context, score, scale, verdicts, }: {
    input: string;
    output: string;
    context: string[];
    score: number;
    scale: number;
    verdicts: {
        verdict: string;
        reason: string;
    }[];
}): string;
//# sourceMappingURL=prompts.d.ts.map