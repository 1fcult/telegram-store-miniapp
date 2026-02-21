const localtunnel = require('localtunnel');
const token = "8550097764:AAE8_avqxS8VC4fu85CmTmw6uQaMtPSBNvQ";

(async () => {
    try {
        console.log('Starting LocalTunnel...');
        const tunnel = await localtunnel({ port: 5173 });

        console.log(`Tunnel ready! URL: ${tunnel.url}`);

        // Update Bot Menu
        const res = await fetch(`https://api.telegram.org/bot${token}/setChatMenuButton`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                menu_button: {
                    type: "web_app",
                    text: "Открыть магазин 🛍",
                    web_app: {
                        url: tunnel.url
                    }
                }
            })
        });

        const data = await res.json();
        console.log('Telegram Bot updated:', data);

        tunnel.on('close', () => {
            console.log('Tunnel closed');
        });
    } catch (e) {
        console.error('Error starting tunnel', e);
    }
})();
