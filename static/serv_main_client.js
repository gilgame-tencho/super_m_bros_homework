'use strict';

const socket = io();
const canvFT = $('#canvas-front')[0];
const cotxFT = canvFT.getContext('2d');
const canvMD = $('#canvas-middle')[0];
const cotxMD = canvMD.getContext('2d');
const canvBK = $('#canvas-back')[0];
const cotxBK = canvBK.getContext('2d');

const images = {};
images.player = $('#player-image')[0];
images.bg = {
    feald: $('#map')[0],
}
const SERVER_NAME = 'main';
const FIELD_WIDTH = 256;
const FIELD_HEIGHT = 240;
const FPS = 60;
const move_score = 10;


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
    }
    toJSON(){
        return Object.assign(super.toJSON(), {
            players: this.players,
        });
    }
}

class OriginObject{
    constructor(obj={}){
        this.id = Math.floor(Math.random()*1000000000);
        // this.logger = STANDERD.logger({
        //     server_name: SERVER_NAME,
        //     log_level: server_conf.loglevel,
        //     name: this.constructor.name,
        // });
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
    move(distance){
        const oldX = this.x, oldY = this.y;

        this.x += distance * Math.cos(this.angle);
        this.y += distance * Math.sin(this.angle);

        let collision = false;
        if(this.x < 0 || this.x + this.width >= FIELD_WIDTH || this.y < 0 || this.y + this.height >= FIELD_HEIGHT){
            collision = true;
        }
        if(collision){
            this.x = oldX; this.y = oldY;
        }
        return !collision;
    }
    intersect(obj){
        return (this.x <= obj.x + obj.width) &&
            (this.x + this.width >= obj.x) &&
            (this.y <= obj.y + obj.height) &&
            (this.y + this.height >= obj.y);
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

        this.width = 16;
        this.height = 16;
        this.x = FIELD_WIDTH * 0.5 - this.width;
        this.y = FIELD_HEIGHT * 0.5 - this.height;
        this.angle = 0;
        this.direction = 0;  // direction is right:0, left:1;
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
// ### ---
class GameMaster{
    constructor(){
        this.start();
    }
    start(){
    }
}

let my_player;
let movement = {};

const ccdm = new CCDM();
const gameMtr = new GameMaster();

function drawImage(ctt, img, px, py=null, pw=null, ph=null){
    let x; let y; let w; let h;
    if(py == null){
        x = px.x; y = px.y;
        w = px.width; h = px.height;
    }else if(ph == null){
        x = px; y = py;
        w = pw.width; h = pw.height;
    }else{
        x = px; y = py;
        w = pw; h = ph;
    }
    ctt.drawImage(
        img,
        0, 0, img.width, img.height,
        x, y, w, h
    );
}

function view_reset_front(){
    cotxFT.clearRect(0, 0, canvFT.width, canvFT.height);
    cotxFT.lineWidth = 10;
    cotxFT.beginPath();
    cotxFT.rect(0, 0, canvFT.width, canvFT.height);
    cotxFT.stroke();
}
function view_reset_middle(){
    cotxMD.clearRect(0, 0, canvMD.width, canvMD.height);
}
function view_reset_background(){
    cotxBK.clearRect(0, 0, canvBK.width, canvBK.height);
    drawImage(cotxBK, images.bg.feald, 0, 0, canvBK.width, canvBK.height);
}
function view_reset_all(){
    view_reset_front();
    view_reset_middle();
    view_reset_background();
}

// init -----
view_reset_all();

// ----------
socket.on('back-frame', function() {
    view_reset_background();
});

socket.on('menu-frame', function() {
    view_reset_front();
});

// socket.on('state', function(ccdm) {
const draw_view = function(){
    view_reset_middle();

    Object.values(ccdm.players).forEach((player) => {
        cotxMD.save();
        drawImage(cotxMD, images.player, player);
        cotxMD.restore();

        if(player.socketId === socket.id){
            cotxMD.save();
            cotxMD.font = '8px Bold Arial';
            cotxMD.fillText('You', player.x + 2, player.y - 5);
            cotxMD.restore();
        }
    });
}

const main_frame = () => {
    Object.values(ccdm.players).forEach((player) => {
        const movement = player.movement;
        if(movement.forward){
            player.move(move_score);
        }
        if(movement.back){
            player.move(-move_score);
        }
        if(movement.left){
            player.angle = Math.PI * 1;
            player.move(move_score);
        }
        if(movement.right){
            player.angle = Math.PI * 0;
            player.move(move_score);
        }
        if(movement.up){
        }
        if(movement.down){
        }
    });
}

let start_flg = false;

const interval_game = () => {
    start_flg = true;
    main_frame();
    draw_view();
}

function gameStart(){
    console.log(`gameStart`);
    socket.emit('game-start', {nickname: $("#nickname").val() });

}

socket.on('new-player', function(param) {
    console.log(`call new-player`);
    $("#start-screen").hide();
    my_player = new Player({
        socketId: param.socketId,
        nickname: param.nickname,
    });
    ccdm.players[my_player.id] = my_player;
    if(!start_flg){
        setInterval(interval_game, 1000/FPS);
    }
});
// $("#start-button").on('click', gameStart);

gameStart();

$(document).on('keydown keyup', (event) => {
    const KeyToCommand = {
        'ArrowUp': 'up',
        'ArrowDown': 'down',
        'ArrowLeft': 'left',
        'ArrowRight': 'right',
    };
    const command = KeyToCommand[event.key];
    if(command){
        if(event.type === 'keydown'){
            movement[command] = true;
        }else{ /* keyup */
            movement[command] = false;
        }
        my_player.movement = movement;
        // socket.emit('movement', movement);
    }
});

socket.on('dead', () => {
    $("#start-screen").show();
});