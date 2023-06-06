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
const MAX_HEIGHT = FIELD_HEIGHT / BLK - 1;
const MAX_WIDTH = FIELD_WIDTH / BLK;
const CENTER = server_conf.CENTER;

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
        this.items = {};
        this.stage = new Stage();
        this.conf = {
            SERVER_NAME: SERVER_NAME,
            FIELD_WIDTH: FIELD_WIDTH,
            FIELD_HEIGHT: FIELD_HEIGHT,
            FPS: FPS,
            BLK: BLK,
            MAX_HEIGHT: MAX_HEIGHT,
            MAX_WIDTH: MAX_WIDTH,
            CENTER: CENTER,
        };
    }
    toJSON(){
        return Object.assign(super.toJSON(), {
            players: this.players,
            blocks: this.blocks,
            items: this.items,
            stage: this.stage,
            conf: this.conf,
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
        this.END_POINT = obj.END_POINT ? obj.END_POINT : FIELD_WIDTH;
    }
    collistion(oldX, oldY){
        let collision = false;
        if(this.x < 0 || this.x + this.width >= this.END_POINT || this.y < 0 || this.y + this.height >= FIELD_HEIGHT){
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

        let dis_x = distance * Math.cos(this.angle);
        let dis_y = distance * Math.sin(this.angle);
        this.x += dis_x;
        this.y += dis_y;

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
        this.view_x = 0;
        if(obj.id){ this.id = obj.id }

        this.menu = {
            name:       { x: BLK*1, y: BLK*1, v:this.nickname },
            score:      { x: BLK*1, y: BLK*2, v:0 },

            coin:       { x: BLK*5, y: BLK*2, v:0 },
            stage_name: { x: BLK*9, y: BLK*1, v:"WORLD" },
            stage_no:   { x: BLK*9, y: BLK*2, v:"1-1" },
            time_title: { x: BLK*13, y: BLK*1, v:"TIME" },
            time:       { x: BLK*13, y: BLK*2, v:300 },
        }

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
    collistion(oldX, oldY, oldViewX=this.view_x){
        let collision = false;
        if(this.x < 0 || this.x + this.width >= this.END_POINT || this.y < 0 || this.y + this.height >= FIELD_HEIGHT){
                collision = true;
        }
        if(this.intersectBlock(oldX, oldY)){
            collision = true;
        }
        if(collision){
            this.x = oldX; this.y = oldY;
            this.view_x = oldViewX;
        }
        return collision;
    }
    move(distance){
        const oldX = this.x, oldY = this.y;
        const oldViewX = this.view_x;

        let dis_x = distance * Math.cos(this.angle);
        let dis_y = distance * Math.sin(this.angle);
        if(this.x + dis_x <= this.view_x + CENTER){
            this.x += dis_x;
            this.y += dis_y;
        }else{
            this.view_x += dis_x;
            this.x += dis_x;
            this.y += dis_y;
        }

        let collision = this.collistion(oldX, oldY, oldViewX);
        if(!collision){
            Object.keys(ccdm.items).forEach((id)=>{
                if(ccdm.items[id] && this.intersect(ccdm.items[id])){
                    ccdm.items[id].touched = this.id;
                    this.menu.coin.v++;
                    delete ccdm.items[id];
                }
            });
        }
        return !collision;
    }
    intersectBlock(oldX, oldY){
        return Object.keys(ccdm.blocks).some((id)=>{
            if(this.intersect(ccdm.blocks[id])){
                if(oldY > this.y){
                    ccdm.blocks[id].touched = this.id;
                }
                return true;
            }
        });
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
            player_type: this.player_type,
            view_x: this.view_x,
            menu: this.menu,
        });
    }
}

class commonBlock extends PhysicsObject{
    constructor(obj={}){
        super(obj);
        this.attr = "Block";
        this.type = obj.type;
        this.height = BLK * 1;
        this.width = BLK;
        this.touched = null;
        this.bounding = false;
        this.effect = false;
    }
    toJSON(){
        return Object.assign(super.toJSON(),{
            type: this.type,
            attr: this.attr,
            touched: this.touched,
            bounding: this.bounding,
            effect: this.effect,
        });
    }
}
class hardBlock extends commonBlock{
    constructor(obj={}){
        super(obj);
        this.type = "hard";
        this.height = BLK * 2;
    }
}
class normalBlock extends commonBlock{
    constructor(obj={}){
        super(obj);
        this.type = "normal";
        this.bounding = true;
    }
}
class hatenaBlock extends commonBlock{
    constructor(obj={}){
        super(obj);
        this.type = "hatena";
        this.bounding = true;
        this.effect = 'coin';
    }
}
class dokanHeadBlock extends commonBlock{
    constructor(obj={}){
        super(obj);
        this.type = "dokan_head";
    }
}
class dokanBodyBlock extends commonBlock{
    constructor(obj={}){
        super(obj);
        this.type = "dokan_body";
    }
}
class commonItem extends PhysicsObject{
    constructor(obj={}){
        super(obj);
        this.attr = 'Item';
        this.type = obj.type;
        this.height = BLK * 1;
        this.width = BLK;
        this.touched = null;
    }
    toJSON(){
        return Object.assign(super.toJSON(),{
            type: this.type,
            attr: this.attr,
            touched: this.touched,
        });
    }
}
class coinItem extends commonItem{
    constructor(obj={}){
        super(obj);
        this.type = "coin";
    }
}
class commonEfect extends PhysicsObject{
    constructor(obj={}){
        super(obj);
        this.attr = 'Efect';
        this.type = obj.type;
        this.height = BLK * 1;
        this.width = BLK;
    }
    toJSON(){
        return Object.assign(super.toJSON(),{
            type: this.type,
            attr: this.attr,
        });
    }
}
class coinEfect extends commonItem{
    constructor(obj={}){
        super(obj);
        this.type = "coin";
    }
}
class Stage extends GeneralObject{
    constructor(obj={}){
        super(obj);
        this.no = obj.no;
        // height max 14, width max 500
        // height min 14, width min 16
        // mark{ 'b':hardblock '.': nothing 'n':normalblock}
        this.map = this.load_stage();
        this.END_POINT = this.map.length * BLK;
    }
    def(){
        let st = [];
        for(let x=0; x<MAX_WIDTH; x++){
            st.push([]);
            for(let y=0; y<MAX_HEIGHT; y++){
                if(y == MAX_HEIGHT - 1){
                    st[x].push('b');
                }else{
                    st[x].push('.');
                }
            }
        }
        return st;
    }
    load_stage(){
        let stage = fs.readFileSync(__dirname + '/conf/stages/s1.txt', 'utf-8');
        let lines = stage.split("\r\n");
        if(!this.chk_stage(lines)){
            return this.def();
        }
        let st = [];
        for(let x=0; x<lines[0].length; x++){
            st.push([]);
            for(let y=0; y<MAX_HEIGHT; y++){
                st[x].push(lines[y][x+1]);
            }
        }
        return st;
    }
    chk_stage(lines){
        if(lines.length != MAX_HEIGHT){
            logger.info(`No stage format. MAX_HEIGHT is ${MAX_HEIGHT}`);
            return false;
        }
        let before_col = null;
        let i = 0;
        lines.forEach((l)=>{
            let after_col = l.length;
            if(before_col && before_col != l.length){
                logger.info(`No stage format. line ${i}`);
                return false;
            }
            before_col = after_col;
            i++;
        });
        logger.info(`It's Good stage.`);
        return true;
    }
    toJSON(){
        return Object.assign(super.toJSON(),{
            no: this.no,
            map: this.map,
            END_POINT: this.END_POINT,
        });
    }
}

// ### ---
class GameMaster{
    constructor(){
        this.create_stage();
        logger.debug("game master.");
        // console.log(ccdm.stage.load_stage());
    }
    create_stage(){
        let x = 0;
        let y = 0;
        ccdm.stage.map.forEach((line)=>{
            y = 0;
            line.forEach((point)=>{
                if(point == 'b'){
                    let block = new hardBlock({
                        x: x * BLK,
                        y: y * BLK,
                    });
                    ccdm.blocks[block.id] = block;
                }
                if(point == 'n'){
                    let block = new normalBlock({
                        x: x * BLK,
                        y: y * BLK,
                    });
                    ccdm.blocks[block.id] = block;
                }
                if(point == 'H'){
                    let block = new hatenaBlock({
                        x: x * BLK,
                        y: y * BLK,
                    });
                    ccdm.blocks[block.id] = block;
                }
                if(point == 'D'){
                    let block = new dokanHeadBlock({
                        x: x * BLK,
                        y: y * BLK,
                    });
                    ccdm.blocks[block.id] = block;
                }
                if(point == 'd'){
                    let block = new dokanBodyBlock({
                        x: x * BLK,
                        y: y * BLK,
                    });
                    ccdm.blocks[block.id] = block;
                }
                if(point == 'c'){
                    let item = new coinItem({
                        x: x * BLK,
                        y: y * BLK,
                    });
                    ccdm.items[item.id] = item;
                }
                y++;
            });
            x++;
        });
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
            id: config.userid,
            END_POINT: ccdm.stage.END_POINT,
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

const time_max = 30 * 60 * 5;
let timer = 0;
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
    io.sockets.emit('menu-frame', ccdm);
    if(timer > time_max){
        io.sockets.emit('timer_sync', {timer: timer});
        timer = 0;
    }

    // send after
    Object.values(ccdm.blocks).forEach((block)=>{
        if(block.bounding && block.touched){
            block.touched = null;
        }
    });
    timer++;
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
    io.sockets.emit('timer_sync', {timer: 0});
    timer = 0;
    start_interval_game();
    // response.sendFile(path.join(__dirname, '/static/index.html'));
    response.render(path.join(__dirname, '/static/index.ejs'), app_param);
});

server.listen(server_conf.port, function() {
  logger.info(`Starting server on port ${server_conf.port}`);
  logger.info(`Server conf`);
  console.log(server_conf);
});
