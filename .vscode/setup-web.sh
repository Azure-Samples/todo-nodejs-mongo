#!/usr/bin/env bash

function codespacesPortUrl() {
    local portNumber=$1
    gh codespace ports \
        -c "$CODESPACE_NAME" \
        --json sourcePort,browseUrl \
        --jq "map(select(.sourcePort == $portNumber))[0].browseUrl"
}

if [ "$CODESPACES" = 'true' ]; then
    echo "Running in Codespaces. Setting port configurations."

    webPortUrl=$(codespacesPortUrl 3000)
    echo "azd env set REACT_APP_WEB_BASE_URL \"$webPortUrl\""
    azd env set REACT_APP_WEB_BASE_URL "$webPortUrl"

    # Set port for websocket debugging so the application can communicate with
    # Webpack DevServer running in codespaces
    # https://github.com/community/community/discussions/11524
    echo "azd env set WDS_SOCKET_PORT \"443\""
    azd env set WDS_SOCKET_PORT "443"

else 
    echo "Running in local development mode. Setting port configurations"
    
    echo "azd env set REACT_APP_WEB_BASE_URL \"http://localhost:3000\""
    azd env set REACT_APP_WEB_BASE_URL "http://localhost:3000"

    # Set Webpack DevServer configuration to default for local development
    echo "azd env set WDS_SOCKET_PORT \"\""
    azd env set WDS_SOCKET_PORT ""
fi
