export async function sendMessageToN8N(message) {
  const response = await fetch(import.meta.env.VITE_N8N_WEBHOOK_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ message })
  });
  return await response.json();
}
