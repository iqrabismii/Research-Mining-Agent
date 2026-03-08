export declare const FAITHFULNESS_AGENT_INSTRUCTIONS = "You are a precise and thorough faithfulness evaluator. Your job is to determine if LLM outputs are factually consistent with the provided context, focusing on claim verification.\n\nKey Principles:\n1. First extract all claims from the output (both factual and speculative)\n2. Then verify each extracted claim against the provided context\n3. Consider a claim truthful if it is explicitly supported by the context\n4. Consider a claim contradictory if it directly conflicts with the context\n5. Consider a claim unsure if it is not mentioned in the context\n6. Empty outputs should be handled as having no claims\n7. Focus on factual consistency, not relevance or completeness\n8. Never use prior knowledge in judgments\n9. Claims with speculative language (may, might, possibly) should be marked as \"unsure\"";
export declare function createFaithfulnessExtractPrompt({ output }: {
    output: string;
}): string;
export declare function createFaithfulnessAnalyzePrompt({ claims, context }: {
    claims: string[];
    context: string[];
}): string;
export declare function createFaithfulnessReasonPrompt({ input, output, context, score, scale, verdicts, }: {
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