import { SummonSystem } from '../src/game/SummonSystem.js?build=20260910a';
import { presentWeaponImpact, updateProjectilePresentation } from '../src/game/WeaponPresentation.js?build=20260910a';

class Preview extends Phaser.Scene {
  create() {
    this.player={x:260,y:245}; this.performance={mobile:true,vfxCap:50};
    this.add.circle(260,245,115,0x26323a,.25);
    this.add.circle(260,245,14,0xadc1cd).setStrokeStyle(3,0x374d65);
    this.state={elapsed:0,flags:{ghostFriend:true,magicDagger:true,daggerCount:2,magicScythe:true,electroBug:true},
      weapon:{id:'flame',damage:12},multiplierStats:{summonRate:1,summonDamage:1,damage:1},skin:null};
    this.target=this.add.circle(530,240,22,0x683b51).setStrokeStyle(2,0xb26a83);
    this.enemies={getChildren:()=>[]}; this.shots=[];
    this.combat={spawnBullet:(x,y,angle,spec)=>{
      const bullet=this.add.image(x,y,spec.texture).setScale(1.9).setRotation(angle).setDepth(30);
      Object.assign(bullet,{trajectoryAngle:angle,weaponId:spec.weaponId,speed:spec.speed,life:spec.life});
      this.shots.push(bullet); return bullet;
    },effects:{lightning:()=>{}}};
    this.summons=new SummonSystem(this);
    this.add.text(32,24,'GAME SCALE',{fontSize:14,color:'#8397a9'});
    ['ghost','dagger','scythe','bug'].forEach((kind,i)=>{
      this.add.image(90+i*150,455,`summon-${kind}`).setScale(kind==='scythe'?.52:.62);
      this.add.text(90+i*150,520,kind,{fontSize:14,color:'#b9d9dd'}).setOrigin(.5);
    });
    this.add.text(530,280,'TARGET',{fontSize:12,color:'#ba92a4'}).setOrigin(.5);
  }
  nearestEnemy(){return this.target;}
  update(_time,ms){
    if(!this.summons)return;
    const delta=ms/1000;this.state.elapsed+=delta;this.summons.update(delta);
    this.shots=this.shots.filter(bullet=>{
      if(!bullet.active)return false;
      if(bullet.homingTarget)bullet.trajectoryAngle=Math.atan2(this.target.y-bullet.y,this.target.x-bullet.x);
      bullet.setRotation(bullet.trajectoryAngle);
      bullet.x+=Math.cos(bullet.trajectoryAngle)*bullet.speed*delta;
      bullet.y+=Math.sin(bullet.trajectoryAngle)*bullet.speed*delta;
      updateProjectilePresentation(this,bullet); bullet.life-=delta;
      if(Math.hypot(bullet.x-this.target.x,bullet.y-this.target.y)<24){
        presentWeaponImpact(this,bullet,bullet.x,bullet.y);bullet.destroy();return false;
      }
      if(bullet.life<=0){bullet.destroy();return false;}return true;
    });
  }
}
new Phaser.Game({type:Phaser.AUTO,width:680,height:570,backgroundColor:'#10121c',scene:Preview,
  resolution:Math.min(devicePixelRatio,3),render:{antialias:true}});
