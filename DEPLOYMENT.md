# Deployment Guide

This guide covers various deployment options for the RenderDoc Debug Agent.

## Table of Contents

- [Local Development](#local-development)
- [Docker Deployment](#docker-deployment)
- [Production Deployment](#production-deployment)
- [Cloud Deployment](#cloud-deployment)

---

## Local Development

### Quick Start (Linux/macOS)

```bash
# Clone the repository
git clone https://github.com/haolange/Renderdoc-Debug-Agent.git
cd Renderdoc-Debug-Agent

# Run the quick start script
./run.sh
```

### Quick Start (Windows)

```batch
REM Clone the repository
git clone https://github.com/haolange/Renderdoc-Debug-Agent.git
cd Renderdoc-Debug-Agent

REM Run the quick start script
run.bat
```

### Manual Setup

```bash
# Create virtual environment
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env with your settings

# Run the application
python app.py
```

---

## Docker Deployment

### Using Docker Compose (Recommended)

1. **Create `.env` file:**
```bash
cp .env.example .env
# Edit .env and set your OPENAI_API_KEY
```

2. **Build and run:**
```bash
docker-compose up -d
```

3. **Access the application:**
```
http://localhost:5000
```

4. **View logs:**
```bash
docker-compose logs -f
```

5. **Stop the service:**
```bash
docker-compose down
```

### Using Docker Directly

1. **Build the image:**
```bash
docker build -t renderdoc-debug-agent .
```

2. **Run the container:**
```bash
docker run -d \
  -p 5000:5000 \
  -v $(pwd)/uploads:/app/uploads \
  -e OPENAI_API_KEY=your_api_key_here \
  -e FLASK_SECRET_KEY=your_secret_key \
  --name renderdoc-agent \
  renderdoc-debug-agent
```

3. **Check logs:**
```bash
docker logs -f renderdoc-agent
```

4. **Stop the container:**
```bash
docker stop renderdoc-agent
docker rm renderdoc-agent
```

---

## Production Deployment

### Using Gunicorn (Recommended for Production)

1. **Install Gunicorn:**
```bash
pip install gunicorn
```

2. **Create a Gunicorn configuration file (`gunicorn.conf.py`):**
```python
bind = "0.0.0.0:5000"
workers = 4
worker_class = "sync"
timeout = 120
max_requests = 1000
max_requests_jitter = 100
accesslog = "-"
errorlog = "-"
loglevel = "info"
```

3. **Run with Gunicorn:**
```bash
gunicorn -c gunicorn.conf.py app:app
```

### Using systemd (Linux)

1. **Create a systemd service file (`/etc/systemd/system/renderdoc-agent.service`):**
```ini
[Unit]
Description=RenderDoc Debug Agent
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/opt/renderdoc-debug-agent
Environment="PATH=/opt/renderdoc-debug-agent/venv/bin"
ExecStart=/opt/renderdoc-debug-agent/venv/bin/gunicorn -c gunicorn.conf.py app:app
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

2. **Enable and start the service:**
```bash
sudo systemctl daemon-reload
sudo systemctl enable renderdoc-agent
sudo systemctl start renderdoc-agent
sudo systemctl status renderdoc-agent
```

### Nginx Reverse Proxy

1. **Install Nginx:**
```bash
sudo apt-get install nginx
```

2. **Create Nginx configuration (`/etc/nginx/sites-available/renderdoc-agent`):**
```nginx
server {
    listen 80;
    server_name your-domain.com;

    client_max_body_size 100M;

    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Increase timeout for long-running analyses
        proxy_read_timeout 300;
        proxy_connect_timeout 300;
        proxy_send_timeout 300;
    }
}
```

3. **Enable the site:**
```bash
sudo ln -s /etc/nginx/sites-available/renderdoc-agent /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### SSL/TLS with Let's Encrypt

```bash
# Install certbot
sudo apt-get install certbot python3-certbot-nginx

# Obtain certificate
sudo certbot --nginx -d your-domain.com

# Auto-renewal is set up automatically
```

---

## Cloud Deployment

### AWS (Elastic Beanstalk)

1. **Install EB CLI:**
```bash
pip install awsebcli
```

2. **Initialize EB:**
```bash
eb init -p python-3.11 renderdoc-agent
```

3. **Create environment:**
```bash
eb create renderdoc-agent-env
```

4. **Set environment variables:**
```bash
eb setenv OPENAI_API_KEY=your_key FLASK_SECRET_KEY=your_secret
```

5. **Deploy:**
```bash
eb deploy
```

### Google Cloud Platform (Cloud Run)

1. **Build and push to Google Container Registry:**
```bash
gcloud builds submit --tag gcr.io/your-project-id/renderdoc-agent
```

2. **Deploy to Cloud Run:**
```bash
gcloud run deploy renderdoc-agent \
  --image gcr.io/your-project-id/renderdoc-agent \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars OPENAI_API_KEY=your_key,FLASK_SECRET_KEY=your_secret
```

### Azure (App Service)

1. **Create a resource group:**
```bash
az group create --name renderdoc-rg --location eastus
```

2. **Create an App Service plan:**
```bash
az appservice plan create --name renderdoc-plan --resource-group renderdoc-rg --sku B1 --is-linux
```

3. **Create a web app:**
```bash
az webapp create --resource-group renderdoc-rg --plan renderdoc-plan --name renderdoc-agent --runtime "PYTHON|3.11"
```

4. **Deploy:**
```bash
az webapp up --name renderdoc-agent --resource-group renderdoc-rg
```

5. **Set environment variables:**
```bash
az webapp config appsettings set --resource-group renderdoc-rg --name renderdoc-agent --settings OPENAI_API_KEY=your_key FLASK_SECRET_KEY=your_secret
```

### Heroku

1. **Create a `Procfile`:**
```
web: gunicorn app:app
```

2. **Create a `runtime.txt`:**
```
python-3.11.0
```

3. **Deploy:**
```bash
heroku create renderdoc-agent
heroku config:set OPENAI_API_KEY=your_key FLASK_SECRET_KEY=your_secret
git push heroku main
```

### DigitalOcean (App Platform)

1. **Create `app.yaml`:**
```yaml
name: renderdoc-agent
services:
  - name: web
    github:
      repo: haolange/Renderdoc-Debug-Agent
      branch: main
    run_command: gunicorn -w 4 -b 0.0.0.0:8080 app:app
    environment_slug: python
    envs:
      - key: OPENAI_API_KEY
        value: your_key
        type: SECRET
      - key: FLASK_SECRET_KEY
        value: your_secret
        type: SECRET
    instance_count: 1
    instance_size_slug: basic-xs
```

2. **Deploy via CLI or web interface**

---

## Environment Variables for Production

```bash
# Required
OPENAI_API_KEY=sk-...
FLASK_SECRET_KEY=random-long-secure-string

# Optional
OPENAI_MODEL=gpt-4-turbo-preview
FLASK_ENV=production
UPLOAD_FOLDER=uploads
MAX_CONTENT_LENGTH=104857600
PORT=5000
WORKERS=4
```

---

## Performance Tuning

### Application Settings

```python
# In app.py or configuration file
app.config.update(
    MAX_CONTENT_LENGTH=100 * 1024 * 1024,  # 100MB
    SEND_FILE_MAX_AGE_DEFAULT=31536000,     # Cache static files
)
```

### Gunicorn Workers

```python
# Calculate workers based on CPU cores
import multiprocessing
workers = multiprocessing.cpu_count() * 2 + 1
```

### File Upload Optimization

For large files, consider:
- Using object storage (S3, GCS, Azure Blob)
- Implementing resumable uploads
- Adding upload progress indicators

---

## Monitoring and Logging

### Application Logging

```python
import logging

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('app.log'),
        logging.StreamHandler()
    ]
)
```

### Health Checks

The `/health` endpoint is available for monitoring:
```bash
curl http://localhost:5000/health
```

### Monitoring Services

- **Prometheus**: For metrics collection
- **Grafana**: For visualization
- **Sentry**: For error tracking
- **CloudWatch/Stackdriver**: For cloud deployments

---

## Backup and Disaster Recovery

1. **Backup uploaded files:**
```bash
# Regular backups of uploads directory
tar -czf uploads-backup-$(date +%Y%m%d).tar.gz uploads/
```

2. **Database backups** (if you add a database later):
```bash
# Example for PostgreSQL
pg_dump dbname > backup.sql
```

3. **Configuration backups:**
```bash
# Backup .env and configs
cp .env .env.backup
```

---

## Security Checklist

- [ ] Use HTTPS in production
- [ ] Set strong `FLASK_SECRET_KEY`
- [ ] Implement rate limiting
- [ ] Add authentication for sensitive operations
- [ ] Validate and sanitize all inputs
- [ ] Keep dependencies updated
- [ ] Use environment variables for secrets
- [ ] Implement CORS properly
- [ ] Set appropriate file upload limits
- [ ] Regular security audits
- [ ] Monitor for suspicious activity
- [ ] Implement logging and alerting

---

## Troubleshooting

### Common Issues

**Port already in use:**
```bash
# Find process using port 5000
lsof -i :5000
# Kill the process
kill -9 <PID>
```

**Permission denied:**
```bash
# Ensure proper permissions
chmod +x run.sh
```

**Out of memory:**
- Reduce worker count
- Limit file upload size
- Add more RAM or use swap

**Slow analysis:**
- Increase timeout settings
- Use more workers
- Optimize AI model calls

---

## Support

For deployment issues:
1. Check logs: `docker logs` or application logs
2. Verify environment variables
3. Check network connectivity
4. Review firewall rules
5. Open an issue on GitHub
