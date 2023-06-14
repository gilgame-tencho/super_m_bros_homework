console.log("Load gameClass");
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
module.exports = {
    CCDM, CCDM,
    Player: Player,
    GameMaster: GameMaster,
}
