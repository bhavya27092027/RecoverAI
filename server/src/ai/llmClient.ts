export interface LLMReasoningPromptInput {
  customerName: string;
  transactionAmount: number;
  paymentMethod: string;
  failureReason: string;
  recoveryProbability: number;
  confidence: string;
  recommendedAction: string;
  customerSuccessRate: number;
  customerTotalSpent: number;
  totalTransactions: number;
}

export const enhanceReasoningWithLLM = async (
  input: LLMReasoningPromptInput,
  fallbackReasoning: string
): Promise<string> => {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey || !apiKey.trim() || apiKey.includes('your_')) {
    // Return high-quality deterministic fallback immediately
    return fallbackReasoning;
  }

  try {
    const prompt = `You are the AI Revenue Recovery Intelligence Engine for RecoverAI.
Generate a concise, authoritative 2-3 sentence financial explanation for the merchant regarding this failed transaction:
- Customer: ${input.customerName} (Historical Success Rate: ${input.customerSuccessRate}%, Lifetime Spend: ₹${input.customerTotalSpent})
- Transaction: ₹${input.transactionAmount} via ${input.paymentMethod}
- Failure Reason: ${input.failureReason}
- Calculated Recovery Probability: ${input.recoveryProbability}% (${input.confidence} Confidence)
- Recommended Action: ${input.recommendedAction}

Explain WHY this payment failed, the customer reliability context, and WHY this specific action is recommended. Be professional and data-driven.`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.2,
        max_tokens: 150,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (res.ok) {
      const data: any = await res.json();
      const content = data.choices?.[0]?.message?.content?.trim();
      if (content) return content;
    }
  } catch (err) {
    // Graceful offline fallback
  }

  return fallbackReasoning;
};
