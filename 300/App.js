'use strict';

const DATA_HANDLER = require('./node/DataHandler');
const FORMIDABLE = require('formidable');

/**
 * Web server utilizing HTTP/2
 */
class App {
    #ejsData;
    #fileName;

    /**
     * @desc instantiates DataHandler object
     */
    constructor(startingFile) {
        this.#ejsData = null;
        this.#fileName = startingFile;
        this.loadServer();
    }

    /**
     * Route & mime type handler
     */
    loadServer() {
        const HTTP = require('http');
        const HTTP2 = require('http2');
        const EJS = require('ejs');
        const PORT = process.env.PORT || 443;
        const SSL_OPTIONS = {
            key: DATA_HANDLER.getKey(),
            cert: DATA_HANDLER.getCert(),
            requestCert: true,
            rejectUnauthorized: false
        };

        HTTP.createServer((request, response) => {
            response.writeHead(301, {
                'Location': `https://${request.headers['host']}${request.url}`
            });
            response.end();
        }).listen(80);

        HTTP2.createSecureServer(SSL_OPTIONS, async (request, response) => {

            let httpHandler = (error, string, contentType) => {
                if (error) {
                    response.writeHead(500, {'Content-Type': 'text/plain'});
                    response.end('An error has occurred: ' + error.message);
                } else if (contentType.indexOf('css') >= 0 || contentType.indexOf('js') >= 0) {
                    response.writeHead(200, {'Content-Type': contentType});
                    response.end(string, 'utf-8');
                } else if (contentType.indexOf('html') >= 0) {
                    response.writeHead(200, {'Content-Type': contentType});
                    response.end(EJS.render(string, {
                        data: this.#ejsData,
                        filename: this.#fileName
                    }));
                } else {
                    response.writeHead(200, {'Content-Type': contentType});
                    response.end(string, 'binary');
                }
            };


			//ROUTES!
            if (request.method === 'POST') {
                if (request.headers['x-requested-with'] === 'fetch.0') {
                    return await DATA_HANDLER.receiveFile(request, response);
                } else {
                    console.log(`Yo, somethings super wrong BDH!`);
                }
            } else if (request.url.indexOf('.css') >= 0) {
                DATA_HANDLER.renderDom(request.url.slice(1), 'text/css', httpHandler, 'utf-8');
            } else if (request.url.indexOf('.js') >= 0) {
                DATA_HANDLER.renderDom(request.url.slice(1), 'application/javascript', httpHandler, 'utf-8');
            } else if (request.url.indexOf('.png') >= 0) {
                DATA_HANDLER.renderDom(request.url.slice(1), 'image/png', httpHandler, 'binary');
            } else if (request.url.indexOf('.ico') >= 0) {
                DATA_HANDLER.renderDom(request.url.slice(1), 'image/x-icon', httpHandler, 'binary');
            } else if (request.url.indexOf('/') >= 0) {
                DATA_HANDLER.renderDom('public/views/index.ejs', 'text/html', httpHandler, 'utf-8');
            } else {
                DATA_HANDLER.renderDom(`HEY! What you're looking for: It's not here!`, 'text/html', httpHandler, 'utf-8');
            }
        }).listen(PORT);
    }
}

module.exports = App;