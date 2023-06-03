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
}

function gameStart(){
    socket.emit('game-start', {nickname: $("#nickname").val() });
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
});

socket.on('state', function(ccdm) {
    view_reset_middle();

    Object.values(ccdm.blocks).forEach((block) => {
        drawImage(cotxMD, images.block[block.type], block);
        // debug_show_object_line(cotxMD, block);
    });
    Object.values(ccdm.players).forEach((player) => {
        let img = images.player[player.direction];
        drawImage(cotxMD, img, player);
        // debug_show_object_line(cotxMD, player);

        if(player.socketId === socket.id){
            cotxMD.save();
            cotxMD.font = '8px Bold Arial';
            cotxMD.fillText('You', player.x + 2, player.y - 5);
            cotxMD.restore();
        }
    });
});

socket.on('dead', () => {
    $("#start-screen").show();
});