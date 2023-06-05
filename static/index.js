'use strict';

const socket = io();
const canvFT = $('#canvas-front')[0];
const cotxFT = canvFT.getContext('2d');
const canvMD = $('#canvas-middle')[0];
const cotxMD = canvMD.getContext('2d');
const canvBK = $('#canvas-back')[0];
const cotxBK = canvBK.getContext('2d');

const images = {};
images.player = {
    r: $('#img-player-r')[0],
    l: $('#img-player-l')[0],
}
images.bg = {
    feald: $('#img-map')[0],
}
images.block = {
    hard: $('#img-hard-block')[0],
    normal: $('#img-normal-block')[0],
    hatena: $('#img-hatena-block')[0],
    dokan_head: $('#img-dokan-head-block')[0],
    dokan_body: $('#img-dokan-body-block')[0],
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

// ----------
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

    Object.values(ccdm.blocks).forEach((block) => {
        let param = {
            x: block.x - ccdm.players[MY_USER_ID].view_x,
            y: block.y,
            width: block.width,
            height: block.height,
        }
        if(-MARGIN < param.x && param.x < ccdm.conf.FIELD_WIDTH + MARGIN ){
            drawImage(cotxMD, images.block[block.type], param);
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