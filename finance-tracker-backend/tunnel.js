const localtunnel = require('localtunnel');
const fs = require('fs');
const path = require('path');

const PORT = 5000;
// We append a small random string to make it unique so there's no conflict on the localtunnel server
const randomId = Math.random().toString(36).substring(2, 8);
const SUBDOMAIN = `finance-tracker-sms-${randomId}`;

(async () => {
  try {
    console.log('Starting localtunnel on port', PORT);
    const tunnel = await localtunnel({ port: PORT, subdomain: SUBDOMAIN });
    console.log('Tunnel is active!');
    console.log('URL:', tunnel.url);

    // Update .env file programmatically!
    const envPath = path.resolve(__dirname, '.env');
    if (fs.existsSync(envPath)) {
      let envContent = fs.readFileSync(envPath, 'utf8');
      const backendUrlRegex = /^BACKEND_URL=.*$/m;
      const newBackendUrl = `BACKEND_URL=${tunnel.url}`;
      
      if (backendUrlRegex.test(envContent)) {
        envContent = envContent.replace(backendUrlRegex, newBackendUrl);
      } else {
        envContent += `\n${newBackendUrl}`;
      }
      
      fs.writeFileSync(envPath, envContent, 'utf8');
      console.log('Updated .env file with URL:', tunnel.url);
    }

    // Keep Node event loop active forever
    setInterval(() => {
      // Just keep-alive
    }, 1000 * 60 * 60);

    tunnel.on('close', () => {
      console.log('Tunnel closed.');
      process.exit(0);
    });
  } catch (err) {
    console.error('Error starting tunnel:', err);
    process.exit(1);
  }
})();
