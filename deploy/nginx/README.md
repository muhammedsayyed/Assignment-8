# Nginx setup

This project serves both the frontend (`/app/`) and API from the Node.js process on port `9000`. Nginx forwards incoming HTTP traffic to that process.

On Ubuntu, copy `spy-app.conf` to `/etc/nginx/sites-available/spy-app`, enable it, validate the configuration, and reload Nginx:

```bash
sudo cp deploy/nginx/spy-app.conf /etc/nginx/sites-available/spy-app
sudo ln -s /etc/nginx/sites-available/spy-app /etc/nginx/sites-enabled/spy-app
sudo nginx -t
sudo systemctl reload nginx
```

If the default Nginx site is also enabled, disable it if it conflicts with this server block. The app must be running on `127.0.0.1:9000`. For HTTPS, replace `server_name _;` with the site's domain and configure a TLS certificate.
