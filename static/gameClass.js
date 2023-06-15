console.log("Load gameClass");

console.log(CONF);
console.log("CONF test");

// const SERVER_NAME = 'main';
// const FIELD_WIDTH = 256;
// const FIELD_HEIGHT = 240;
// const FPS = 60;
// const move_speed = 4;
// const fall_speed = 8;
// const jamp_speed = 8;
// const jamp_power = 5;
// const BLK = 16;
// const DEAD_LINE = FIELD_HEIGHT + BLK * 1;
// const DEAD_END = FIELD_HEIGHT + BLK * 3;
// const MAX_HEIGHT = FIELD_HEIGHT / BLK - 1;
// const MAX_WIDTH = FIELD_WIDTH / BLK;
// const CENTER = 8;
// const CMD_HIS = 5;

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
        this.enemys = {};
        this.blocks = {};
        this.items = {};
        this.stage = new Stage();
        this.goal = null;
    }
    toJSON(){
        return Object.assign(super.toJSON(), {
            players: this.players,
            enemys: this.enemys,
            blocks: this.blocks,
            items: this.items,
            stage: this.stage,
            goal: this.goal,
        });
    }
}

class OriginObject{
    constructor(obj={}){
        this.id = Math.floor(Math.random()*1000000000);
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
        this.END_POINT = obj.END_POINT ? obj.END_POINT : CONF.FIELD_WIDTH;
    }
    collistion(oldX, oldY){
        let collision = false;
        if(this.intersectField()){
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
    intersectField(){
        return (
            this.x < 0 ||
            this.x + this.width >= this.END_POINT ||
            this.y < 0 ||
            this.y + this.height >= CONF.DEAD_END
        )
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
        this.speed = 1;
        this.dead_flg = false;
        if(obj.id){ this.id = obj.id }

        this.menu = {
            name:       { x: CONF.BLK*1, y: CONF.BLK*1, v:this.nickname },
            score:      { x: CONF.BLK*1, y: CONF.BLK*2, v:0 },

            coin:       { x: CONF.BLK*5, y: CONF.BLK*2, v:0 },
            stage_name: { x: CONF.BLK*9, y: CONF.BLK*1, v:"WORLD" },
            stage_no:   { x: CONF.BLK*9, y: CONF.BLK*2, v:"1-1" },
            time_title: { x: CONF.BLK*13, y: CONF.BLK*1, v:"TIME" },
            time:       { x: CONF.BLK*13, y: CONF.BLK*2, v:300 },
        }

        this.movement = {};

        this.width = CONF.BLK;
        this.height = CONF.BLK;
        this.angle = 0;
        this.direction = 'r';  // direction is right:r, left:l;
        this.jampping = 0;
        this.jump_count = 0;
        this.flg_fly = true;
        this.cmd_his = []; //command history. FIFO.
        for(let i=0; i<CONF.CMD_HIS; i++){
            this.cmd_his.push({});
        }
    }
    command(param){
        this.movement = param;
    }
    frame(){
        let command = this.movement;
        // console.log(this.cmd_his);
        // movement
        if(command.forward){
            this.move(CONF.move_speed);
        }
        if(command.back){
            this.move(-CONF.move_speed);
        }
        if(command.left){
            this.angle = Math.PI * 1;
            this.direction = 'l';
            this.move(CONF.move_speed);
        }
        if(command.right){
            this.angle = Math.PI * 0;
            this.direction = 'r';
            this.move(CONF.move_speed);
        }
        if(command.up){
        }
        if(command.down){
        }

        // dash
        if(command.dash){
            this.dash(true);
        }else{
            this.dash(false);
        }

        if(command.jump){
            this.jump();
        }else{
            this.jump_count = 0;
        }
        if(this.jampping > 0){
            this.hopping();
        }else{
            this.fall(CONF.fall_speed);
        }

        // command reflesh.
        this.cmd_his.push(command);
        if(this.cmd_his.length > CONF.CMD_HIS){
            this.cmd_his.shift();
        }
    }
    collistion(oldX, oldY, oldViewX=this.view_x){
        let collision = false;
        if(this.intersectField()){
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
        // if(this.dead_flg){ return };
        const oldX = this.x, oldY = this.y;
        const oldViewX = this.view_x;

        let range = distance * this.speed;
        let dis_x = range * Math.cos(this.angle);
        let dis_y = range * Math.sin(this.angle);
        if(this.x + dis_x <= this.view_x + CONF.CENTER){
            this.x += dis_x;
            this.y += dis_y;
        }else{
            this.view_x += dis_x;
            this.x += dis_x;
            this.y += dis_y;
        }

        let collision = this.collistion(oldX, oldY, oldViewX);

        this.isDead();

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
    isDead(){
        let dead_flg = false;
        if(this.y > CONF.DEAD_LINE){
            dead_flg = true;
        }

        if(dead_flg){
            this.dead_flg = true;
            this.respone();
        }
    }
    fall(distance){
        this.flg_fly = super.fall(distance);
        return this.flg_fly;
    }
    jump(){
        if(this.jampping <= 0 && !this.flg_fly && this.jump_count == 0){
            this.flg_fly = true;
            this.jampping = 2 * BLK;
            this.jump_count = 1;
        }else if( this.jump_count == 1){
            this.jump_count = 2;
        }else if( this.jump_count == 2){
            this.jampping += 1.5 * BLK;
            this.jump_count = 3;
        }else if( this.jump_count == 3){
            this.jump_count = 4;
        }else if( this.jump_count == 4){
            this.jampping += 1.5 * BLK;
            this.jump_count = 5;
        }else{
            this.jump_count = 0;
        }
    }
    hopping(){
        if(this.rise(CONF.jamp_speed)){
            this.jampping -= CONF.jamp_speed;
        }else{
            this.jampping = 0;
        }
        if(this.jampping <= 0){
            this.jampping = 0;
        }
    }
    dash(sw){
        if(sw){
            this.speed = 1 * 1.5;
        }else{
            this.speed = 1;
        }
    }
    remove(){
        delete players[this.id];
        io.to(this.socketId).emit('dead');
    }
    respone(){
        // delete ccdm.players[this.id];
        this.x = CONF.BLK * 2;
        this.y = CONF.FIELD_HEIGHT * 0.5;
        this.view_x = 0;
        this.dead_flg = false;
    }
    toJSON(){
        return Object.assign(super.toJSON(), {
            socketId: this.socketId,
            nickname: this.nickname,
            player_type: this.player_type,
            view_x: this.view_x,
            menu: this.menu,
            dead_flg: this.dead_flg,
        });
    }
}
class Enemy extends Player{
    constructor(obj={}){
        super(obj);
        this.player_type = 'enemy';
        this.enemy_type = 'kuribo';
        this.type = 'kuribo';
        this.angle = Math.PI * 1;
        this.direction = 'l';
        this.END_POINT = ccdm.stage.END_POINT;
        this.sleep = true;
        this.mm = 0;
    }
    self_move(){
        if(this.sleep){ return }

        let speed = Math.floor(move_speed / 3);
        if(!this.move(speed)){
            if(this.direction == 'l'){
                this.direction = 'r';
                this.angle = Math.PI * 0;
            }else{
                this.direction = 'l';
                this.angle = Math.PI * 1;
            }
        }
        this.fall(fall_speed);
    }
    move(distance){

        const oldX = this.x, oldY = this.y;

        let dis_x = distance * Math.cos(this.angle);
        let dis_y = distance * Math.sin(this.angle);
        this.x += dis_x;
        this.y += dis_y;

        let collision = this.collistion(oldX, oldY);
        // logger.debug(`Enemy is move! collision:${collision}`);

        return !collision;
    }
    respone(){
    }
    toJSON(){
        return Object.assign(super.toJSON(), {
            enemy_type: this.enemy_type,
            type: this.type,
        });
    }
}

class commonBlock extends PhysicsObject{
    constructor(obj={}){
        super(obj);
        this.attr = "Block";
        this.type = obj.type;
        this.height = CONF.BLK * 1;
        this.width = CONF.BLK;
        this.touched = null;
        this.bounding = false;
        this.effect = false;
        this.event = false;
    }
    toJSON(){
        return Object.assign(super.toJSON(),{
            type: this.type,
            attr: this.attr,
            touched: this.touched,
            bounding: this.bounding,
            effect: this.effect,
            event: this.event,
        });
    }
}
class hardBlock extends commonBlock{
    constructor(obj={}){
        super(obj);
        this.type = "hard";
        this.height = CONF.BLK * 2;
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
        this.effect = obj.effenct ? obj.effect : 'coin';
    }
}
class goalBlock extends commonBlock{
    constructor(obj={}){
        super(obj);
        this.type = "goal";
        this.height = CONF.BLK * 1;
        this.top = 1;
        this.flag = 1;
        this.pole = 9;
        this.block = 1;
    }
    toJSON(){
        return Object.assign(super.toJSON(), {
            top: this.top,
            flag: this.flag,
            pole: this.pole,
            block: this.block,
        });
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
        this.height = CONF.BLK * 1;
        this.width = CONF.BLK;
        this.touched = null;
        this.event = false;
    }
    toJSON(){
        return Object.assign(super.toJSON(),{
            type: this.type,
            attr: this.attr,
            touched: this.touched,
            event: this.event,
        });
    }
}
class coinItem extends commonItem{
    constructor(obj={}){
        super(obj);
        this.type = "coin";
    }
}
class mushroomItem extends commonItem{
    constructor(obj={}){
        super(obj);
        this.type = "mushroom";
    }
}
class commonEfect extends PhysicsObject{
    constructor(obj={}){
        super(obj);
        this.attr = 'Efect';
        this.type = obj.type;
        this.height = CONF.BLK * 1;
        this.width = CONF.BLK;
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
        // this.map = this.load_stage();
        this.map = this.def();
        this.END_POINT = this.map.length * CONF.BLK;
    }
    def(){
        let st = [];
        for(let x=0; x<CONF.MAX_WIDTH; x++){
            st.push([]);
            for(let y=0; y<CONF.MAX_HEIGHT; y++){
                if(y == CONF.MAX_HEIGHT - 1){
                    st[x].push('b');
                }else{
                    st[x].push('.');
                }
            }
        }
        return st;
    }
    load_stage(){
        // let stage = fs.readFileSync(__dirname + '/conf/stages/s1.txt', 'utf-8');
        let stage = "";
        let lines = stage.split("\r\n");
        if(!this.chk_stage(lines)){
            return this.def();
        }
        let st = [];
        for(let x=0; x<lines[0].length; x++){
            st.push([]);
            for(let y=0; y<CONF.MAX_HEIGHT; y++){
                st[x].push(lines[y][x+1]);
            }
        }
        return st;
    }
    chk_stage(lines){
        if(lines.length != CONF.MAX_HEIGHT){
            console.log(`No stage format. MAX_HEIGHT is ${CONF.MAX_HEIGHT}`);
            return false;
        }
        let before_col = null;
        let i = 0;
        lines.forEach((l)=>{
            let after_col = l.length;
            if(before_col && before_col != l.length){
                console.log(`No stage format. line ${i}`);
                return false;
            }
            before_col = after_col;
            i++;
        });
        console.log(`It's Good stage.`);
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
        console.log("game master.");
        // console.log(ccdm.stage.load_stage());
    }
    create_stage(){
        let x = 0;
        let y = 0;
        let goal_flg = false;
        ccdm.stage.map.forEach((line)=>{
            y = 0;
            line.forEach((point)=>{
                let param = {
                    x: x * CONF.BLK,
                    y: y * CONF.BLK,
                };
                if(point === 'b'){
                    let block = new hardBlock(param);
                    ccdm.blocks[block.id] = block;
                }
                if(point === 'n'){
                    let block = new normalBlock(param);
                    ccdm.blocks[block.id] = block;
                }
                if(point === 'H'){
                    let block = new hatenaBlock(param);
                    ccdm.blocks[block.id] = block;
                }
                if(point === 'M'){
                    let block = new hatenaBlock(param);
                    block.effect = 'mushroom';
                    ccdm.blocks[block.id] = block;
                }
                if(point === 'D'){
                    let block = new dokanHeadBlock(param);
                    ccdm.blocks[block.id] = block;
                }
                if(point === 'd'){
                    let block = new dokanBodyBlock(param);
                    ccdm.blocks[block.id] = block;
                }
                if(point === 'c'){
                    let item = new coinItem(param);
                    ccdm.items[item.id] = item;
                }
                if(point === 'K'){
                    let enemy = new Enemy(param);
                    ccdm.enemys[enemy.id] = enemy;
                }
                if(point === 'G' && !ccdm.goal){
                    goal_flg = true;
                    let goal = new goalBlock(param);
                    ccdm.goal = goal;
                }
                y++;
            });
            x++;
        });
    }
}
const ccdm = new CCDM();
const gameMtr = new GameMaster();
