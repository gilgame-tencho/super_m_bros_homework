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
    mushroom: $('#img-mushroom')[0],

    kuribo: $('#img-enemy-kuribo')[0],
}
images.effect = {
    anime: $('#img-coin-anime-front')[0],
    front: $('#img-coin-anime-front')[0],
    c45w: $('#img-coin-anime-45w')[0],
    c45u: $('#img-coin-anime-45u')[0],
    yoko: $('#img-coin-anime-yoko')[0],
}
images.goal = {
    top: $('#img-goal-top')[0],
    flag: $('#img-goal-flag')[0],
    pole: $('#img-goal-pole')[0],
}

let my_player;
let movement = {};

const MY_USER_ID = Math.floor(Math.random()*1000000000);
const MARGIN = CONF.BLK * 3;

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

function is_draw(obj){
    return (-CONF.MARGIN < obj.x && obj.x < CONF.FIELD_WIDTH + CONF.MARGIN)
}

// init -----
view_reset_all();

// -- timer --------
const switch_animetion = () => {
    // animation --------------------
    // hatena
    let hatena = ['hatena_f1', 'hatena_f2', 'hatena_f3', 'hatena_f4', 'hatena_f3', 'hatena_f2',];
    let frame = 5;
    let i = Math.floor(timer / frame) % hatena.length;
    // console.log(`[self_timer] t:${timer}, i:${hatena[i]}`);
    images.piece.hatena = images.piece[hatena[i]];

    // coin
    let coin = [
        'yoko',
        'c45w',
        'front',
        'c45u',
    ];
    frame = 2;
    i = Math.floor(timer / frame) % coin.length;
    // images.effect.anime = images.effect.anime[coin[i]];

    timer++;
}
// setInterval(self_timer, 1000/FPS);

// -- action param ---------
const effects = {
    bounding: {},
    coin: {},
};

// -- server action --------
socket.on('back-frame', function() {
    view_reset_background();
});

socket.on('menu-frame', function() {
});

