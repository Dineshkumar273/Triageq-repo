# Deploy To AWS EC2

This project can run on a single EC2 instance with Docker Compose.

## 1. Launch the instance

- Create an Ubuntu EC2 instance.
- Allow inbound ports:
  - `22` for SSH
  - `80` for HTTP
  - `443` for HTTPS later if you add SSL
- Keep port `5000` closed to the public internet. The backend is only needed inside Docker.

## 2. Install Docker

Run on the EC2 instance:

```bash
sudo apt update
sudo apt install -y docker.io docker-compose-v2 git
sudo systemctl enable docker
sudo systemctl start docker
sudo usermod -aG docker $USER
newgrp docker
```

## 3. Clone the repository

```bash
  git clone https://github.com/Dineshkumar273/Triageq-repo.git
cd Triageq-repo
```

## 4. Configure environment variables

Create the production env file:

```bash
cp .env.example .env
```

Update these values in `.env`:

- `BASE_URL=http://YOUR_EC2_PUBLIC_IP_OR_DOMAIN`
- `MONGO_URI=...`
- `JWT_SECRET=...`
- `JIRA_CLIENT_ID=...`
- `JIRA_CLIENT_SECRET=...`

Important:

- For Jira OAuth, add this callback URL in Atlassian:
  - `http://YOUR_EC2_PUBLIC_IP_OR_DOMAIN/auth/jira/callback`
- If you later attach a domain and HTTPS, update `BASE_URL` and Jira callback to that exact public URL.

## 5. Start the app

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

## 6. Verify

```bash
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs -f
```

Open:

- `http://YOUR_EC2_PUBLIC_IP_OR_DOMAIN`

## 7. Update after new code

```bash
git pull
docker compose -f docker-compose.prod.yml up -d --build
```

## Notes

- The production stack uses the frontend container as the public Nginx entrypoint on port `80`.
- Nginx proxies `/graphql` and `/auth/*` to the backend container internally.
- The backend is not exposed publicly in production Compose.
- The current repository has real-looking secrets in `.env`. Rotate them before public deployment.
