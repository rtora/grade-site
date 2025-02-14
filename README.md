# CollegeGrades Deployment Guide

This guide explains how to deploy updates to collegegrades.org, which runs on an AWS EC2 instance.

## Prerequisites

- Access to the EC2 instance private key (`grade site.pem`)
- SSH client
- Local copy of the code repository

## Deployment Steps

### 1. Copying Files to EC2

From your local machine, copy the updated files to the EC2 instance:

```bash
# Create a temporary directory on EC2 for the files
ssh -i "grade site.pem" ec2-user@18.119.131.51 "mkdir -p ~/grade-site-temp"

# Copy files from local machine to EC2
scp -i "grade site.pem" -r grade-site/* ec2-user@18.119.131.51:~/grade-site-temp/
```

### 2. SSH into EC2 Instance

Connect to the EC2 instance:

```bash
ssh -i "grade site.pem" ec2-user@18.119.131.51
```

### 3. Deploy Updated Files

Once connected to EC2, copy the files to the web directory:

```bash
# Copy files to the web directory
sudo cp -r ~/grade-site-temp/* /var/www/grade-site/
```

### 4. Update Dependencies

If you've made changes to requirements.txt:

```bash
cd /var/www/grade-site
source venv/bin/activate
sudo venv/bin/pip install -r requirements.txt
```

### 5. Run Database Indexing

If you've made changes that require database indexing:

```bash
sudo venv/bin/python create_indexes.py
```

### 6. Restart the Application

Restart the Gunicorn service:

```bash
sudo systemctl restart app
```

### 7. Verify Deployment

Check that the service is running properly:

```bash
sudo systemctl status app
```

You should see output indicating that the service is "active (running)" with 3 Gunicorn workers.

## Infrastructure Details

- Web Server: Nginx
- Application Server: Gunicorn (3 workers)
- Python Web Framework: Flask
- Domain: collegegrades.org
- Server IP: 18.119.131.51
- Application Port: 8000 (internal)

## Troubleshooting

If the site is not accessible after deployment:

1. Check Gunicorn status:
```bash
sudo systemctl status app
```

2. Check Nginx status:
```bash
sudo systemctl status nginx
```

3. View application logs:
```bash
sudo journalctl -u app
```

## File Locations

- Application Directory: `/var/www/grade-site/`
- Virtual Environment: `/var/www/grade-site/venv/`
- Nginx Configuration: `/etc/nginx/conf.d/app.conf`
- Systemd Service: `/etc/systemd/system/app.service`

## Note

Always make sure to test changes locally before deploying to production. Keep a backup of working code in case you need to rollback changes.