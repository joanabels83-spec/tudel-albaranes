exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const OPENAI_KEY = process.env.OPENAI_KEY;
  if (!OPENAI_KEY) {
    return { statusCode: 500, body: JSON.stringify({ error: 'API key no configurada' }) };
  }

  try {
    const { base64, mimeType } = JSON.parse(event.body);

    const prompt = `Analiza esta imagen de un albarán de entrega de una cafetería y extrae los datos.
Responde ÚNICAMENTE con un JSON válido con esta estructura exacta (sin markdown, sin explicaciones):
{
  "num": "número de albarán o referencia del documento",
  "fecha": "fecha en formato YYYY-MM-DD",
  "proveedor": "nombre del proveedor o empresa emisora",
  "lineas": [
    {"producto": "nombre del producto", "cantidad": 1, "unidad": "ud", "precio": 0.00}
  ],
  "total": 0.00,
  "observaciones": "cualquier nota relevante o vacío"
}
Si no encuentras algún dato, usa null. Las unidades pueden ser: ud, kg, g, l, ml, caja, bolsa, botella, pack.`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + OPENAI_KEY
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        max_tokens: 1000,
        messages: [{
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            { type: 'image_url', image_url: { url: 'data:' + mimeType + ';base64,' + base64 } }
          ]
        }]
      })
    });

    if (!response.ok) {
      const err = await response.json();
      return { statusCode: 500, body: JSON.stringify({ error: err.error?.message || 'Error OpenAI' }) };
    }

    const data = await response.json();
    const text = data.choices[0].message.content.trim();
    const clean = text.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(clean);

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(parsed)
    };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
