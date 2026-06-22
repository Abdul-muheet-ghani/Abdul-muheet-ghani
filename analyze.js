export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { mode, rtl, spec } = req.body;

  if (!mode || !rtl) {
    return res.status(400).json({ error: 'Missing required fields: mode, rtl' });
  }

  let prompt;

  if (mode === 'document') {
    prompt = `You are documenting RTL hardware design files. Analyze the following Verilog/SystemVerilog source and respond with ONLY valid JSON (no markdown fences, no preamble) matching exactly this shape:

{
  "modules": [
    {
      "name": "module_name",
      "description": "1-3 sentence plain-language description of what this module does",
      "signals": [
        {"direction": "input|output|inout", "name": "signal_name", "width": "e.g. [7:0] or empty string", "description": "what this signal does"}
      ]
    }
  ],
  "dataFlow": "2-4 sentence description of how data moves through the overall design across modules",
  "architectureSummary": "A short paragraph (4-6 sentences) summarizing the overall architecture suitable for a design review document"
}

RTL source:
${rtl.slice(0, 15000)}`;
  } else if (mode === 'compliance') {
    if (!spec) {
      return res.status(400).json({ error: 'Missing required field: spec' });
    }
    prompt = `You are a hardware design reviewer. Compare the SPEC against the RTL IMPLEMENTATION below and respond with ONLY valid JSON (no markdown fences, no preamble) matching exactly this shape:

{
  "score": 0-100,
  "matchedCount": number,
  "mismatchCount": number,
  "missingCount": number,
  "findings": [
    {"type": "missing|mismatch|matched", "title": "short title", "detail": "1-3 sentence explanation referencing specific spec requirement and RTL evidence", "reference": "e.g. spec section / file name"}
  ]
}

SPEC:
${spec.slice(0, 10000)}

RTL IMPLEMENTATION:
${rtl.slice(0, 10000)}`;
  } else {
    return res.status(400).json({ error: 'mode must be "document" or "compliance"' });
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 4000,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      return res.status(502).json({ error: `Anthropic API error: ${errText}` });
    }

    const data = await response.json();
    const text = data.content.map(block => block.text || '').join('\n');
    const clean = text.replace(/```json|```/g, '').trim();

    let parsed;
    try {
      parsed = JSON.parse(clean);
    } catch (parseErr) {
      return res.status(502).json({ error: 'Model did not return valid JSON', raw: text });
    }

    return res.status(200).json(parsed);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
