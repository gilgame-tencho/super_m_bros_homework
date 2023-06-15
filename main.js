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

const server_conf = Object.assign(
    yaml.parse(fs.readFileSync(__dirname + '/conf/server_conf.yml', 'utf-8')),
    yaml.parse(fs.readFileSync(__dirname + '/conf/apl_conf.yml', 'utf-8')),
);

const SERVER_NAME = 'main';
const FIELD_WIDTH = server_conf.FIELD_WIDTH;
const FIELD_HEIGHT = server_conf.FIELD_HEIGHT;
const FPS = server_conf.FPS;
const BLK = server_conf.BLOCK;
const DEAD_LINE = FIELD_HEIGHT + BLK * 1;
const DEAD_END = FIELD_HEIGHT + BLK * 3;
const MAX_HEIGHT = FIELD_HEIGHT / BLK - 1;
const MAX_WIDTH = FIELD_WIDTH / BLK;
const CENTER = server_conf.CENTER;
const CMD_HIS = 5;

const CONF = {
    SERVER_NAME: SERVER_NAME,
    FIELD_WIDTH: FIELD_WIDTH,
    FIELD_HEIGHT: FIELD_HEIGHT,
    FPS: FPS,
    BLK: BLK,
    DEAD_LINE: DEAD_LINE,
    DEAD_END: DEAD_END,
    MAX_HEIGHT: MAX_HEIGHT,
    MAX_WIDTH: MAX_WIDTH,
    CENTER: CENTER,
    CMD_HIS: CMD_HIS,
}
Object.keys(server_conf).forEach((key)=>{
    if(CONF[key]){ return }
    CONF[key] = server_conf[key];
});

const GM = require('./gameClass.js');
const { log } = require('console');

const logger = STANDERD.logger({
    server_name: SERVER_NAME,
    log_level: server_conf.loglevel,
    name: this.constructor.name,
});

// init block. -----------------------------
const ccdm = GM.ccdm;
const gameMtr = GM.gameMtr;

io.on('connection', function(socket) {
    socket.on('init', (config) => {
        logger.info("init call.");
        io.sockets.emit('init', CONF);
    });

    let player = null;
    socket.on('game-start', (config) => {
        console.log(`gameStart`);
        player = new GM.Player({
            socketId: socket.id,
            nickname: config.nickname,
            id: config.id,
            END_POINT: ccdm.stage.END_POINT,
            x: BLK * 2,
            y: FIELD_HEIGHT * 0.5,
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
    app_param.conf = CONF;
    response.render(path.join(__dirname, '/static/index.ejs'), app_param);
});

server.listen(server_conf.port, function() {
  logger.info(`Starting server on port ${server_conf.port}`);
  logger.info(`Server conf`);
  console.log(server_conf);
});
