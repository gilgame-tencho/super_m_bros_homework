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
const BLK = server_conf.BLOCK;

const logger = STANDERD.logger({
    server_name: SERVER_NAME,
    log_level: server_conf.loglevel,
    name: this.constructor.name,
});


class ClientCommonDataManager{
    constructor(obj={}){
        this.id = Math.floor(Math.random()*1000000000);
    }
    toJSON(){
        return {
            id: this.id,
        };
    }
}
class CCDM extends ClientCommonDataManager{
    constructor(obj={}){
        super(obj);
        this.players = {};
        this.blocks = {};
    }
    toJSON(){
        return Object.assign(super.toJSON(), {
            players: this.players,
            blocks: this.blocks,
        });
    }
}

class OriginObject{
    constructor(obj={}){
        this.id = Math.floor(Math.random()*1000000000);
        this.logger = STANDERD.logger({
            server_name: SERVER_NAME,
            log_level: server_conf.loglevel,
            name: this.constructor.name,
        });
    }
    toJSON(){
        return {
            id: this.id,
            x: this.x,
            y: this.y,
            width: this.width,
            height: this.height,
        };
    }
}
class PhysicsObject extends OriginObject{
    constructor(obj={}){
        super(obj);
        this.x = obj.x;
        this.y = obj.y;
        this.width = obj.width;
        this.height = obj.height;
    }
    toJSON(){
        return Object.assign(super.toJSON(), {
            x: this.x,
            y: this.y,
            width: this.width,
            height: this.height,
        });
    }
}
class GeneralObject extends OriginObject{
    constructor(obj={}){
        super(obj);
        this.name = obj.name;
    }
    toJSON(){
        return Object.assign(super.toJSON(), {
            name: this.name,
        });
    }
}
class GameObject extends PhysicsObject{
    constructor(obj={}){
        super(obj);
        this.angle = obj.angle;
        this.direction = obj.direction;
    }
    collistion(oldX, oldY){
        let collision = false;
        if(this.x < 0 || this.x + this.width >= FIELD_WIDTH || this.y < 0 || this.y + this.height >= FIELD_HEIGHT){
            collision = true;
        }
        if(this.intersectBlock()){
            collision = true;
        }
        if(collision){
            this.x = oldX; this.y = oldY;
        }
        return collision;
    }
    move(distance){
        const oldX = this.x, oldY = this.y;

        this.x += distance * Math.cos(this.angle);
        this.y += distance * Math.sin(this.angle);

        return !this.collistion(oldX, oldY);
    }
    fall(distance){
        const oldX = this.x, oldY = this.y;

        this.y += distance;

        return !this.collistion(oldX, oldY);
    }
    rise(distance){
        const oldX = this.x, oldY = this.y;

        this.y -= distance;

        return !this.collistion(oldX, oldY);
    }
    intersect(obj){
        return (this.x < obj.x + obj.width) &&
            (this.x + this.width > obj.x) &&
            (this.y < obj.y + obj.height) &&
            (this.y + this.height > obj.y);
    }
    intersectBlock(){
        return Object.keys(ccdm.blocks).some((id)=>{
            if(this.intersect(ccdm.blocks[id])){
                return true;
            }
        });
    }
    toJSON(){
        return Object.assign(super.toJSON(), {
            angle: this.angle,
            direction: this.direction,
        });
    }
}

class Player extends GameObject{
    constructor(obj={}){
        super(obj);
        this.socketId = obj.socketId;
        this.nickname = obj.nickname;
        this.player_type = 'player';

        this.movement = {};

        this.width = BLK;
        this.height = BLK;
        this.x = BLK * 2;
        this.y = FIELD_HEIGHT * 0.5 - this.height;
        this.angle = 0;
        this.direction = 'r';  // direction is right:r, left:l;
        this.jampping = 0;
        this.flg_fly = true;

        this.gravity_func = ()=>{
            this.fall(server_conf.fall_speed);
        }
        this.gravity_timer = setInterval(this.gravity_func, 1000/FPS);
    }
    fall(distance){
        this.flg_fly = super.fall(distance);
        return this.flg_fly;
    }
    jump(){
        if(this.jampping > 0 || this.flg_fly){ return }

        this.flg_fly = true;
        this.jampping = server_conf.jamp_power * BLK;
        clearInterval(this.gravity_timer);
        this.jampping_timer = setInterval(()=>{
            if(this.rise(server_conf.jamp_speed)){
                this.jampping -= server_conf.jamp_speed;
            }else{
                this.jampping = 0;
            }
            if(this.jampping <= 0){
                this.jampping = 0;
                this.gravity_timer = setInterval(this.gravity_func, 1000/FPS);
                clearInterval(this.jampping_timer);
            }
        }, 1000/FPS);
    }
    remove(){
        delete players[this.id];
        io.to(this.socketId).emit('dead');
    }
    toJSON(){
        return Object.assign(super.toJSON(), {
            socketId: this.socketId,
            nickname: this.nickname,
            player_type: this.player_type
        });
    }
}

