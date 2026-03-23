# HTTPS On EC2 Public IP

This setup uses a Let's Encrypt IP certificate with Certbot and Nginx.

Important:

- IP certificates are short-lived and currently last about 6 days.
- Renewals must be automated.
- This setup assumes your EC2 public IP is stable.

## 1. Open EC2 security group ports

Allow inbound:

- `22`
- `80`
- `443`

## 2. Start the app over HTTP first

From the repo on EC2:

```bash
mkdir -p deploy/certbot-www deploy/generated
docker compose -f docker-compose.prod.yml up -d --build
```

This serves the app on port `80` and exposes `/.well-known/acme-challenge/` for Certbot webroot validation.

## 3. Install Certbot

Certbot recommends the snap package on Linux:

```bash
sudo apt update
sudo apt install -y snapd
sudo snap install core
sudo snap refresh core
sudo snap install --classic certbot
sudo ln -sf /snap/bin/certbot /usr/bin/certbot
certbot --version
```

Use Certbot 5.4 or higher for webroot support with IP addresses.

## 4. Request the certificate

Replace `YOUR_PUBLIC_IP` and `REPO_PATH`.

First test against staging:

```bash
sudo certbot certonly --staging \
  --preferred-profile shortlived \
  --webroot \
  --webroot-path  /home/ubuntu/home/Triageq-repo/deploy/certbot-www \
  --ip-address 13.127.44.111
```

Then issue the real certificate:

```bash
sudo certbot certonly \
  --preferred-profile shortlived \
  --webroot \
  --webroot-path /home/ubuntu/home/Triageq-repo/deploy/certbot-www \
  --ip-address 13.127.44.111
```

## 5. Generate the HTTPS Nginx config

```bash
chmod +x deploy/render-ip-ssl-config.sh ./deploy/render-ip-ssl-config.sh 13.127.44.111
```

This creates:

- `deploy/generated/ip-https.conf`

## 6. Switch to HTTPS

```bash
docker compose -f docker-compose.https-ip.yml up -d --build
```

Your app should now be available at:

- `https://YOUR_PUBLIC_IP`

## 7. Configure renewal reload hook

Make the reload helper executable:

```bash
chmod +x deploy/reload-web.sh
```

Create a Certbot deploy hook:

```bash
sudo tee /etc/letsencrypt/renewal-hooks/deploy/triageq-reload.sh >/dev/null <<'EOF'
#!/usr/bin/env bash
cd REPO_PATH
./deploy/reload-web.sh
EOF
sudo chmod +x /etc/letsencrypt/renewal-hooks/deploy/triageq-reload.sh
```

Test renewal:

```bash
sudo certbot renew --dry-run
```

## 8. Update app configuration

Set `.env` to:

```env
BASE_URL=https://YOUR_PUBLIC_IP
```

Then restart:

```bash
docker compose -f docker-compose.https-ip.yml up -d --build
```

## Notes

- Let's Encrypt says IP address certificates must be short-lived and require the `shortlived` profile.
- Let's Encrypt says Certbot 5.4+ supports IP certificates with `--webroot` and `--ip-address`.
- Certbot does not yet auto-install IP certificates into Nginx, so this repo mounts `/etc/letsencrypt` and uses a generated Nginx config instead.
