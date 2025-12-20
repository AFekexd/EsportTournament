# Deployment Guide

This guide explains how to deploy the EsportTournament application to an Ubuntu server using Docker.

## Prerequisites

1.  **Ubuntu Server**: A clean Ubuntu 20.04 or 22.04 server.
2.  **Docker & Docker Compose**: Installed on the server.

### Install Docker (if not installed)

Run the following commands on your server:

```bash
# Update package index
sudo apt-get update

# Install Docker
sudo apt-get install -y docker.io

# Install Docker Compose
sudo apt-get install -y docker-compose

# Start Docker
sudo systemctl start docker
sudo systemctl enable docker

# Add your user to docker group (optional, to avoid using sudo)
sudo usermod -aG docker $USER
# (You may need to logout and login again for this to take effect)
```

## Deployment Steps

1.  **Copy Files**
    Copy the entire project directory (`EsportTournament`) to your server. You can use `scp`, `rsync`, or `git clone` if your repo is hosted remotely.

    ```bash
    # Example using scp from your local machine
    scp -r "d:\Codes\EsportTournament" user@your.server.ip:/home/user/
    ```

2.  **Configure Environment**
    On the server, navigate to the project folder and edit the `.env` file.

    ```bash
    cd EsportTournament
    nano .env
    ```

    **IMPORTANT**: You must change `VITE_API_URL` to point to your server's public IP or domain name.
    
    ```properties
    # .env
    VITE_API_URL=http://YOUR_SERVER_PUBLIC_IP:6969/api
    
    # Leave these as is unless you have a custom Keycloak setup
    VITE_KEYCLOAK_URL=https://keycloak.pollak.info
    VITE_KEYCLOAK_REALM=master
    VITE_KEYCLOAK_CLIENT_ID=esportadmin
    
    # Database credentials (can be left as default for testing)
    POSTGRES_USER=postgres
    POSTGRES_PASSWORD=postgres
    POSTGRES_DB=esport_db
    ```

3.  **Run Application**
    Start the services using Docker Compose. The `--build` flag ensures the frontend is rebuilt with your new `.env` settings.

    ```bash
    sudo docker-compose up -d --build
    ```

4.  **Access the App**
    - **Frontend**: http://YOUR_SERVER_PUBLIC_IP
    - **Backend API**: http://YOUR_SERVER_PUBLIC_IP:6969
    - **Database**: Port 5433 (exposed for remote management if needed)

## Troubleshooting

-   **Frontend can't connect to backend**:
    -   Open the browser developer tools (F12) -> Network tab.
    -   Check if the API requests are going to `localhost` or your server IP. If they go to `localhost`, you didn't update `.env` correctly or didn't rebuild (`--build`) after changing it.
    -   Ensure port `6969` is allowed through the firewall (`ufw allow 6969`).

-   **Updating the App**:
    -   Pull/copy new code.
    -   Run `sudo docker-compose up -d --build` again.