class commonBlock extends PhysicsObject{
    constructor(obj={}){
        super(obj);
        this.type = obj.type;
    }
    toJSON(){
        return Object.assign(super.toJSON(),{
            type: this.type,
        });
    }
}
class hardBlock extends commonBlock{
    constructor(obj={}){
        super(obj);
        this.type = "hard";
    }
}
class normalBlock extends commonBlock{
    constructor(obj={}){
        super(obj);
        this.type = "normal";
    }
}

// ### ---
class GameMaster{
    constructor(){
        this.start();
    }
    start(){
        // ground
        let param = {
            x: 0,
            y: server_conf.FIELD_HEIGHT - BLK * 2,
            height: BLK * 2,
            width: BLK * 1,
        }
        for(let i=0; i<server_conf.FIELD_WIDTH; i+=BLK){
            param.x = i;
            let block = new hardBlock(param);
            ccdm.blocks[block.id] = block;
        }
        param = {
            x: BLK * 9,
            y: server_conf.FIELD_HEIGHT - BLK * (2 + 4),
            height: BLK * 1,
            width: BLK * 1,
        }
        for(let i=param.x; i<server_conf.FIELD_WIDTH; i+=BLK){
            param.x = i;
            let block = new normalBlock(param);
            ccdm.blocks[block.id] = block;
        }
    }
}

// init block. -----------------------------
const ccdm = new CCDM();
const gameMtr = new GameMaster();

io.on('connection', function(socket) {
    let player = null;
    socket.on('game-start', (config) => {
        player = new Player({
            socketId: socket.id,
            nickname: config.nickname,
        });
        ccdm.players[player.id] = player;
    });
    socket.on('movement', function(movement) {
        if(!player || player.health===0){return;}
        player.movement = movement;
    });
    socket.on('jamp', function(){
        player.jump();
    });
    socket.on('disconnect', () => {
        if(!player){return;}
        delete ccdm.players[player.id];
        player = null;
    });
});

const interval_game = () => {
    Object.values(ccdm.players).forEach((player) => {
        const movement = player.movement;
        if(movement.forward){
            player.move(server_conf.move_speed);
        }
        if(movement.back){
            player.move(-server_conf.move_speed);
        }
        if(movement.left){
            player.angle = Math.PI * 1;
            player.direction = 'l';
            player.move(server_conf.move_speed);
        }
        if(movement.right){
            player.angle = Math.PI * 0;
            player.direction = 'r';
            player.move(server_conf.move_speed);
        }
        if(movement.up){
        }
        if(movement.down){
        }
    });
    io.sockets.emit('state', ccdm);
}

function start_interval_game(){
    setInterval(interval_game, 1000/FPS);
}

// Server config. -----------
app.use('/static', express.static(__dirname + '/static'));

const app_param = {
    FIELD_HEIGHT: server_conf.FIELD_HEIGHT,
    FIELD_WIDTH: server_conf.FIELD_WIDTH,
}
app.get('/', (request, response) => {
    app_param.name = request.param('name');
    app_param.title = 'bros';
    start_interval_game();
    // response.sendFile(path.join(__dirname, '/static/index.html'));
    response.render(path.join(__dirname, '/static/index.ejs'), app_param);
});

server.listen(server_conf.port, function() {
  logger.info(`Starting server on port ${server_conf.port}`);
  logger.info(`Server conf`);
  console.log(server_conf);
});
