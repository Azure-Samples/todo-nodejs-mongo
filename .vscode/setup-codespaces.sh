#!/usr/bin/env bash

function portUrl() {
    local portNumber=$1
    gh codespace ports \
        -c "$CODESPACE_NAME" \
        --json sourcePort,browseUrl \
        --jq "map(select(.sourcePort == $portNumber))[0].browseUrl"
}

if [ "$CODESPACES" = 'true' ]; then     # Running in codespaces
    echo "Running in Codespaces. Setting port configurations."

    webPortUrl=$(portUrl 3000)
    echo "azd env set REACT_APP_WEB_BASE_URL \"$webPortUrl\""
    azd env set REACT_APP_WEB_BASE_URL "$webPortUrl"

    apiPortUrl=$(portUrl 3100)
    echo "azd env set REACT_APP_API_BASE_URL \"$apiPortUrl\""
    azd env set REACT_APP_API_BASE_URL "$apiPortUrl"

    echo "Setting API port to public so web app can access it" 
    gh codespace ports visibility 3100:public -c "$CODESPACE_NAME"
fi
