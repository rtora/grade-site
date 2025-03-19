# CollegeGrades Deployment Guide

This guide explains how to deploy updates to collegegrades.org, which now runs on a Hetzner server.

## Prerequisites

- Access to the Hetzner server private key (`~/.ssh/id_rsa`)
- SSH client installed on your local machine
- Local copy of the code repository

## Deployment Steps

### 1. Copying Files to the Server

When copying the project files to the server, make sure **not to copy your environment directory** (in this case, the `myenv` folder). There are a couple of ways to handle this:

#### Option A: Using `scp` and then removing the environment directory

Copy the entire `grade-site` folder, then remove the `myenv` folder on the server:

```bash
# Copy the files to the server
scp -r grade-site root@5.78.113.168:/var/www/collegegrades

# Remove the environment directory from the server
ssh root@5.78.113.168 "rm -rf /var/www/collegegrades/myenv"
```

#### Option B: Using rsync with an exclude flag
Alternatively, you can use rsync to exclude the environment directory during transfer:
```bash
rsync -av --exclude 'myenv' grade-site/ root@5.78.113.168:/var/www/collegegrades
```

### 2. SSH into Hetzner Server

Connect to the server using

```bash
ssh -i ~/.ssh/id_rsa root@5.78.113.168
```

### 3. Deploy Updated Files

Once connected, move the copied files into the proper web directory if necessary. In this guide, the files are directly copied to /var/www/collegegrades, so this step may be optional. If you need to copy files from a temporary directory, adjust accordingly.

### 4. Update Dependencies

If you've made changes to requirements.txt:

```bash
cd /var/www/grade-site
source venv/bin/activate
sudo venv/bin/pip install -r requirements.txt
```
Note: The virtual environment (venv) should already be set up on the server. Do not copy your local environment directory (myenv).

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
- Server IP: 5.78.113.168
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

4. View Nginx Error Logs: 
Check the Nginx error logs for any issues with Nginx itself or proxying requests:
sudo tail -f /var/log/nginx/error.log

## File Locations

- Application Directory: `/var/www/grade-site/`
- Virtual Environment: `/var/www/grade-site/venv/`
- Nginx Configuration: `/etc/nginx/conf.d/app.conf`
- Systemd Service: `/etc/systemd/system/app.service`

## Note

Always make sure to test changes locally before deploying to production. Keep a backup of working code in case you need to rollback changes.