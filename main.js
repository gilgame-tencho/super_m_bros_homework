'use strict';

const express = require('express');
const http = require('http');
const path = require('path');
const socketIO = require('socket.io');
const app = express();
app.set('view engine', 'ejs');
const server = http.Server(app);
const io = socketIO(server);
const fs = require('fs');
const yaml = require('yaml');

const STANDERD = require('./game_modules/standerd_modules.js');
const DB = require('./game_modules/database_modules.js');

const server_conf = yaml.parse(fs.readFileSync(__dirname + '/conf/server_conf.yml', 'utf-8'));

const SERVER_NAME = 'main';
const FIELD_WIDTH = server_conf.FIELD_WIDTH;
const FIELD_HEIGHT = server_conf.FIELD_HEIGHT;
const FPS = server_conf.FPS;

const GM = require('./gameClass.js');

const logger = STANDERD.logger({
    server_name: SERVER_NAME,
    log_level: server_conf.loglevel,
    name: this.constructor.name,
});

// init block. -----------------------------
const ccdm = new GM.CCDM();
const gameMtr = new GM.GameMaster();

io.on('connection', function(socket) {
    let player = null;
    socket.on('game-start', (config) => {
        console.log(`gameStart`);
        player = new GM.Player({
            socketId: socket.id,
            nickname: config.nickname,
        });
        ccdm.players[player.id] = player;
        io.sockets.emit('new-player', player);
    });
    socket.on('disconnect', () => {
        if(!player){return;}
        delete ccdm.players[player.id];
        player = null;
    });
});

// Server config. -----------
app.use('/static', express.static(__dirname + '/static'));

const app_param = {
    FIELD_HEIGHT: server_conf.FIELD_HEIGHT,
    FIELD_WIDTH: server_conf.FIELD_WIDTH,
}
app.get('/', (request, response) => {
    app_param.name = request.param('name');
    app_param.title = 'bros';
    response.render(path.join(__dirname, '/static/index.ejs'), app_param);
});

server.listen(server_conf.port, function() {
  logger.info(`Starting server on port ${server_conf.port}`);
});
