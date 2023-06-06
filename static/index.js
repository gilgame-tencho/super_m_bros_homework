'use strict';

const socket = io();
const canvFT = $('#canvas-front')[0];
const cotxFT = canvFT.getContext('2d');
const canvMD = $('#canvas-middle')[0];
const cotxMD = canvMD.getContext('2d');
const canvBK = $('#canvas-back')[0];
const cotxBK = canvBK.getContext('2d');

let timer = 0;

const images = {};
images.player = {
    r: $('#img-player-r')[0],
    l: $('#img-player-l')[0],
}
images.bg = {
    feald: $('#img-map')[0],
}
images.piece = {
    hard: $('#img-hard-block')[0],
    normal: $('#img-normal-block')[0],
    hatena: $('#img-hatena-block')[0],
    dokan_head: $('#img-dokan-head-block')[0],
    dokan_body: $('#img-dokan-body-block')[0],

    hatena_f1: $('#img-hatena-block_f1')[0],
    hatena_f2: $('#img-hatena-block_f2')[0],
    hatena_f3: $('#img-hatena-block_f3')[0],
    hatena_f4: $('#img-hatena-block_f4')[0],

    coin: $('#img-coin-put')[0],
}
images.efect = {
    anime: $('#img-coin-front')[0],
    front: $('#img-coin-front')[0],
    c45w: $('#img-coin-45w')[0],
    c45u: $('#img-coin-45u')[0],
    yoko: $('#img-coin-yoko')[0],
}

const MY_USER_ID = Math.floor(Math.random()*1000000000);
function gameStart(){
    socket.emit('game-start', {
        nickname: $("#nickname").val(),
        userid: MY_USER_ID,
    });
    $("#start-screen").hide();
}
$("#start-button").on('click', gameStart);
gameStart();

let movement = {};
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
        socket.emit('movement', movement);
    }
    if(event.key === ' ' && event.type === 'keydown'){
        socket.emit('jamp');
    }
});

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
    cotxFT.lineWidth = 1;
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
function debug_show_object_line(cotx, obj){
    cotx.save();
    cotx.lineWidth = 1;
    cotx.strokeStyle = "#00aa00";
    cotx.beginPath();
    cotx.rect(obj.x, obj.y, obj.width, obj.height);
    cotx.stroke();
    cotx.restore();
}

// init -----
view_reset_all();

// -- timer --------
const FPS = 30;
socket.on('timer_sync', function(param) {
    console.log(`this.timer: ${timer},\tserver.timer:${param.timer}. timer is reset.`);
    timer = 0;
});
const self_timer = () => {
    // animation --------------------
    // hatena
    let hatena = ['hatena_f1', 'hatena_f2', 'hatena_f3', 'hatena_f4', 'hatena_f3', 'hatena_f2',];
    let frame = 5;
    let i = Math.floor(timer / frame) % hatena.length;
    console.log(`[self_timer] t:${timer}, i:${hatena[i]}`);
    images.block.hatena = images.block[hatena[i]];

    // coin
    let coin = [
        'yoko',
        'c45w',
        'front',
        'c45u',
    ];
    frame = 2;
    i = Math.floor(timer / frame) % coin.length;
    images.coin.anime = images.coin[coin[i]];

    timer++;
}
setInterval(self_timer, 1000/FPS);

// -- action param ---------
const efects = {};

// -- server action --------
socket.on('back-frame', function(ccdm) {
    view_reset_background();
});

socket.on('menu-frame', function(ccdm) {
    view_reset_front();

    const mymenu = ccdm.players[MY_USER_ID].menu;
    cotxFT.save();
    cotxFT.lineWidth = 3;
    cotxFT.strokeStyle = "#000000";
    cotxFT.font = "8px Bold 'ＭＳ ゴシック'";
    cotxFT.fillText(mymenu.name.v, mymenu.name.x, mymenu.name.y);
    cotxFT.fillText(`000010${mymenu.score.v}`, mymenu.score.x, mymenu.score.y);
    cotxFT.fillText(`C x 0${mymenu.coin.v}`, mymenu.coin.x, mymenu.coin.y);
    cotxFT.fillText(mymenu.stage_name.v, mymenu.stage_name.x, mymenu.stage_name.y);
    cotxFT.fillText(mymenu.stage_no.v, mymenu.stage_no.x, mymenu.stage_no.y);
    cotxFT.fillText(mymenu.time_title.v, mymenu.time_title.x, mymenu.time_title.y);
    cotxFT.fillText(mymenu.time.v, mymenu.time.x, mymenu.time.y);
    cotxFT.restore();
});

socket.on('state', function(ccdm) {
    view_reset_middle();
    const MARGIN = ccdm.conf.BLK * 3;

    let pieces = Object.assign(ccdm.blocks, ccdm.items);
    Object.values(pieces).forEach((piece) => {
        let param = {
            x: piece.x - ccdm.players[MY_USER_ID].view_x,
            y: piece.y,
            width: piece.width,
            height: piece.height,
        }
        if(piece.bounding && piece.touched && !efects[piece.id]){
            efects[piece.id] = piece;
            efects[piece.id].efect_step = 0;
        }
        if(efects[piece.id]){
            if(efects[piece.id].efect_step < 4){
                param.y -= efects[piece.id].efect_step * 1;
                efects[piece.id].efect_step++;
            }else if(efects[piece.id].efect_step < 6){
                param.y -= (6 - efects[piece.id].efect_step) * 1;
                efects[piece.id].efect_step++;
            }else{
                delete efects[piece.id];
            }
        }
        if(-MARGIN < param.x && param.x < ccdm.conf.FIELD_WIDTH + MARGIN ){
            drawImage(cotxMD, images.piece[piece.type], param);
        }
    });
    Object.values(ccdm.players).forEach((player) => {
        let img = images.player[player.direction];
        let param = {
            x: player.x - ccdm.players[MY_USER_ID].view_x,
            y: player.y,
            width: player.width,
            height: player.height,
        }
        if(-MARGIN < param.x && param.x < ccdm.conf.FIELD_WIDTH + MARGIN ){
            drawImage(cotxMD, img, param);
            // debug_show_object_line(cotxMD, player);

            if(player.socketId === socket.id){
                cotxMD.save();
                cotxMD.font = '8px Bold Arial';
                cotxMD.fillText('You', param.x + 2, param.y - 5);
                cotxMD.restore();
            }
        }
    });
});

socket.on('dead', () => {
    $("#start-screen").show();
});