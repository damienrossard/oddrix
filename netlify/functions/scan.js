exports.handler = async (event) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json"
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: "" };
  }

  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers, body: JSON.stringify({ error: "Method not allowed" }) };
  }

  let body;
  try {
    body = JSON.parse(event.body);
  } catch {
    return { statusCode: 400, headers, body: JSON.stringify({ error: "Corps invalide" }) };
  }

  const { image, mediaType } = body;
  if (!image || !mediaType) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: "image et mediaType requis" }) };
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: "Clé API manquante" }) };
  }

  const PROMPT = `Tu es un expert en paris sportifs. Analyse cette capture d'écran et extrais TOUTES les informations du pari. Réponds UNIQUEMENT en JSON brut sans markdown :
{"sport":"Football|Tennis|etc.","bookmaker":"Winamax|Betclic|PMU|etc.","type":"Simple|Combiné","pays":"France|Espagne|etc.","championnat":"Ligue 1|Premier League|etc.","marche":"Résultat match|Buts|Buteur|etc.","sousMarche":"sélection précise","cote":2.35,"mise":10,"gainPotentiel":null,"resultat":"en cours|gagné|perdu","date":"YYYY-MM-DD","equipes":"Equipe A vs Equipe B ou null"}
Si une info est absente mets null. JSON brut uniquement.`;

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 700,
        messages: [{ role: "user", content: [
          { type: "image", source: { type: "base64", media_type: mediaType, data: image } },
          { type: "text", text: PROMPT }
        ]}]
      })
    });

    const data = await response.json();
    if (!response.ok) {
      return { statusCode: response.status, headers, body: JSON.stringify({ error: data.error?.message || "Erreur API" }) };
    }

    const text = data.content?.map(c => c.text || "").join("") || "";
    const clean = text.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(clean);
    return { statusCode: 200, headers, body: JSON.stringify(parsed) };
  } catch (err) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message || "Erreur serveur" }) };
  }
};