const menu_frame = () => {
    view_reset_front();
    if(!ccdm.players[MY_USER_ID]){ return }

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
}
// socket.on('state', function(ccdm) {
const draw_view = function(){
    view_reset_middle();
    let VIEW_X = 0;
    if(ccdm.players[MY_USER_ID]){
        VIEW_X = ccdm.players[MY_USER_ID].view_x;
    }

    let pieces = {};
    Object.assign(pieces, ccdm.blocks);
    Object.assign(pieces, ccdm.items);
    Object.assign(pieces, ccdm.enemys);

    Object.values(pieces).forEach((piece) => {
        let param = {
            x: piece.x - VIEW_X,
            y: piece.y,
            width: piece.width,
            height: piece.height,
        }
        // bounding -----------------
        if(piece.bounding && piece.touched && !effects.bounding[piece.id]){
            effects.bounding[piece.id] = piece;
            effects.bounding[piece.id].effect_step = 0;
        }
        if(effects.bounding[piece.id]){
            if(effects.bounding[piece.id].effect_step < 4){
                param.y -= effects.bounding[piece.id].effect_step * 1;
                effects.bounding[piece.id].effect_step++;
            }else if(effects.bounding[piece.id].effect_step < 6){
                param.y -= (6 - effects.bounding[piece.id].effect_step) * 1;
                effects.bounding[piece.id].effect_step++;
            }else{
                delete effects.bounding[piece.id];
            }
        }
        // effect coin -----------------
        if(piece.effect == 'coin' && piece.touched && !effects.coin[piece.id]){
            effects.coin[piece.id] = piece;
            effects.coin[piece.id].effect_step = 0;
            effects.coin[piece.id].y -= 8;
        }
        if(effects.coin[piece.id]){
            let coin_img = [
                'yoko',
                'c45u',
                'c45w',
            ];
            let coin = effects.coin[piece.id];
            if(coin.effect_step < 6){
                coin.y -= coin.effect_step * 1;
            }else if(coin.effect_step < 12){
                coin.y -= (12 - coin.effect_step) * 1;
            }
            let param = {
                x: coin.x - VIEW_X,
                y: coin.y,
                width: coin.width,
                height: coin.height,
            }
            if(coin.effect_step < 12){
                console.log("coin.effect_step");
                console.log(images.effect.anime);
                let img = coin_img[coin.effect_step % coin_img.length];
                drawImage(cotxMD, images.effect[img], param);
                coin.effect_step++
            }else{
                delete effects.coin[piece.id];
            }
        }
        // effect mushroom ------------

        if(piece.sleep){
            return
        }
        if(is_draw(param)){
            drawImage(cotxMD, images.piece[piece.type], param);
        }
    });
    Object.values(ccdm.players).forEach((player) => {
        let img = images.player[player.direction];
        let param = {
            x: player.x - VIEW_X,
            y: player.y,
            width: player.width,
            height: player.height,
        }
        if(is_draw(param)){
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
    let goal = ccdm.goal;
    if(!goal){ return }
    goal.x = goal.x - VIEW_X;
    if(is_draw(goal)){
        let param = {
            x: goal.x,
            y: goal.y,
            width: goal.width,
            height: goal.height,
        }
        drawImage(cotxMD, images.goal.top, param);
        for(let i=0; i<goal.pole; i++){
            param.y += CONF.BLK;
            drawImage(cotxMD, images.goal.pole, param);
            if(i==0){
                drawImage(cotxMD, images.goal.flag, param);
            }
        }
        param.y += CONF.BLK;
        drawImage(cotxMD, images.piece.normal, param);
    }
}

const main_frame = () => {
    // ### chain block ####
    let front_view_x = CONF.FIELD_WIDTH;
    Object.values(ccdm.players).forEach((player) => {
        // frame
        player.frame();

        if(front_view_x < player.view_x + CONF.FIELD_WIDTH){
            front_view_x = player.view_x + CONF.FIELD_WIDTH;
        }
    });
    Object.values(ccdm.enemys).forEach((enemy)=>{
        if(enemy.x < front_view_x){
            enemy.sleep = false;
        }
        if(enemy.sleep){ return }

        enemy.self_move();
        Object.values(ccdm.players).forEach((player)=>{
            if(enemy.intersect(player)){
                player.respone();
            }
        });
    });
    // ### calculate ####
    let pieces = Object.assign({}, ccdm.blocks, ccdm.items);
    Object.values(pieces).forEach((piece)=>{
        if(!piece.effect || !piece.touched){
            return
        }
        if(piece.effect == 'coin'){
            logger.debug(`is coin.`);
            console.log(piece);
            ccdm.players[piece.touched].menu.coin.v++;
        }
        if(piece.effect == 'mushroom'){
            logger.debug(`is mushroom.`);
            console.log(piece);
            let param = {
                x: piece.x,
                y: piece.y - CONF.BLK,
            }
            let item = new mushroomItem(param);
            ccdm.items[item.id] = item;
        }
    });
    // ### send after ####
    Object.values(ccdm.blocks).forEach((block)=>{
        if(block.bounding && block.touched){
            block.touched = null;
        }
    });
}

let start_flg = false;

const interval_game = () => {
    start_flg = true;
    switch_animetion();
    main_frame();
    draw_view();
    // menu_frame();
}

function gameStart(){
    console.log(`gameStart`);
    socket.emit('game-start', {
        nickname: $("#nickname").val(),
        userid: MY_USER_ID,
    });
}

socket.on('new-player', function(param) {
    console.log(`call new-player`);
    $("#start-screen").hide();
    my_player = new Player({
        socketId: param.socketId,
        nickname: param.nickname,
        id: param.id,
        END_POINT: param.END_POINT,
        x: param.x,
        y: param.y,
    });
    ccdm.players[my_player.id] = my_player;
    if(!start_flg){
        console.log("start interval");
        setInterval(interval_game, 1000/CONF.FPS);
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
        'b': 'dash',
        ' ': 'jump',
    };
    const command = KeyToCommand[event.key];
    if(command){
        if(event.type === 'keydown'){
            movement[command] = true;
        }else{ /* keyup */
            movement[command] = false;
        }
        my_player.movement = movement;
    }
});

socket.on('dead', () => {
    $("#start-screen").show();
});