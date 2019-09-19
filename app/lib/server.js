const net = require('net');
const readline = require('readline');

const EventEmitter = require('events');

const DEFAULT_HOST = '0.0.0.0';
const DEFAULT_PORT = 6666;

class Server extends EventEmitter {
    constructor(options = {}) {
        super();
        this._requestId = 0;
        const host = options.host || DEFAULT_HOST;
        const port = options.port || DEFAULT_PORT;

        // create the server and forward some base events
        this._server = net.createServer();
        this._server.on('listening', () => this.emit('listening', host, port));
        this._server.on('error', (err) => this.emit('error', err));

        // handle the clients
        this._server.on('connection', this._handleClient.bind(this));

        // start listening for clients
        this._server.listen(port, host);
    }

    close() {
        this._server.close();
    }

    _handleClient(socket) {
        // notify request events using a separate emitter
        const requestEmitter = new EventEmitter();

        // keep track of the number of requests
        const requestId = ++this._requestId;

        // read each line as a JSON object
        const reader = readline.createInterface({input: socket});
        reader.on('line', (json) => {
            try {
                // prepare the event object
                const event = JSON.parse(json);
                const type = event.type;
                delete event.type;

                // emit the object to the proper listener
                switch (type) {
                case 'request':
                    // add request id for convenience
                    event.id = requestId;
                    this.emit(type, event, requestEmitter);
                    break;

                case 'call':
                case 'exit':
                case 'return':
                case 'warning':
                    requestEmitter.emit(type, event);
                    break;

                default:
                    this.emit('error', new Error(`Invalid event '${type}'`));
                    reader.close();
                }
            } catch (err) {
                // all errors are caught and notified here
                this.emit('error', err);
                reader.close();
            }
        });

        // propagate the socket closing event
        socket.on('close', () => requestEmitter.emit('close'));
    }
}

module.exports = Server;
