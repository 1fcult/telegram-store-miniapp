const token = "8550097764:AAE8_avqxS8VC4fu85CmTmw6uQaMtPSBNvQ";
const webAppUrl = "https://178-72-165-215.nip.io";

fetch(`https://api.telegram.org/bot${token}/setChatMenuButton`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        menu_button: {
            type: "web_app",
            text: "Открыть магазин 🛍",
            web_app: {
                url: webAppUrl
            }
        }
    })
})
    .then(res => res.json())
    .then(data => console.log('Menu Button:', data))
    .catch(console.error);
