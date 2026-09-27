# Deploy — Backend API (city-airport-taxis.be)

Run these commands from your local machine (inside the `city-airport/backend` folder):

```bash
# 1. Sync code to VPS
rsync -az --delete \
  --exclude node_modules --exclude dist --exclude .git --exclude '.env*' \
  ./ root@82.29.177.100:/opt/city-airport-taxis-backend/

# 2. Build Docker image on VPS
ssh root@82.29.177.100 "cd /opt/city-airport-taxis-backend && docker build -t city-airport-taxis-backend:local ."

# 3. Restart container
ssh root@82.29.177.100 "cd /opt/city-airport-taxis-backend && \
  sed -i 's/pull_policy: always/pull_policy: never/g' docker-compose.prod.yml && \
  IMAGE=city-airport-taxis-backend:local docker compose -f docker-compose.prod.yml up -d && \
  sed -i 's/pull_policy: never/pull_policy: always/g' docker-compose.prod.yml"
```

**Live URL:** https://api.city-airport-taxis.be
