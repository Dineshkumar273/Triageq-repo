# Dev Mode

Use this setup for hot reload during development.

## Start

```bash
docker compose -f docker-compose.dev.yml up
```

## URLs

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:5000`

## What you get

- Frontend hot reload through Vite
- Backend auto-restart through `tsx watch`
- Source code mounted into the containers, so file changes apply immediately

## Stop

```bash
docker compose -f docker-compose.dev.yml down
```
