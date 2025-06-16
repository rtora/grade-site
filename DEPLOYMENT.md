# CollegeGrades Deployment Guide

This guide contains personal notes on how to deploy updates to the collegegrades.org server.

**Note:** Server credentials and IP addresses have been replaced with placeholders like `[user]@[server-ip]` for security.

### Prerequisites

* Access to the server private key (e.g., `~/.ssh/id_rsa`).
* An SSH client installed on your local machine.
* A local copy of the code repository.

### Deployment Steps

#### 1. Copying Files to the Server

Use `rsync` to efficiently copy files while excluding the local virtual environment.

```bash
rsync -av --exclude 'myenv' grade-site/ [user]@[server-ip]:/var/www/collegegrades
```

#### 2. SSH into the Server

Connect to the server using your private key.

```bash
ssh -i ~/.ssh/id_rsa [user]@[server-ip]
```

#### 3. Update Dependencies

If you've made changes to `requirements.txt`, update the server's virtual environment.

```bash
cd /var/www/grade-site
source venv/bin/activate
sudo venv/bin/pip install -r requirements.txt
```

#### 4. Run Database Indexing

If you've made changes that require database re-indexing:

```bash
sudo venv/bin/python create_indexes.py
```

#### 5. Restart the Application

Restart the Gunicorn service to apply all changes.

```bash
sudo systemctl restart app
```

#### 6. Verify Deployment

Check that the Gunicorn service and Nginx are running properly.

```bash
# Check Gunicorn status
sudo systemctl status app

# Check Nginx status
sudo systemctl status nginx

# View live application logs
sudo journalctl -u app -f

# View Nginx error logs
sudo tail -f /var/log/nginx/error.log
```
