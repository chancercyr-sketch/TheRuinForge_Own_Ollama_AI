# TheRuinForge — self-hosted Ollama + browser AI Roblox Luau Forge

Ruin AI tries an optional hosted provider when configured, then falls back to an open model running locally in the visitor’s browser. Visitors do not need their own API key and local inference does not consume your OpenAI quota.


## Use your own Ollama model (no paid AI API)

This project can send requests to an Ollama model running on your Mac. The Mac must stay awake and online while people use the hosted site. If the Mac is off or asleep, the hosted AI will be unavailable. This is not unlimited compute: model speed and simultaneous users depend on your Mac's hardware.

### 1. Install and test Ollama on your Mac

1. Install Ollama from https://ollama.com/download and open it.
2. In Terminal, run `ollama run qwen2.5-coder:3b` and wait for the model to download.
3. Test a Roblox Luau request, then type `/bye` to leave the chat. Keep the Ollama app running afterward.

### 2. Start the secure local bridge

The bridge in `ollama-bridge.js` listens only on `127.0.0.1:11435` and requires a shared secret. Do not expose Ollama's port `11434` directly to the internet.

1. In Terminal, go to the folder containing `ollama-bridge.js`.
2. Create a strong random secret with `openssl rand -hex 32`. Copy it somewhere private. Do not publish it or commit it to GitHub.
3. Start the bridge in that same Terminal window:
   `OLLAMA_SHARED_SECRET='PASTE_YOUR_RANDOM_SECRET_HERE' node ollama-bridge.js`
4. Keep this Terminal window open.

### 3. Create a free Cloudflare Quick Tunnel

Install Cloudflare's `cloudflared` tool from its official instructions: https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/ . On a Mac with Homebrew, `brew install cloudflared` is commonly available. Then open a second Terminal window and run:

`cloudflared tunnel --url http://127.0.0.1:11435`

Copy the generated `https://....trycloudflare.com` URL. Quick Tunnel URLs can change when restarted, so you may need to update Render after a restart. The bridge's shared-secret check protects the model endpoint; do not share the secret.

### 4. Configure Render

In Render → your TheRuinForge service → Environment, add:

- `OLLAMA_BASE_URL` = the current `https://....trycloudflare.com` URL (no trailing slash)
- `OLLAMA_SHARED_SECRET` = exactly the same random secret used to start the bridge
- `OLLAMA_MODEL` = `qwen2.5-coder:3b`

Save changes and redeploy/restart the service. Keep Discord OAuth and membership environment variables as they are. Leave `OPENAI_API_KEY` unset to avoid paid OpenAI API calls. When the Ollama variables are configured, the backend uses Ollama first.

### 5. Keep it available

Keep your Mac awake, connected to the internet, Ollama running, the bridge Terminal running, and the Cloudflare Tunnel Terminal running. A free Quick Tunnel is suitable for testing but is not a guaranteed permanent production endpoint. If the tunnel URL changes, update `OLLAMA_BASE_URL` in Render. For more reliable 24/7 service while your Mac is off, another always-on computer/server is required and may cost money.

### Troubleshooting

- `Could not reach your Ollama AI`: check the Ollama app, bridge Terminal, tunnel Terminal, and `OLLAMA_BASE_URL` in Render.
- `401 Unauthorized`: the Render `OLLAMA_SHARED_SECRET` must exactly match the secret used to start the bridge. Restart the bridge after changing its secret.
- `model not found`: run `ollama pull qwen2.5-coder:3b` on the Mac.
- Keep the bridge and secret private. Never put the secret in browser JavaScript or commit it to GitHub.

## Browser AI limitations
- First use downloads a large model (around a gigabyte; exact size can vary).
- Requires a compatible WebGPU browser/device and enough memory. Older devices may be unable to run it.
- Local model quality is lower than a large hosted model, especially for complex multi-script Roblox systems. Always review and test code in Roblox Studio.
- The model runs on each visitor’s device; Render does not host or pay for inference.
- If WebGPU is unavailable, AI generation will not work on that device unless a hosted provider is configured.

## Requirements
- Node.js 18 or newer
- A Discord application and bot in your community server
- A modern WebGPU-capable browser for free local AI
- Optional: a self-hosted Ollama model on your Mac, using the instructions above. An OpenAI API key is not required.

## Run locally
1. Copy `.env.example` to `.env` and fill in your Discord settings. `OPENAI_API_KEY` is optional.
2. In Discord Developer Portal → OAuth2, add `http://localhost:3000/auth/discord/callback` as a redirect URL. Set `DISCORD_REDIRECT_URI` to that exact URL.
3. Run `npm ci` then `npm start`, and open `http://localhost:3000`.

## Deploy to Render
1. Upload project files to GitHub. Never upload `.env`, API keys, Discord tokens, or `node_modules`.
2. Deploy with `npm ci` and `npm start` or use the included `render.yaml`.
3. In Render → Environment, set `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET`, `DISCORD_GUILD_ID`, `DISCORD_BOT_TOKEN`, and `DISCORD_REDIRECT_URI`. `SESSION_SECRET` is generated by the Blueprint. `OPENAI_API_KEY` is not required.
4. Register the exact `https://YOUR-SERVICE.onrender.com/auth/discord/callback` URL in Discord Developer Portal → OAuth2.

## How AI works
- `/api/ai` verifies Discord session and server membership before using configured providers.
- If `OLLAMA_BASE_URL` and `OLLAMA_SHARED_SECRET` are set, the backend sends requests to your Mac-hosted Ollama model through the authenticated bridge.
- If Ollama is not configured or the backend returns an error, the frontend may attempt local browser AI via WebLLM and a small Llama 3.2 model. The model downloads to the visitor’s device and inference runs there.
- Local inference prompts are not sent to an external AI inference API; model files are downloaded from public model/CDN hosts.
- Free local inference uses each visitor’s device resources and browser support varies.

## Troubleshooting
- **WebGPU unavailable:** update your browser and check device support.
- **Model download stalls:** allow the large download, check network restrictions, and refresh.
- **Discord OAuth fails:** callback URL must match exactly in Render and Discord Developer Portal.
- **Membership fails:** check bot token, server ID, and bot membership.

## Security
Never commit `.env`, `DISCORD_CLIENT_SECRET`, `DISCORD_BOT_TOKEN`, `OPENAI_API_KEY`, or `SESSION_SECRET`. This project is not affiliated with Roblox Corporation.
