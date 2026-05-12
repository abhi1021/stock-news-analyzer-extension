// ─────────────────────────────────────────────
// GEMINI REST API — Function Calling Orchestrator
// ─────────────────────────────────────────────

const GEMINI_MODEL = "gemini-2.5-flash";
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

async function callGemini(apiKey, contents, tools, retryCount = 0) {
  const MAX_RETRIES = 3;
  const body = {
    contents: contents,
    tools: [{ function_declarations: tools }],
    tool_config: {
      function_calling_config: { mode: "AUTO" }
    },
    generation_config: {
      temperature: 0.2
    }
  };

  const resp = await fetch(`${GEMINI_ENDPOINT}?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });

  if (!resp.ok) {
    const errText = await resp.text();

    // Handle 429 (rate limit) errors with retry logic
    if (resp.status === 429 && retryCount < MAX_RETRIES) {
      let retryDelay = 5000; // Default 5 seconds

      try {
        const errJson = JSON.parse(errText);
        // Extract retry delay from error response
        if (errJson.error?.details) {
          const retryInfo = errJson.error.details.find(d => d["@type"]?.includes("RetryInfo"));
          if (retryInfo?.retryDelay) {
            const match = retryInfo.retryDelay.match(/(\d+)/);
            if (match) {
              retryDelay = parseInt(match[1]) * 1000; // Convert seconds to milliseconds
            }
          }
        }
      } catch (e) {
        // If parsing fails, use exponential backoff
        retryDelay = Math.min(60000, 1000 * Math.pow(2, retryCount)); // Max 60 seconds
      }

      throw {
        status: 429,
        retryAfter: retryDelay,
        message: `Rate limit exceeded. Will retry after ${Math.ceil(retryDelay / 1000)} seconds...`,
        originalError: errText
      };
    }

    // For other errors or max retries exceeded
    throw new Error(`Gemini API error ${resp.status}: ${errText}`);
  }

  return await resp.json();
}

// ─────────────────────────────────────────────
// AGENT LOOP
// ─────────────────────────────────────────────
async function runAgentLoop(apiKey, userQuery, onTrace) {
  const contents = [
    {
      role: "user",
      parts: [{
        text: `You are a financial analysis assistant. The user wants to analyze stock performance relative to news events.
Use the available tools in sequence:
1. First call search_stock_news to get relevant news
2. Then call get_stock_price_history to get price data
3. Then call analyze_news_price_impact to cross-reference them
4. Finally provide a clear written summary of your findings.

User query: ${userQuery}

Today's date: ${new Date().toISOString().split("T")[0]}`
      }]
    }
  ];

  onTrace({ type: "user", text: userQuery });

  let iteration = 0;
  const MAX_ITERATIONS = 6;

  while (iteration < MAX_ITERATIONS) {
    iteration++;

    // Add a small delay between iterations to avoid rapid API calls
    if (iteration > 1) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    onTrace({ type: "llm_thinking", text: `Gemini is deciding next step... (turn ${iteration})` });

    let response;
    let retryCount = 0;
    const MAX_RETRIES = 3;

    while (retryCount <= MAX_RETRIES) {
      try {
        response = await callGemini(apiKey, contents, TOOL_DECLARATIONS, retryCount);
        break; // Success, exit retry loop
      } catch (e) {
        // Handle 429 rate limit errors with retry
        if (e.status === 429 && retryCount < MAX_RETRIES) {
          retryCount++;
          onTrace({
            type: "error",
            text: `⏳ ${e.message} (Attempt ${retryCount}/${MAX_RETRIES})`
          });
          await new Promise(resolve => setTimeout(resolve, e.retryAfter));
          onTrace({ type: "llm_thinking", text: `Retrying request... (turn ${iteration})` });
        } else {
          // Non-retryable error or max retries exceeded
          const errorMsg = e.message || String(e);
          if (e.status === 429) {
            onTrace({
              type: "error",
              text: `❌ Quota exceeded. Your Gemini API free tier limit has been reached.\n\nPlease either:\n1. Wait ~60 seconds and try again\n2. Check your API quota at https://ai.dev/rate-limit\n3. Upgrade your plan at https://ai.google.dev/gemini-api/docs/rate-limits`
            });
          } else {
            onTrace({ type: "error", text: errorMsg });
          }
          return;
        }
      }
    }

    const candidate = response.candidates?.[0];
    if (!candidate) {
      onTrace({ type: "error", text: "No candidate returned from Gemini." });
      return;
    }

    const modelContent = candidate.content;
    contents.push(modelContent);

    // Check for function calls
    const functionCalls = modelContent.parts?.filter(p => p.functionCall);

    if (functionCalls && functionCalls.length > 0) {
      // Process all function calls in this turn
      const functionResponseParts = [];

      for (const part of functionCalls) {
        const fc = part.functionCall;
        onTrace({
          type: "tool_call",
          name: fc.name,
          args: fc.args
        });

        let result;
        try {
          result = await executeTool(fc.name, fc.args);
        } catch (e) {
          result = { error: e.message };
        }

        onTrace({
          type: "tool_result",
          name: fc.name,
          result: result
        });

        functionResponseParts.push({
          functionResponse: {
            name: fc.name,
            response: result
          }
        });
      }

      contents.push({
        role: "user",
        parts: functionResponseParts
      });

    } else {
      // No function calls — extract final text
      const textPart = modelContent.parts?.find(p => p.text);
      const finalText = textPart?.text || "No final response text found.";
      onTrace({ type: "final", text: finalText });
      return;
    }
  }

  onTrace({ type: "error", text: "Max iterations reached without final answer." });
}
