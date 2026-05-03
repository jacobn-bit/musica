Musica v4 icon-first original design

This version:
- restores the original SoundScore-style hero text:
  music discovery
  Find albums worth your time.
  Ranked by listeners, critics, and cultural impact. Discover top albums, hidden gems, and genre classics fast.
- adds an icon-first rounded-square M logo for Musica
- keeps hamburger navigation
- makes selected hamburger menu items gray instead of yellow
- keeps Supabase + Spotify integration
- added Spotify albums can be rated 1–10
- Spotify-added albums will show real album covers once Spotify keys are connected

Quick preview:
Unzip this folder and double-click index.html.

Important:
For full Spotify search and shared ratings, connect Supabase keys in config.js and Spotify keys in Netlify environment variables.


Logo update: changed to a clean gold outlined M inspired by the reference image you sent.


Premium gold update: added warmer gold accents, subtle glow, richer dark panels, and more polished card/button styling.


Fix update: logo now uses musica-logo.svg image tag, hero headline is white, scores use the gold gradient.


Final style reset: restored original clean typography/coloration while keeping gold buttons and gold-gradient scores.


Final light theme update: light mode now uses warm beige/white cards, readable dark text, subtle shadows, and gold accents. Dark mode is unchanged.


Spotify fix included:
- netlify/functions/spotify-search.js added
- netlify/functions/spotify.js alias added
- netlify.toml added
- app.js now calls /.netlify/functions/spotify-search

After uploading this folder to Netlify:
1. Confirm SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET exist in Netlify Environment variables.
2. Deploy this full unzipped folder.
3. Test + Add album from Spotify.


Endpoint fix:
- app.js now explicitly calls /.netlify/functions/spotify-search
- both spotify-search.js and spotify.js return JSON
- netlify.toml included for function detection

Upload the full unzipped folder to Netlify, wait for Published, then test Add album from Spotify.


FULLY FINAL READY VERSION:
- Supabase URL and anon public key are already added to config.js.
- Supabase URL has been corrected to remove /rest/v1.
- Spotify Netlify functions are included.
- Upload this ZIP or the full folder to Netlify.
- Spotify environment variables must already exist on Netlify:
  SPOTIFY_CLIENT_ID
  SPOTIFY_CLIENT_SECRET
