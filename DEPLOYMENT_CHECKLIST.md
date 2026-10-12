# TheRuinForge deployment checklist

- [ ] Upload project files to GitHub; never upload `.env` or tokens.
- [ ] Deploy on Render with `npm ci` and `npm start`.
- [ ] Configure `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET`, `DISCORD_REDIRECT_URI`, `DISCORD_GUILD_ID`, and `DISCORD_BOT_TOKEN`.
- [ ] Ensure `SESSION_SECRET` is long and random (Blueprint can generate it).
- [ ] Register the exact callback URL in Discord Developer Portal: `https://YOUR-SERVICE.onrender.com/auth/discord/callback`.
- [ ] No OpenAI key is required for browser AI. Leave `OPENAI_API_KEY` unset to avoid hosted API charges.
- [ ] Test Discord login and server membership.
- [ ] Test AI in a WebGPU-capable browser; first use downloads a large model.
- [ ] Check Render logs for backend errors.


## Own Ollama model on Mac
- [ ] `ollama run qwen2.5-coder:3b` works locally.
- [ ] `ollama-bridge.js` runs with a private `OLLAMA_SHARED_SECRET`.
- [ ] Cloudflare Tunnel forwards to `http://127.0.0.1:11435`.
- [ ] Render `OLLAMA_BASE_URL` equals the current tunnel URL.
- [ ] Render `OLLAMA_SHARED_SECRET` matches the bridge secret exactly.
- [ ] Mac awake, Ollama, bridge, and tunnel remain running while users generate scripts.
- [ ] No secrets or `.env` file committed to GitHub.
