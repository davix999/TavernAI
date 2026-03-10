import { useState, useEffect, useRef, useCallback } from "react";

// ─────────────────────────────────────────────────────────────────────────────
// BATTLE MAP CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────
const CELL = 44;
const COLS = 22;
const ROWS = 14;
const MAP_W = CELL * COLS;
const MAP_H = CELL * ROWS;
const SIGHT = 5;

const TERRAIN = [
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,1,1,0,0,0,0,2,2,0,0,0,0,1,1,0,0,0,0,1],
  [1,0,1,1,0,0,0,0,0,2,2,0,0,0,0,0,1,1,0,0,0,1],
  [1,0,0,0,0,1,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,1,1,0,0,1,1,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,1,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,1,1,0,0,1,1,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,1,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,1],
  [1,0,1,1,0,0,0,0,0,2,2,0,0,0,0,0,1,1,0,0,0,1],
  [1,0,0,1,1,0,0,0,0,2,2,0,0,0,0,1,1,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
];

const TOKEN_RING = {
  Fighter:"#5b9bd5", Wizard:"#a855f7", Barbarian:"#ef4444",
  Cleric:"#f59e0b",  Rogue:"#22c55e",  Ranger:"#14b8a6",
  Enemy:"#84cc16",   Orc:"#4ade80",    Boss:"#d946ef",
};

const INIT_TOKENS = [
  { id:"p1", name:"Valdris",   cls:"Fighter",   col:3,  row:12, hp:28, maxHp:28, ac:18, spd:6, init:18, isPlayer:true  },
  { id:"p2", name:"Aelindra",  cls:"Wizard",    col:5,  row:12, hp:16, maxHp:16, ac:12, spd:6, init:15, isPlayer:true  },
  { id:"p3", name:"Torrog",    cls:"Barbarian", col:4,  row:11, hp:35, maxHp:35, ac:15, spd:7, init:12, isPlayer:true  },
  { id:"e1", name:"Goblin",    cls:"Enemy",     col:9,  row:1,  hp:7,  maxHp:7,  ac:13, spd:6, init:14, isPlayer:false },
  { id:"e2", name:"Goblin",    cls:"Enemy",     col:11, row:1,  hp:7,  maxHp:7,  ac:13, spd:6, init:10, isPlayer:false },
  { id:"e3", name:"Orc Brute", cls:"Orc",       col:10, row:3,  hp:15, maxHp:15, ac:14, spd:6, init:8,  isPlayer:false },
  { id:"e4", name:"Dark Mage", cls:"Boss",      col:10, row:1,  hp:32, maxHp:32, ac:14, spd:5, init:20, isPlayer:false },
];

// ─────────────────────────────────────────────────────────────────────────────
// CANVAS DRAW HELPERS
// ─────────────────────────────────────────────────────────────────────────────
function drawGrid(ctx) {
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const x = c*CELL, y = r*CELL, t = TERRAIN[r][c];
      if (t===1) {
        const g = ctx.createLinearGradient(x,y,x+CELL,y+CELL);
        g.addColorStop(0,"#252020"); g.addColorStop(1,"#181010");
        ctx.fillStyle=g; ctx.fillRect(x,y,CELL,CELL);
        ctx.strokeStyle="rgba(255,255,255,0.05)"; ctx.lineWidth=0.5;
        ctx.strokeRect(x+3,y+3,CELL-6,CELL-6);
      } else if (t===2) {
        ctx.fillStyle="#181810"; ctx.fillRect(x,y,CELL,CELL);
        ctx.fillStyle="#222215";
        for (let i=0;i<5;i++){const rx=x+5+((i*17)%(CELL-10)),ry=y+5+((i*13)%(CELL-10));ctx.beginPath();ctx.arc(rx,ry,3+(i%3),0,Math.PI*2);ctx.fill();}
      } else {
        ctx.fillStyle=(r+c)%2===0?"#131320":"#0f0f1a"; ctx.fillRect(x,y,CELL,CELL);
      }
      ctx.strokeStyle="rgba(201,168,76,0.07)"; ctx.lineWidth=0.5; ctx.strokeRect(x,y,CELL,CELL);
    }
  }
}

function drawMoveRange(ctx, range, hoverCell) {
  range.forEach(key=>{
    const [c,r]=key.split(",").map(Number);
    const isHover = hoverCell && hoverCell.c===c && hoverCell.r===r;
    ctx.fillStyle = isHover ? "rgba(74,158,255,0.32)" : "rgba(74,158,255,0.14)";
    ctx.fillRect(c*CELL+1,r*CELL+1,CELL-2,CELL-2);
    ctx.strokeStyle = isHover ? "rgba(74,158,255,0.9)" : "rgba(74,158,255,0.5)";
    ctx.lineWidth=1; ctx.strokeRect(c*CELL+1,r*CELL+1,CELL-2,CELL-2);
  });
}

function drawFog(ctx, fog) {
  for (let r=0;r<ROWS;r++) for (let c=0;c<COLS;c++) {
    if (!fog.has(`${c},${r}`)) { ctx.fillStyle="rgba(0,0,0,0.88)"; ctx.fillRect(c*CELL,r*CELL,CELL,CELL); }
  }
}

function drawArt(ctx, cls, cx, cy, r) {
  const ir = r*0.62;
  ctx.save();
  switch(cls) {
    case "Fighter": {
      ctx.fillStyle="#5a6878";
      ctx.beginPath();ctx.ellipse(cx-ir*.46,cy+ir*.15,ir*.27,ir*.2,-.3,0,Math.PI*2);ctx.fill();
      ctx.beginPath();ctx.ellipse(cx+ir*.46,cy+ir*.15,ir*.27,ir*.2,.3,0,Math.PI*2);ctx.fill();
      ctx.fillStyle="#7a8898";ctx.beginPath();ctx.ellipse(cx,cy+ir*.08,ir*.33,ir*.42,0,0,Math.PI*2);ctx.fill();
      ctx.fillStyle="#8a9aaa";ctx.beginPath();ctx.arc(cx,cy-ir*.26,ir*.31,0,Math.PI*2);ctx.fill();
      ctx.fillStyle="#5a6878";ctx.fillRect(cx-ir*.26,cy-ir*.33,ir*.52,ir*.09);
      ctx.strokeStyle="#c8ddf0";ctx.lineWidth=2.5;
      ctx.beginPath();ctx.moveTo(cx+ir*.56,cy-ir*.65);ctx.lineTo(cx+ir*.56,cy+ir*.56);ctx.stroke();
      ctx.beginPath();ctx.moveTo(cx+ir*.35,cy+ir*.05);ctx.lineTo(cx+ir*.77,cy+ir*.05);ctx.stroke();
      break;
    }
    case "Wizard": {
      ctx.fillStyle="#3a2068";ctx.beginPath();ctx.ellipse(cx,cy+ir*.18,ir*.52,ir*.58,0,0,Math.PI*2);ctx.fill();
      ctx.fillStyle="#6030a0";ctx.beginPath();ctx.moveTo(cx,cy-ir*.95);ctx.lineTo(cx-ir*.46,cy+ir*.22);ctx.lineTo(cx+ir*.46,cy+ir*.22);ctx.closePath();ctx.fill();
      ctx.fillStyle="#4a2080";ctx.beginPath();ctx.ellipse(cx,cy+ir*.22,ir*.55,ir*.16,0,0,Math.PI*2);ctx.fill();
      ctx.fillStyle="#f0c55a";[[0,-.15],[.33,.28],[-.33,.28]].forEach(([dx,dy])=>{ctx.beginPath();ctx.arc(cx+dx*ir,cy+dy*ir+ir*.1,2.5,0,Math.PI*2);ctx.fill();});
      ctx.strokeStyle="#b08040";ctx.lineWidth=2.5;
      ctx.beginPath();ctx.moveTo(cx-ir*.56,cy-ir*.72);ctx.lineTo(cx-ir*.56,cy+ir*.7);ctx.stroke();
      ctx.fillStyle="#90c8ff";ctx.beginPath();ctx.arc(cx-ir*.56,cy-ir*.72,5,0,Math.PI*2);ctx.fill();
      break;
    }
    case "Barbarian": {
      ctx.fillStyle="#7a3f2e";ctx.beginPath();ctx.ellipse(cx,cy+ir*.1,ir*.5,ir*.56,0,0,Math.PI*2);ctx.fill();
      ctx.fillStyle="#6a3426";ctx.beginPath();ctx.arc(cx,cy-ir*.24,ir*.31,0,Math.PI*2);ctx.fill();
      ctx.fillStyle="#c0a06a";
      ctx.beginPath();ctx.moveTo(cx-ir*.27,cy-ir*.36);ctx.quadraticCurveTo(cx-ir*.62,cy-ir*.9,cx-ir*.46,cy-ir*.7);ctx.lineTo(cx-ir*.18,cy-ir*.29);ctx.fill();
      ctx.beginPath();ctx.moveTo(cx+ir*.27,cy-ir*.36);ctx.quadraticCurveTo(cx+ir*.62,cy-ir*.9,cx+ir*.46,cy-ir*.7);ctx.lineTo(cx+ir*.18,cy-ir*.29);ctx.fill();
      ctx.strokeStyle="#a0a0a0";ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(cx+ir*.36,cy-ir*.55);ctx.lineTo(cx+ir*.6,cy+ir*.56);ctx.stroke();
      ctx.fillStyle="#c0c0c0";ctx.beginPath();ctx.moveTo(cx+ir*.36,cy-ir*.55);ctx.lineTo(cx+ir*.65,cy-ir*.55);ctx.lineTo(cx+ir*.52,cy-ir*.22);ctx.closePath();ctx.fill();
      break;
    }
    case "Enemy": {
      ctx.fillStyle="#458025";ctx.beginPath();ctx.ellipse(cx,cy+ir*.1,ir*.3,ir*.38,0,0,Math.PI*2);ctx.fill();
      ctx.beginPath();ctx.arc(cx,cy-ir*.22,ir*.26,0,Math.PI*2);ctx.fill();
      ctx.fillStyle="#356818";
      ctx.beginPath();ctx.moveTo(cx-ir*.2,cy-ir*.3);ctx.lineTo(cx-ir*.55,cy-ir*.6);ctx.lineTo(cx-ir*.14,cy-ir*.1);ctx.fill();
      ctx.beginPath();ctx.moveTo(cx+ir*.2,cy-ir*.3);ctx.lineTo(cx+ir*.55,cy-ir*.6);ctx.lineTo(cx+ir*.14,cy-ir*.1);ctx.fill();
      ctx.fillStyle="#ff2020";ctx.beginPath();ctx.arc(cx-ir*.1,cy-ir*.25,3,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.arc(cx+ir*.1,cy-ir*.25,3,0,Math.PI*2);ctx.fill();
      ctx.strokeStyle="#888";ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(cx+ir*.22,cy-ir*.5);ctx.lineTo(cx+ir*.5,cy+ir*.5);ctx.stroke();
      break;
    }
    case "Orc": {
      ctx.fillStyle="#2a6a28";ctx.beginPath();ctx.ellipse(cx,cy,ir*.5,ir*.56,0,0,Math.PI*2);ctx.fill();
      ctx.fillStyle="#3a8838";ctx.beginPath();ctx.arc(cx,cy-ir*.22,ir*.31,0,Math.PI*2);ctx.fill();
      ctx.fillStyle="#e0d090";
      ctx.beginPath();ctx.moveTo(cx-ir*.1,cy-ir*.08);ctx.lineTo(cx-ir*.17,cy+ir*.18);ctx.lineTo(cx-ir*.04,cy-ir*.08);ctx.fill();
      ctx.beginPath();ctx.moveTo(cx+ir*.1,cy-ir*.08);ctx.lineTo(cx+ir*.17,cy+ir*.18);ctx.lineTo(cx+ir*.04,cy-ir*.08);ctx.fill();
      ctx.strokeStyle="#7a5a28";ctx.lineWidth=3.5;ctx.beginPath();ctx.moveTo(cx+ir*.3,cy-ir*.6);ctx.lineTo(cx+ir*.55,cy+ir*.5);ctx.stroke();
      ctx.fillStyle="#909090";ctx.beginPath();ctx.moveTo(cx+ir*.3,cy-ir*.6);ctx.lineTo(cx+ir*.68,cy-ir*.6);ctx.lineTo(cx+ir*.55,cy-ir*.18);ctx.lineTo(cx+ir*.35,cy-ir*.24);ctx.closePath();ctx.fill();
      break;
    }
    case "Boss": {
      const aura=ctx.createRadialGradient(cx,cy,0,cx,cy,ir*1.1);
      aura.addColorStop(0,"rgba(200,0,255,0.3)");aura.addColorStop(1,"rgba(80,0,150,0)");
      ctx.fillStyle=aura;ctx.beginPath();ctx.arc(cx,cy,ir*1.15,0,Math.PI*2);ctx.fill();
      ctx.fillStyle="#160830";ctx.beginPath();ctx.ellipse(cx,cy+ir*.08,ir*.6,ir*.66,0,0,Math.PI*2);ctx.fill();
      ctx.fillStyle="#d8c8ae";ctx.beginPath();ctx.arc(cx,cy-ir*.08,ir*.33,0,Math.PI*2);ctx.fill();
      ctx.fillStyle="#0a001a";ctx.beginPath();ctx.arc(cx-ir*.12,cy-ir*.12,ir*.09,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.arc(cx+ir*.12,cy-ir*.12,ir*.09,0,Math.PI*2);ctx.fill();
      ctx.fillStyle="#d946ef";ctx.shadowColor="#d946ef";ctx.shadowBlur=10;
      ctx.beginPath();ctx.arc(cx-ir*.12,cy-ir*.12,ir*.046,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.arc(cx+ir*.12,cy-ir*.12,ir*.046,0,Math.PI*2);ctx.fill();
      ctx.shadowBlur=0;
      break;
    }
    default: {ctx.fillStyle="#aaa";ctx.font=`bold ${Math.floor(ir*.9)}px serif`;ctx.textAlign="center";ctx.textBaseline="middle";ctx.fillText("?",cx,cy);}
  }
  ctx.restore();
}

function drawToken(ctx, token, px, py, selected, dragging) {
  const cx=px+CELL/2, cy=py+CELL/2, r=CELL*0.43;
  ctx.beginPath();ctx.arc(cx+(dragging?4:1),cy+(dragging?4:1),r,0,Math.PI*2);
  ctx.fillStyle="rgba(0,0,0,0.55)";ctx.fill();
  if (selected){ctx.shadowColor=TOKEN_RING[token.cls]||"#fff";ctx.shadowBlur=18;}
  ctx.save();
  ctx.beginPath();ctx.arc(cx,cy,r,0,Math.PI*2);ctx.clip();
  const bg=ctx.createRadialGradient(cx-r*.3,cy-r*.3,0,cx,cy,r);
  bg.addColorStop(0,token.isPlayer?"#1a2848":"#2a1a18");bg.addColorStop(1,token.isPlayer?"#090f1e":"#130807");
  ctx.fillStyle=bg;ctx.fillRect(cx-r,cy-r,r*2,r*2);
  drawArt(ctx,token.cls,cx,cy,r);
  ctx.restore();ctx.shadowBlur=0;
  ctx.beginPath();ctx.arc(cx,cy,r,0,Math.PI*2);
  ctx.strokeStyle=TOKEN_RING[token.cls]||"#888";ctx.lineWidth=selected?3.5:2;ctx.stroke();
  const hf=token.hp/token.maxHp;
  ctx.beginPath();ctx.arc(cx,cy,r+4,-Math.PI/2,-Math.PI/2+hf*Math.PI*2);
  ctx.strokeStyle=hf>.5?"#4caf7a":hf>.25?"#f0c55a":"#c0392b";ctx.lineWidth=3;ctx.stroke();
  if (selected||dragging) {
    const label=token.name.length>9?token.name.slice(0,8)+"…":token.name;
    ctx.fillStyle="rgba(5,5,15,0.85)";ctx.fillRect(cx-30,cy+r+4,60,14);
    ctx.fillStyle="#e8d5a3";ctx.font="bold 8px Georgia, serif";ctx.textAlign="center";ctx.textBaseline="top";
    ctx.fillText(label.toUpperCase(),cx,cy+r+5);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// LOGIC HELPERS
// ─────────────────────────────────────────────────────────────────────────────
function computeFog(tokens) {
  const vis=new Set();
  tokens.filter(t=>t.isPlayer&&t.hp>0).forEach(t=>{
    for(let dr=-SIGHT;dr<=SIGHT;dr++)for(let dc=-SIGHT;dc<=SIGHT;dc++){
      if(Math.sqrt(dr*dr+dc*dc)<=SIGHT){const r=t.row+dr,c=t.col+dc;if(r>=0&&r<ROWS&&c>=0&&c<COLS)vis.add(`${c},${r}`);}
    }
  });
  return vis;
}

function computeRange(token, tokens) {
  const occ=new Set(tokens.filter(t=>t.id!==token.id).map(t=>`${t.col},${t.row}`));
  const best=new Map(), reach=new Set();
  const q=[{c:token.col,r:token.row,rem:token.spd}];
  best.set(`${token.col},${token.row}`,token.spd);
  while(q.length){
    const {c,r,rem}=q.shift();if(rem<=0)continue;
    [[0,1],[0,-1],[1,0],[-1,0]].forEach(([dc,dr])=>{
      const nc=c+dc,nr=r+dr;
      if(nc<0||nc>=COLS||nr<0||nr>=ROWS)return;
      if(TERRAIN[nr][nc]===1||occ.has(`${nc},${nr}`))return;
      const cost=TERRAIN[nr][nc]===2?2:1,nRem=rem-cost;
      if(nRem<0)return;
      const key=`${nc},${nr}`;
      if(best.has(key)&&best.get(key)>=nRem)return;
      best.set(key,nRem);reach.add(key);q.push({c:nc,r:nr,rem:nRem});
    });
  }
  return reach;
}

// ─────────────────────────────────────────────────────────────────────────────
// RPG DATA — sourced from 5esrd.com SRD 5.1.1
// ─────────────────────────────────────────────────────────────────────────────

const STANDARD_ARRAY = [15, 14, 13, 12, 10, 8];

const DEMO_CHARACTER = {
  name:"Thorin Darkblade", race:"Half-Orc", charClass:"Fighter",
  background:"Soldier", alignment:"Chaotic Neutral", level:3,
  backstory:"A mercenary haunted by a failed mission. Seeks redemption through gold and glory.",
  subrace:"",
  stats:{str:17,dex:13,con:16,int:9,wis:11,cha:8}, hp:28, maxHp:28,
};

const RACES_DATA = {
  Human: {
    emoji:"🧑", color:"#a0a0b8",
    description:"Versatile and ambitious, humans adapt to any environment and excel in all walks of life.",
    speed: 30, size:"Medium",
    abilityBonuses:{str:1,dex:1,con:1,int:1,wis:1,cha:1},
    traits:[
      {name:"Ability Score Increase", desc:"All ability scores each increase by 1."},
      {name:"Extra Language", desc:"You can speak, read, and write Common and one extra language of your choice."},
    ],
    subraces:[],
  },
  Dwarf: {
    emoji:"⛏️", color:"#a0785a",
    description:"Bold and hardy, dwarves are known as skilled warriors, miners, and workers of stone and metal.",
    speed:25, size:"Medium",
    abilityBonuses:{con:2},
    traits:[
      {name:"Ability Score Increase", desc:"Constitution +2."},
      {name:"Speed", desc:"25 ft. Not reduced by wearing heavy armor."},
      {name:"Darkvision", desc:"60 ft. See in dim light as bright, darkness as dim."},
      {name:"Dwarven Resilience", desc:"Advantage on saves vs. poison; resistance to poison damage."},
      {name:"Dwarven Combat Training", desc:"Proficiency: battleaxe, handaxe, light hammer, warhammer."},
      {name:"Tool Proficiency", desc:"Proficiency with smith's tools, brewer's supplies, or mason's tools (choose one)."},
      {name:"Stonecunning", desc:"Double proficiency bonus on Int (History) checks for stonework origin."},
      {name:"Languages", desc:"Common and Dwarvish."},
    ],
    subraces:[
      { name:"Hill Dwarf", bonuses:{wis:1},
        traits:[
          {name:"Wisdom +1", desc:"Wisdom score increases by 1."},
          {name:"Dwarven Toughness", desc:"HP maximum increases by 1, and by 1 each time you gain a level."},
        ]
      },
    ],
  },
  Elf: {
    emoji:"🧝", color:"#5a9a78",
    description:"Elves are a magical people of otherworldly grace, living in the world but not entirely part of it.",
    speed:30, size:"Medium",
    abilityBonuses:{dex:2},
    traits:[
      {name:"Ability Score Increase", desc:"Dexterity +2."},
      {name:"Darkvision", desc:"60 ft."},
      {name:"Keen Senses", desc:"Proficiency in the Perception skill."},
      {name:"Fey Ancestry", desc:"Advantage on saves vs. charmed; can't be magically put to sleep."},
      {name:"Trance", desc:"Don't need to sleep; meditate 4 hours for the benefit of 8 hours of sleep."},
      {name:"Languages", desc:"Common and Elvish."},
    ],
    subraces:[
      { name:"High Elf", bonuses:{int:1},
        traits:[
          {name:"Intelligence +1", desc:"Intelligence score increases by 1."},
          {name:"Elf Weapon Training", desc:"Proficiency: longsword, shortsword, shortbow, longbow."},
          {name:"Cantrip", desc:"Know one wizard cantrip of your choice. Int is your spellcasting ability."},
          {name:"Extra Language", desc:"Speak, read, and write one extra language of your choice."},
        ]
      },
    ],
  },
  Halfling: {
    emoji:"🍀", color:"#78a05a",
    description:"The comforts of home are the goals of most halflings' lives: a place to settle in peace and quiet.",
    speed:25, size:"Small",
    abilityBonuses:{dex:2},
    traits:[
      {name:"Ability Score Increase", desc:"Dexterity +2."},
      {name:"Speed", desc:"25 ft."},
      {name:"Lucky", desc:"When you roll a 1 on a d20 for attack, check, or save, reroll and must use new result."},
      {name:"Brave", desc:"Advantage on saving throws against being frightened."},
      {name:"Halfling Nimbleness", desc:"Move through the space of any creature larger than you."},
      {name:"Languages", desc:"Common and Halfling."},
    ],
    subraces:[
      { name:"Lightfoot", bonuses:{cha:1},
        traits:[
          {name:"Charisma +1", desc:"Charisma score increases by 1."},
          {name:"Naturally Stealthy", desc:"Can attempt to hide when obscured only by a creature at least one size larger than you."},
        ]
      },
    ],
  },
  Dragonborn: {
    emoji:"🐉", color:"#c05a28",
    description:"Dragonborn look very much like dragons standing erect in humanoid form, though they lack wings or a tail.",
    speed:30, size:"Medium",
    abilityBonuses:{str:2,cha:1},
    traits:[
      {name:"Ability Score Increase", desc:"Strength +2, Charisma +1."},
      {name:"Draconic Ancestry", desc:"Choose a dragon type: Black(Acid), Blue(Lightning), Brass(Fire), Bronze(Lightning), Copper(Acid), Gold(Fire), Green(Poison), Red(Fire), Silver(Cold), White(Cold)."},
      {name:"Breath Weapon", desc:"Exhale energy based on ancestry. DC = 8 + Con mod + prof bonus. 2d6 damage (scales to 5d6 at 16th). Once per short/long rest."},
      {name:"Damage Resistance", desc:"Resistance to the damage type of your draconic ancestry."},
      {name:"Languages", desc:"Common and Draconic."},
    ],
    subraces:[],
  },
  Gnome: {
    emoji:"⚙️", color:"#7878c8",
    description:"A gnome's energy and enthusiasm for living shines through every inch of their tiny body.",
    speed:25, size:"Small",
    abilityBonuses:{int:2},
    traits:[
      {name:"Ability Score Increase", desc:"Intelligence +2."},
      {name:"Speed", desc:"25 ft."},
      {name:"Darkvision", desc:"60 ft."},
      {name:"Gnome Cunning", desc:"Advantage on all Int, Wis, and Cha saving throws against magic."},
      {name:"Languages", desc:"Common and Gnomish."},
    ],
    subraces:[
      { name:"Rock Gnome", bonuses:{con:1},
        traits:[
          {name:"Constitution +1", desc:"Constitution score increases by 1."},
          {name:"Artificer's Lore", desc:"Double proficiency on Int (History) checks for magic items, alchemical objects, or technological devices."},
          {name:"Tinker", desc:"With tinker's tools, spend 1 hour + 10gp to build a Tiny clockwork device (toy, fire starter, or music box)."},
        ]
      },
    ],
  },
  "Half-Elf": {
    emoji:"🌗", color:"#78a888",
    description:"Walking in two worlds but belonging to neither, half-elves combine the best qualities of their elf and human heritage.",
    speed:30, size:"Medium",
    abilityBonuses:{cha:2},
    traits:[
      {name:"Ability Score Increase", desc:"Charisma +2, and two other ability scores of your choice each increase by 1."},
      {name:"Darkvision", desc:"60 ft."},
      {name:"Fey Ancestry", desc:"Advantage on saves vs. charmed; can't be magically put to sleep."},
      {name:"Skill Versatility", desc:"Gain proficiency in two skills of your choice."},
      {name:"Languages", desc:"Common, Elvish, and one language of your choice."},
    ],
    subraces:[],
    flexBonuses:2,
  },
  "Half-Orc": {
    emoji:"💪", color:"#6a9a50",
    description:"Whether united under the leadership of a mighty warlock or having fought to a standstill after years of conflict, half-orcs often prove themselves as adventurers.",
    speed:30, size:"Medium",
    abilityBonuses:{str:2,con:1},
    traits:[
      {name:"Ability Score Increase", desc:"Strength +2, Constitution +1."},
      {name:"Darkvision", desc:"60 ft."},
      {name:"Menacing", desc:"Proficiency in the Intimidation skill."},
      {name:"Relentless Endurance", desc:"When reduced to 0 HP but not killed, drop to 1 HP instead. Once per long rest."},
      {name:"Savage Attacks", desc:"On a critical melee hit, roll one weapon damage die one additional time and add it."},
      {name:"Languages", desc:"Common and Orc."},
    ],
    subraces:[],
  },
  Tiefling: {
    emoji:"😈", color:"#c03060",
    description:"To be greeted with stares and whispers, to suffer violence and insult on the street — this is the lot of the tiefling.",
    speed:30, size:"Medium",
    abilityBonuses:{int:1,cha:2},
    traits:[
      {name:"Ability Score Increase", desc:"Intelligence +1, Charisma +2."},
      {name:"Darkvision", desc:"60 ft."},
      {name:"Hellish Resistance", desc:"Resistance to fire damage."},
      {name:"Infernal Legacy", desc:"Know thaumaturgy cantrip. At 3rd level: hellish rebuke 1/long rest. At 5th level: darkness 1/long rest. Cha is spellcasting ability."},
      {name:"Languages", desc:"Common and Infernal."},
    ],
    subraces:[],
  },
};

const CLASSES_DATA = {
  Barbarian: {
    emoji:"🪓", color:"#ef4444", hitDie:"d12",
    primaryAbility:"Strength",
    savingThrows:["Strength","Constitution"],
    armorProf:"Light armor, medium armor, shields",
    weaponProf:"Simple weapons, martial weapons",
    description:"A fierce warrior of primitive background who can enter a battle rage.",
    features:[
      {name:"Rage", desc:"2/long rest at 1st level. Advantage on STR checks & saves, +2 bonus damage, resistance to bludgeoning/piercing/slashing. Lasts 1 min."},
      {name:"Unarmored Defense", desc:"While not wearing armor: AC = 10 + DEX mod + CON mod."},
    ],
  },
  Bard: {
    emoji:"🎵", color:"#a855f7", hitDie:"d8",
    primaryAbility:"Charisma",
    savingThrows:["Dexterity","Charisma"],
    armorProf:"Light armor",
    weaponProf:"Simple weapons, hand crossbows, longswords, rapiers, shortswords",
    description:"An inspiring magician whose power echoes the music of creation.",
    features:[
      {name:"Spellcasting", desc:"Cha-based. Full spellcaster. Knows spells from the bard list."},
      {name:"Bardic Inspiration", desc:"Bonus action: grant a creature within 60 ft. a d6 die to add to one ability check, attack, or save. Cha mod times per long rest."},
    ],
  },
  Cleric: {
    emoji:"✨", color:"#f59e0b", hitDie:"d8",
    primaryAbility:"Wisdom",
    savingThrows:["Wisdom","Charisma"],
    armorProf:"Light armor, medium armor, shields",
    weaponProf:"Simple weapons",
    description:"A priestly champion who wields divine magic in service of a higher power.",
    features:[
      {name:"Spellcasting", desc:"Wis-based. Prepares spells. Can prepare Wis mod + cleric level spells per long rest."},
      {name:"Divine Domain", desc:"Choose a domain at 1st level: Life, Light, War, Trickery, Knowledge, Nature, or Tempest."},
    ],
  },
  Druid: {
    emoji:"🌿", color:"#22c55e", hitDie:"d8",
    primaryAbility:"Wisdom",
    savingThrows:["Intelligence","Wisdom"],
    armorProf:"Light armor, medium armor, shields (no metal)",
    weaponProf:"Clubs, daggers, darts, javelins, maces, quarterstaffs, scimitars, sickles, slings, spears",
    description:"A priest of the Old Faith, wielding the powers of nature and adopting animal forms.",
    features:[
      {name:"Druidic", desc:"Know the secret Druidic language. Leaves secret messages in nature."},
      {name:"Spellcasting", desc:"Wis-based. Prepares spells from the druid list. Druidic focus as spellcasting focus."},
    ],
  },
  Fighter: {
    emoji:"⚔️", color:"#5b9bd5", hitDie:"d10",
    primaryAbility:"Strength or Dexterity",
    savingThrows:["Strength","Constitution"],
    armorProf:"All armor, shields",
    weaponProf:"Simple weapons, martial weapons",
    description:"A master of martial combat, skilled with a variety of weapons and armor.",
    features:[
      {name:"Fighting Style", desc:"Choose one: Archery (+2 ranged attack rolls), Defense (+1 AC in armor), Dueling (+2 damage 1-handed), Great Weapon Fighting (reroll 1s and 2s on damage), Protection (impose disadvantage on attack vs. ally), Two-Weapon Fighting (add ability mod to off-hand damage)."},
      {name:"Second Wind", desc:"Bonus action: regain 1d10 + fighter level HP. Once per short/long rest."},
    ],
  },
  Monk: {
    emoji:"🥋", color:"#14b8a6", hitDie:"d8",
    primaryAbility:"Dexterity & Wisdom",
    savingThrows:["Strength","Dexterity"],
    armorProf:"None",
    weaponProf:"Simple weapons, shortswords",
    description:"A master of martial arts, harnessing the power of the body in pursuit of physical and spiritual perfection.",
    features:[
      {name:"Unarmored Defense", desc:"While not wearing armor or shields: AC = 10 + DEX mod + WIS mod."},
      {name:"Martial Arts", desc:"Use DEX instead of STR for unarmed strikes. Unarmed strike = d4 (scales with level). Bonus action unarmed strike after an unarmed/monk weapon attack."},
    ],
  },
  Paladin: {
    emoji:"🛡️", color:"#f0c55a", hitDie:"d10",
    primaryAbility:"Strength & Charisma",
    savingThrows:["Wisdom","Charisma"],
    armorProf:"All armor, shields",
    weaponProf:"Simple weapons, martial weapons",
    description:"A holy warrior bound to a sacred oath.",
    features:[
      {name:"Divine Sense", desc:"Action: know the location of celestials, fiends, and undead within 60 ft. Not behind total cover. Cha mod + 1 times per long rest."},
      {name:"Lay on Hands", desc:"Pool of HP = paladin level × 5. Use as action to restore HP, or spend 5 HP to cure disease/poison."},
    ],
  },
  Ranger: {
    emoji:"🏹", color:"#84cc16", hitDie:"d10",
    primaryAbility:"Dexterity & Wisdom",
    savingThrows:["Strength","Dexterity"],
    armorProf:"Light armor, medium armor, shields",
    weaponProf:"Simple weapons, martial weapons",
    description:"A warrior who uses martial prowess and nature magic to combat threats on the edges of civilization.",
    features:[
      {name:"Favored Enemy", desc:"Choose a creature type (beasts, humanoids, undead, etc.). Advantage on Survival checks to track, and on Int checks to recall info about them."},
      {name:"Natural Explorer", desc:"Choose a favored terrain. Double proficiency on Int/Wis checks using skills you're proficient in while in that terrain."},
    ],
  },
  Rogue: {
    emoji:"🗡️", color:"#a3a3a3", hitDie:"d8",
    primaryAbility:"Dexterity",
    savingThrows:["Dexterity","Intelligence"],
    armorProf:"Light armor",
    weaponProf:"Simple weapons, hand crossbows, longswords, rapiers, shortswords",
    description:"A scoundrel who uses stealth and trickery to overcome obstacles and enemies.",
    features:[
      {name:"Expertise", desc:"Double proficiency bonus for two skill proficiencies of your choice (or one skill + thieves' tools)."},
      {name:"Sneak Attack", desc:"1d6 extra damage (scales with level) when you have advantage or an ally is adjacent to target. Once per turn."},
      {name:"Thieves' Cant", desc:"A secret mix of dialect, jargon, and code to pass secret messages. Takes 4× as long to convey a message."},
    ],
  },
  Sorcerer: {
    emoji:"🔮", color:"#d946ef", hitDie:"d6",
    primaryAbility:"Charisma",
    savingThrows:["Constitution","Charisma"],
    armorProf:"None",
    weaponProf:"Daggers, darts, slings, quarterstaffs, light crossbows",
    description:"A spellcaster who draws on inherent magic from a gift or bloodline.",
    features:[
      {name:"Spellcasting", desc:"Cha-based. Knows a fixed number of spells from the sorcerer list. Does not prepare spells."},
      {name:"Sorcerous Origin", desc:"Choose Wild Magic or Draconic Bloodline at 1st level, granting additional features."},
    ],
  },
  Warlock: {
    emoji:"📜", color:"#7c3aed", hitDie:"d8",
    primaryAbility:"Charisma",
    savingThrows:["Wisdom","Charisma"],
    armorProf:"Light armor",
    weaponProf:"Simple weapons",
    description:"A wielder of magic derived from a bargain with an extraplanar entity.",
    features:[
      {name:"Otherworldly Patron", desc:"Choose at 1st level: The Archfey, The Fiend, or The Great Old One. Determines expanded spell list and bonus features."},
      {name:"Pact Magic", desc:"1 spell slot, regained on short rest. Spell slot level = half warlock level (rounded up, max 5th level slots)."},
    ],
  },
  Wizard: {
    emoji:"🧙", color:"#a855f7", hitDie:"d6",
    primaryAbility:"Intelligence",
    savingThrows:["Intelligence","Wisdom"],
    armorProf:"None",
    weaponProf:"Daggers, darts, slings, quarterstaffs, light crossbows",
    description:"A scholarly magic-user capable of manipulating the structures of reality.",
    features:[
      {name:"Spellcasting", desc:"Int-based. Spellbook contains spells you've learned. Prepare Int mod + wizard level spells per long rest."},
      {name:"Arcane Recovery", desc:"Once per day during a short rest, recover spell slots with total levels ≤ half your wizard level (rounded up, max 5th level slots)."},
    ],
  },
};

const CLASSES = Object.entries(CLASSES_DATA).map(([name,d])=>({name, emoji:d.emoji}));
const RACES = Object.keys(RACES_DATA);
const BACKGROUNDS=["Soldier","Scholar","Criminal","Noble","Outlander","Acolyte","Merchant","Hermit","Folk Hero","Entertainer"];
const ALIGNMENTS=["Lawful Good","Neutral Good","Chaotic Good","Lawful Neutral","True Neutral","Chaotic Neutral","Lawful Evil","Neutral Evil","Chaotic Evil"];
const LANGUAGES=[
  {code:"en",name:"English",flag:"🇺🇸"},{code:"es",name:"Spanish",flag:"🇪🇸"},
  {code:"fr",name:"French",flag:"🇫🇷"},{code:"de",name:"German",flag:"🇩🇪"},
  {code:"ja",name:"Japanese",flag:"🇯🇵"},{code:"pt",name:"Portuguese",flag:"🇧🇷"},
  {code:"ko",name:"Korean",flag:"🇰🇷"},{code:"zh",name:"Chinese",flag:"🇨🇳"},
];
const SESSIONS=[
  {id:1,title:"The Sunken Citadel",type:"One-Shot",level:"1-3",players:2,maxPlayers:5,system:"5e SRD",startIn:"Starting Now",tags:["Dungeon Crawl","Beginner Friendly"],available:true},
  {id:2,title:"Curse of the Crimson Moon",type:"Campaign",level:"4-6",players:4,maxPlayers:5,system:"5e SRD",startIn:"1h 45m",tags:["Horror","Investigation"],available:false},
  {id:3,title:"Heist at the Merchant Quarter",type:"One-Shot",level:"3-5",players:1,maxPlayers:4,system:"5e SRD",startIn:"3h 10m",tags:["Urban","Intrigue","Stealth"],available:true},
  {id:4,title:"War of the Shattered Throne",type:"Campaign",level:"7-10",players:3,maxPlayers:6,system:"5e SRD",startIn:"5h 00m",tags:["Epic","Political","Combat-Heavy"],available:true},
];
const PARTY_MEMBERS=[
  {name:"Valdris",class:"Fighter Lv.2",flag:"🇺🇸",emoji:"⚔️"},
  {name:"Aelindra",class:"Wizard Lv.2",flag:"🇯🇵",emoji:"🧙"},
  {name:"Torrog",class:"Barbarian Lv.2",flag:"🇧🇷",emoji:"🪓"},
];
const QUICK_ACTIONS=["Look around","Inspect object","Talk to NPC","Attack!","Stealth check","Use item"];

function modStr(v){const m=Math.floor((v-10)/2);return m>=0?`+${m}`:`${m}`;}

// ─────────────────────────────────────────────────────────────────────────────
// AI DM API
// ─────────────────────────────────────────────────────────────────────────────
async function callDM(messages, character, scenario) {
  const sys=`You are the Dungeon Master for a text-based tabletop RPG session powered by D&D 5e SRD rules. You are running: "${scenario}".
Character: ${character.name}, ${character.race} ${character.charClass} Lv.${character.level}, ${character.background}, ${character.alignment}.
Stats: STR${character.stats.str} DEX${character.stats.dex} CON${character.stats.con} INT${character.stats.int} WIS${character.stats.wis} CHA${character.stats.cha}. HP:${character.hp}/${character.maxHp}.
Backstory: ${character.backstory||"Unknown past."}
Rules: 2-4 vivid sentences per response. Reference SRD 5.1 rules. Mark dice rolls as [ROLL: Stealth DC 13]. Stay in character as DM.`;
  const res=await fetch("https://api.anthropic.com/v1/messages",{
    method:"POST",
    headers:{
      "Content-Type":"application/json",
      "x-api-key":import.meta.env.VITE_ANTHROPIC_KEY,
      "anthropic-version":"2023-06-01",
      "anthropic-dangerous-direct-browser-access":"true",
    },
    body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:1000,system:sys,messages:messages.filter(m=>m.role!=="system")}),
  });
  const data=await res.json();
  return data.content?.[0]?.text||"The DM pauses, consulting the ancient tomes...";
}

// ─────────────────────────────────────────────────────────────────────────────
// VOICE / SPEECH HOOK
// ─────────────────────────────────────────────────────────────────────────────
function useSpeech(onTranscript) {
  const [listening, setListening] = useState(false);
  const [interim,   setInterim]   = useState("");
  const recRef = useRef(null);

  const supported = typeof window !== "undefined" &&
    ("SpeechRecognition" in window || "webkitSpeechRecognition" in window);

  const start = useCallback(() => {
    if (!supported) return;
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    const rec = new SR();
    rec.continuous      = false;
    rec.interimResults  = true;
    rec.lang            = "en-US";
    recRef.current      = rec;

    rec.onresult = (e) => {
      let fin = "", int = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) fin += e.results[i][0].transcript;
        else                       int += e.results[i][0].transcript;
      }
      setInterim(int);
      if (fin) { onTranscript(fin.trim()); setInterim(""); }
    };
    rec.onerror = () => { setListening(false); setInterim(""); };
    rec.onend   = () => { setListening(false); setInterim(""); };

    rec.start();
    setListening(true);
  }, [supported, onTranscript]);

  const stop = useCallback(() => {
    recRef.current?.stop();
    setListening(false);
    setInterim("");
  }, []);

  const toggle = useCallback(() => listening ? stop() : start(), [listening, start, stop]);

  return { listening, interim, toggle, supported };
}

// ─────────────────────────────────────────────────────────────────────────────
// GLOBAL STYLES
// ─────────────────────────────────────────────────────────────────────────────
const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Cinzel+Decorative:wght@400;700;900&family=Cinzel:wght@400;600;700&family=Lora:ital,wght@0,400;0,600;1,400&display=swap');
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
  :root{
    --void:#050508;--coal:#111118;--slate:#1a1a28;--ghost:#2a2a40;--rune:#3d3d60;
    --gold:#c9a84c;--gold-bright:#f0c55a;--gold-dim:#7a6230;
    --crimson:#8b1a1a;--crimson-bright:#c0392b;
    --parchment:#e8d5a3;--parchment-dim:#c4a96e;--silver:#a0a0b8;
    --blue:#5b9bd5;
  }
  body{background:var(--void);color:var(--parchment);font-family:'Lora',Georgia,serif;min-height:100vh;overflow-x:hidden;}
  ::-webkit-scrollbar{width:5px;}::-webkit-scrollbar-track{background:var(--void);}::-webkit-scrollbar-thumb{background:var(--gold-dim);border-radius:3px;}

  .btn{font-family:'Cinzel',serif;font-size:.8rem;letter-spacing:.12em;text-transform:uppercase;padding:.7rem 1.6rem;border:none;cursor:pointer;transition:all .25s;}
  .btn-gold{background:linear-gradient(135deg,var(--gold-dim),var(--gold) 50%,var(--gold-dim));color:var(--void);font-weight:700;box-shadow:0 0 20px rgba(201,168,76,.3);}
  .btn-gold:hover{background:linear-gradient(135deg,var(--gold),var(--gold-bright) 50%,var(--gold));box-shadow:0 0 35px rgba(201,168,76,.5);transform:translateY(-1px);}
  .btn-gold:disabled{opacity:.4;cursor:not-allowed;transform:none;}
  .btn-ghost{background:transparent;color:var(--gold);border:1px solid var(--gold-dim);}
  .btn-ghost:hover{border-color:var(--gold);background:rgba(201,168,76,.08);}
  .btn-crimson{background:linear-gradient(135deg,var(--crimson),var(--crimson-bright));color:var(--parchment);font-weight:700;}

  .gold-line{height:1px;background:linear-gradient(90deg,transparent,var(--gold-dim),var(--gold),var(--gold-dim),transparent);margin:1.25rem 0;}

  .hero{min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:2rem;background:radial-gradient(ellipse 80% 60% at 50% 0%,rgba(139,26,26,.15) 0%,transparent 70%),radial-gradient(ellipse 60% 40% at 50% 100%,rgba(201,168,76,.08) 0%,transparent 70%),var(--void);}
  .hero-sigil{font-size:4rem;animation:float 4s ease-in-out infinite;filter:drop-shadow(0 0 20px rgba(201,168,76,.5));}
  @keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-12px)}}
  .hero-eyebrow{font-family:'Cinzel',serif;font-size:.7rem;letter-spacing:.3em;color:var(--gold);text-transform:uppercase;margin-bottom:1.2rem;}
  .hero-title{font-family:'Cinzel Decorative',serif;font-size:clamp(2.5rem,7vw,5.5rem);font-weight:900;color:var(--gold);text-shadow:0 0 40px rgba(201,168,76,.3);margin-bottom:.5rem;}
  .hero-sub{font-family:'Cinzel',serif;font-size:clamp(.9rem,2vw,1.3rem);color:var(--silver);letter-spacing:.1em;margin-bottom:2rem;}
  .hero-tag{font-style:italic;color:var(--parchment-dim);font-size:1.05rem;max-width:540px;line-height:1.7;margin-bottom:2.5rem;}

  .feature-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:1.4rem;}
  .fcard{background:var(--coal);border:1px solid var(--rune);padding:1.75rem;transition:all .3s;position:relative;overflow:hidden;}
  .fcard::before{content:'';position:absolute;inset:0;background:linear-gradient(135deg,rgba(201,168,76,.05),transparent 60%);opacity:0;transition:opacity .3s;}
  .fcard:hover{border-color:var(--gold-dim);transform:translateY(-3px);}
  .fcard:hover::before{opacity:1;}

  .price-card{background:var(--coal);border:1px solid var(--rune);padding:1.75rem;transition:all .3s;position:relative;}
  .price-card.featured{border-color:var(--gold);box-shadow:0 0 30px rgba(201,168,76,.2);}
  .price-card.featured::before{content:'⚜ Most Popular ⚜';position:absolute;top:-1px;left:50%;transform:translateX(-50%);background:var(--gold);color:var(--void);font-family:'Cinzel',serif;font-size:.55rem;letter-spacing:.1em;padding:.2rem .9rem;white-space:nowrap;}
  .price-features{list-style:none;margin-bottom:1.75rem;}
  .price-features li{color:var(--silver);font-size:.86rem;padding:.35rem 0;border-bottom:1px solid rgba(255,255,255,.05);display:flex;align-items:center;gap:.5rem;}
  .price-features li::before{content:'◆';color:var(--gold-dim);font-size:.5rem;flex-shrink:0;}

  .top-nav{position:fixed;top:0;left:0;right:0;background:rgba(5,5,8,.92);border-bottom:1px solid var(--gold-dim);padding:.9rem 1.75rem;display:flex;align-items:center;justify-content:space-between;z-index:200;backdrop-filter:blur(10px);}
  .nav-logo{font-family:'Cinzel Decorative',serif;font-size:1.05rem;color:var(--gold);cursor:pointer;display:flex;align-items:center;gap:.4rem;}
  .nav-link{font-family:'Cinzel',serif;font-size:.68rem;letter-spacing:.15em;text-transform:uppercase;color:var(--silver);cursor:pointer;background:none;border:none;transition:color .2s;}
  .nav-link:hover{color:var(--gold);}
  .lang-sel{background:var(--slate);border:1px solid var(--rune);color:var(--parchment);font-family:'Cinzel',serif;font-size:.68rem;padding:.3rem .55rem;outline:none;cursor:pointer;}

  .char-sheet{background:var(--coal);border:1px solid var(--gold-dim);padding:2.25rem;display:grid;grid-template-columns:1fr 1fr;gap:1.75rem;}
  .char-sheet-full{grid-column:1/-1;}
  .field-label{font-family:'Cinzel',serif;font-size:.68rem;letter-spacing:.15em;color:var(--gold);text-transform:uppercase;margin-bottom:.45rem;display:block;}
  .field-input{background:var(--slate);border:1px solid var(--rune);color:var(--parchment);font-family:'Lora',serif;font-size:.92rem;padding:.6rem .85rem;outline:none;width:100%;transition:border-color .2s;}
  .field-input:focus{border-color:var(--gold-dim);}
  .stat-box{background:var(--slate);border:1px solid var(--rune);padding:.9rem;text-align:center;}
  .stat-btn{background:var(--ghost);border:1px solid var(--rune);color:var(--gold);font-family:'Cinzel',serif;width:22px;height:22px;cursor:pointer;transition:all .2s;display:flex;align-items:center;justify-content:center;font-size:.85rem;}
  .stat-btn:hover{background:var(--rune);}

  .session-card{background:var(--coal);border:1px solid var(--rune);padding:1.4rem;cursor:pointer;transition:all .25s;display:grid;grid-template-columns:1fr auto;gap:1rem;align-items:center;}
  .session-card:hover{border-color:var(--gold-dim);transform:translateX(3px);}
  .session-card.active{border-color:var(--gold);background:rgba(201,168,76,.05);}
  .session-tag{background:var(--ghost);color:var(--gold-dim);font-family:'Cinzel',serif;font-size:.6rem;letter-spacing:.1em;padding:.18rem .45rem;text-transform:uppercase;}
  .session-tag.open{background:rgba(20,100,40,.3);color:#4caf7a;border:1px solid rgba(76,175,122,.3);}

  .game-shell{height:100vh;display:grid;grid-template-columns:250px 1fr 245px;grid-template-rows:52px 1fr;overflow:hidden;}
  .game-topbar{grid-column:1/-1;background:rgba(5,5,12,.97);border-bottom:1px solid var(--gold-dim);display:flex;align-items:center;justify-content:space-between;padding:0 1.25rem;gap:.75rem;backdrop-filter:blur(8px);}

  .view-tabs{display:flex;gap:2px;background:var(--void);padding:2px;border:1px solid var(--rune);}
  .view-tab{font-family:'Cinzel',serif;font-size:.68rem;letter-spacing:.1em;text-transform:uppercase;padding:.4rem .9rem;cursor:pointer;border:none;transition:all .2s;background:transparent;color:var(--silver);}
  .view-tab.active{background:var(--gold);color:var(--void);font-weight:700;}
  .view-tab:not(.active):hover{background:rgba(201,168,76,.1);color:var(--gold);}

  .char-panel{background:var(--coal);border-right:1px solid var(--gold-dim);padding:1.1rem;overflow-y:auto;display:flex;flex-direction:column;gap:.85rem;}
  .mini-stat{display:flex;justify-content:space-between;padding:.35rem 0;border-bottom:1px solid rgba(255,255,255,.04);}
  .inv-item{font-size:.78rem;color:var(--silver);padding:.28rem 0;display:flex;align-items:center;gap:.4rem;}
  .inv-item::before{content:'◈';color:var(--gold-dim);font-size:.5rem;}
  .hp-bar-out{background:var(--slate);height:7px;border:1px solid var(--rune);overflow:hidden;}
  .hp-bar-in{height:100%;transition:width .5s ease;}

  .right-panel{background:var(--coal);border-left:1px solid var(--gold-dim);overflow:hidden;display:flex;flex-direction:column;}
  .panel-tabs{display:flex;border-bottom:1px solid var(--rune);flex-shrink:0;}
  .ptab{flex:1;font-family:'Cinzel',serif;font-size:.56rem;letter-spacing:.07em;text-transform:uppercase;padding:.5rem .2rem;cursor:pointer;border:none;transition:all .2s;background:transparent;color:var(--silver);position:relative;}
  .ptab.active{background:rgba(201,168,76,.1);color:var(--gold);border-bottom:2px solid var(--gold);}
  .ptab:hover:not(.active){color:var(--parchment);}
  .panel-body{padding:1rem;flex:1;overflow-y:auto;}

  .narrative-col{display:flex;flex-direction:column;overflow:hidden;}
  .narrative-scroll{flex:1;overflow-y:auto;padding:1.25rem;display:flex;flex-direction:column;gap:.9rem;}
  .msg{max-width:84%;animation:msgIn .3s ease;}
  @keyframes msgIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
  .msg.dm{align-self:flex-start;}
  .msg.player{align-self:flex-end;}
  .msg.system{align-self:stretch;max-width:100%;}
  .msg-head{font-family:'Cinzel',serif;font-size:.63rem;letter-spacing:.15em;text-transform:uppercase;margin-bottom:.35rem;display:flex;align-items:center;gap:.4rem;}
  .msg.dm .msg-head{color:var(--gold);}
  .msg.player .msg-head{color:var(--silver);justify-content:flex-end;}
  .msg-bubble{padding:.9rem 1.1rem;line-height:1.7;font-size:.9rem;}
  .msg.dm .msg-bubble{background:var(--coal);border:1px solid var(--rune);border-left:3px solid var(--gold-dim);color:var(--parchment);}
  .msg.player .msg-bubble{background:var(--slate);border:1px solid var(--rune);border-right:3px solid var(--silver);color:var(--parchment);}
  .msg.system .msg-bubble{background:rgba(201,168,76,.05);border:1px solid var(--gold-dim);color:var(--gold);font-family:'Cinzel',serif;font-size:.76rem;letter-spacing:.08em;text-align:center;}
  .typing-ind{display:flex;align-items:center;gap:.45rem;padding:.65rem .9rem;background:var(--coal);border:1px solid var(--rune);border-left:3px solid var(--gold-dim);width:fit-content;animation:msgIn .3s ease;}
  .dot{width:5px;height:5px;background:var(--gold);border-radius:50%;animation:bounce 1.2s ease-in-out infinite;}
  .dot:nth-child(2){animation-delay:.2s}.dot:nth-child(3){animation-delay:.4s}
  @keyframes bounce{0%,60%,100%{transform:translateY(0);opacity:.4}30%{transform:translateY(-6px);opacity:1}}
  .input-area{border-top:1px solid var(--gold-dim);padding:.9rem 1.25rem;background:var(--coal);flex-shrink:0;}
  .game-input{flex:1;background:var(--slate);border:1px solid var(--rune);color:var(--parchment);font-family:'Lora',serif;font-size:.88rem;padding:.7rem .9rem;resize:none;outline:none;height:56px;transition:border-color .2s;line-height:1.5;}
  .game-input:focus{border-color:var(--gold-dim);}
  .game-input::placeholder{color:var(--rune);font-style:italic;}
  .send-btn{background:linear-gradient(135deg,var(--gold-dim),var(--gold));border:none;color:var(--void);font-family:'Cinzel',serif;font-size:.68rem;letter-spacing:.1em;padding:.7rem 1.1rem;cursor:pointer;height:56px;transition:all .2s;text-transform:uppercase;font-weight:700;}
  .send-btn:hover{filter:brightness(1.15);}
  .send-btn:disabled{opacity:.4;cursor:not-allowed;}
  .quick-btn{background:var(--ghost);border:1px solid var(--rune);color:var(--silver);font-family:'Cinzel',serif;font-size:.6rem;letter-spacing:.08em;padding:.28rem .65rem;cursor:pointer;text-transform:uppercase;transition:all .2s;}
  .quick-btn:hover{border-color:var(--gold-dim);color:var(--gold);}

  .mic-btn{width:44px;height:44px;border-radius:50%;border:2px solid var(--rune);background:var(--slate);color:var(--silver);font-size:1.1rem;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:all .2s;position:relative;}
  .mic-btn:hover:not(:disabled){border-color:var(--gold-dim);color:var(--gold);}
  .mic-btn.active{border-color:#ef4444;background:rgba(239,68,68,.15);color:#ef4444;animation:micPulse 1s ease-in-out infinite;}
  .mic-btn:disabled{opacity:.3;cursor:not-allowed;}
  @keyframes micPulse{0%,100%{box-shadow:0 0 0 0 rgba(239,68,68,.4)}50%{box-shadow:0 0 0 8px rgba(239,68,68,0)}}
  .mic-interim{font-size:.75rem;color:var(--silver);font-style:italic;padding:.3rem .5rem;background:rgba(239,68,68,.06);border:1px dashed rgba(239,68,68,.3);line-height:1.4;min-height:28px;}

  .chat-scroll{flex:1;overflow-y:auto;display:flex;flex-direction:column;gap:.55rem;padding:.85rem .9rem;}
  .chat-msg{display:flex;flex-direction:column;gap:.18rem;}
  .chat-msg.mine{align-items:flex-end;}
  .chat-msg.theirs{align-items:flex-start;}
  .chat-sender{font-family:'Cinzel',serif;font-size:.58rem;letter-spacing:.1em;color:var(--silver);display:flex;align-items:center;gap:.3rem;}
  .chat-bubble{padding:.5rem .75rem;font-size:.82rem;line-height:1.55;max-width:90%;}
  .chat-msg.mine .chat-bubble{background:rgba(91,155,213,.12);border:1px solid rgba(91,155,213,.3);border-radius:10px 10px 2px 10px;color:var(--parchment);}
  .chat-msg.theirs .chat-bubble{background:var(--slate);border:1px solid var(--rune);border-radius:10px 10px 10px 2px;color:var(--parchment);}
  .chat-msg.system-chat .chat-bubble{background:transparent;border:none;color:var(--rune);font-size:.68rem;font-family:'Cinzel',serif;letter-spacing:.08em;text-align:center;}
  .chat-input-row{display:flex;gap:.4rem;padding:.7rem .75rem;border-top:1px solid var(--rune);background:var(--void);flex-shrink:0;align-items:flex-end;}
  .chat-input{flex:1;background:var(--slate);border:1px solid var(--rune);color:var(--parchment);font-family:'Lora',serif;font-size:.83rem;padding:.5rem .7rem;outline:none;resize:none;height:40px;transition:border-color .2s;line-height:1.4;}
  .chat-input:focus{border-color:var(--gold-dim);}
  .chat-input::placeholder{color:var(--rune);font-style:italic;}
  .chat-send{background:var(--gold-dim);border:none;color:var(--void);font-family:'Cinzel',serif;font-size:.6rem;letter-spacing:.08em;padding:.5rem .7rem;cursor:pointer;height:40px;transition:all .2s;font-weight:700;text-transform:uppercase;flex-shrink:0;}
  .chat-send:hover{background:var(--gold);}
  .chat-send:disabled{opacity:.35;cursor:not-allowed;}

  .map-wrap{position:relative;overflow:hidden;background:#050508;flex:1;}
  @keyframes floatUp{0%{transform:translateY(0) scale(1);opacity:1}60%{transform:translateY(-55px) scale(1.1);opacity:1}100%{transform:translateY(-90px) scale(.8);opacity:0}}
  @keyframes pulseGlow{0%,100%{opacity:1}50%{opacity:.5}}
  @keyframes initGlow{0%,100%{box-shadow:0 0 6px #c9a84c33}50%{box-shadow:0 0 18px #c9a84c88}}

  .dice-bar{background:rgba(5,5,12,.96);border-top:1px solid var(--gold-dim);display:flex;align-items:center;padding:0 1rem;gap:.8rem;height:52px;flex-shrink:0;}
  .dice-btn{background:var(--coal);border:1px solid var(--rune);color:var(--silver);font-family:'Cinzel',serif;font-size:.7rem;padding:.32rem .65rem;cursor:pointer;transition:all .18s;letter-spacing:.08em;}
  .dice-btn:hover{border-color:var(--gold);color:var(--gold);}

  .section-hdr{font-family:'Cinzel',serif;font-size:.68rem;letter-spacing:.2em;color:var(--gold);text-transform:uppercase;margin-bottom:.8rem;}
`;

// ─────────────────────────────────────────────────────────────────────────────
// SUB-COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────

function CharPanel({ character, classes }) {
  const cls = classes.find(c=>c.name===character.charClass)||classes[0];
  const hf = character.hp/character.maxHp;
  return (
    <div className="char-panel">
      <div style={{textAlign:"center",paddingBottom:".9rem",borderBottom:"1px solid var(--rune)"}}>
        <div style={{fontSize:"2.2rem",marginBottom:".3rem"}}>{cls.emoji}</div>
        <div style={{fontFamily:"'Cinzel',serif",fontSize:".9rem",color:"var(--gold)"}}>{character.name||"Unnamed"}</div>
        <div style={{fontSize:".72rem",color:"var(--silver)",fontStyle:"italic",marginTop:".2rem"}}>{character.race} {character.charClass} · Lv.{character.level}</div>
      </div>
      <div>
        <div className="field-label">Hit Points</div>
        <div style={{display:"flex",justifyContent:"space-between",fontSize:".78rem",fontFamily:"'Cinzel',serif",marginBottom:".35rem"}}>
          <span style={{color:"var(--crimson-bright)"}}>{character.hp}</span>
          <span style={{color:"var(--silver)"}}>/ {character.maxHp}</span>
        </div>
        <div className="hp-bar-out"><div className="hp-bar-in" style={{width:`${hf*100}%`,background:hf>.5?"#4caf7a":hf>.25?"#f0c55a":"#c0392b"}}/></div>
      </div>
      <div className="gold-line"/>
      {Object.entries(character.stats).map(([s,v])=>(
        <div key={s} className="mini-stat">
          <span style={{fontFamily:"'Cinzel',serif",fontSize:".63rem",letterSpacing:".1em",color:"var(--silver)",textTransform:"uppercase"}}>{s}</span>
          <span style={{fontFamily:"'Cinzel',serif",fontSize:".82rem",color:"var(--gold)"}}>{v} <span style={{color:"var(--silver)",fontSize:".68rem"}}>({modStr(v)})</span></span>
        </div>
      ))}
      <div className="gold-line"/>
      <div className="field-label">Equipment</div>
      {["Longsword","Shield","Leather Armor","Torch ×3","Rope 50ft","Potion ×2"].map(i=>(
        <div key={i} className="inv-item">{i}</div>
      ))}
    </div>
  );
}

function PartyChatPanel({ chatMessages, sendChat, character }) {
  const [text, setText] = useState("");
  const scrollRef = useRef(null);

  useEffect(()=>{
    if(scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [chatMessages]);

  const send = (msg) => {
    const m = msg || text;
    if (!m.trim()) return;
    sendChat(m.trim());
    setText("");
  };

  const handleKey = (e) => { if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();send();} };

  const { listening, interim, toggle, supported } = useSpeech((t) => {
    setText(prev => prev ? prev + " " + t : t);
  });

  const myName = character.name || "You";

  return (
    <div style={{display:"flex",flexDirection:"column",height:"100%",overflow:"hidden"}}>
      <div style={{padding:".6rem .9rem",borderBottom:"1px solid var(--rune)",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <div className="section-hdr" style={{margin:0}}>💬 Party Chat</div>
        <div style={{fontSize:".6rem",color:"#4caf7a",fontFamily:"'Cinzel',serif",letterSpacing:".08em",display:"flex",alignItems:"center",gap:".3rem"}}>
          <span style={{width:5,height:5,borderRadius:"50%",background:"#4caf7a",display:"inline-block"}}/>
          {PARTY_MEMBERS.length + 1} online
        </div>
      </div>
      <div className="chat-scroll" ref={scrollRef}>
        {chatMessages.length===0 && (
          <div style={{textAlign:"center",color:"var(--rune)",fontSize:".7rem",fontStyle:"italic",padding:"1rem 0"}}>
            Use this channel to coordinate with your party.<br/>The DM won't see this.
          </div>
        )}
        {chatMessages.map(m=>{
          const isMine = m.sender === myName;
          return (
            <div key={m.id} className={`chat-msg ${m.type==="system"?"system-chat":isMine?"mine":"theirs"}`}>
              {m.type!=="system" && (
                <div className="chat-sender">
                  {!isMine && <><span>{m.flag}</span><span>{m.sender}</span><span style={{color:"var(--rune)"}}>·</span></>}
                  <span style={{fontSize:".55rem",color:"var(--rune)"}}>{m.time}</span>
                  {isMine && <span style={{color:"var(--blue)"}}>You</span>}
                </div>
              )}
              <div className="chat-bubble">{m.text}</div>
            </div>
          );
        })}
      </div>
      {listening && (
        <div className="mic-interim" style={{margin:"0 .75rem .4rem",flexShrink:0}}>
          🎙 {interim || <span style={{color:"var(--rune)"}}>Listening…</span>}
        </div>
      )}
      <div className="chat-input-row">
        {supported && (
          <button className={`mic-btn ${listening?"active":""}`} onClick={toggle} title={listening?"Stop":"Speak"}
            style={{width:36,height:36,borderRadius:4,fontSize:".9rem",flexShrink:0}}>
            {listening?"⏹":"🎙"}
          </button>
        )}
        <textarea className="chat-input" value={text} onChange={e=>setText(e.target.value)}
          onKeyDown={handleKey} placeholder="Message party… (Enter)"/>
        <button className="chat-send" onClick={()=>send()} disabled={!text.trim()}>Send</button>
      </div>
    </div>
  );
}

function RightPanel({ gameTab, tokens, turnIdx, initOrder, diceLog, partyMembers, round, chatMessages, sendChat, character, unread, clearUnread }) {
  const [rtab, setRtab] = useState(gameTab==="battle" ? "initiative" : "party");
  useEffect(()=>{ setRtab(gameTab==="battle"?"initiative":"party"); },[gameTab]);

  const switchTab = (t) => { setRtab(t); if(t==="chat") clearUnread(); };

  return (
    <div className="right-panel">
      <div className="panel-tabs">
        {gameTab==="battle" && <button className={`ptab ${rtab==="initiative"?"active":""}`} onClick={()=>switchTab("initiative")}>Init</button>}
        <button className={`ptab ${rtab==="party"?"active":""}`} onClick={()=>switchTab("party")}>Party</button>
        <button className={`ptab ${rtab==="rolls"?"active":""}`} onClick={()=>switchTab("rolls")}>Rolls</button>
        {gameTab==="battle" && <button className={`ptab ${rtab==="legend"?"active":""}`} onClick={()=>switchTab("legend")}>Map</button>}
        <button className={`ptab ${rtab==="chat"?"active":""}`} onClick={()=>switchTab("chat")} style={{position:"relative"}}>
          Chat
          {unread > 0 && rtab !== "chat" && (
            <span style={{position:"absolute",top:4,right:4,background:"var(--crimson-bright)",color:"#fff",borderRadius:"50%",width:14,height:14,fontSize:".52rem",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Cinzel',serif",fontWeight:700}}>
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </button>
      </div>

      {rtab !== "chat" && (
        <div className="panel-body">
          {rtab==="initiative" && (
            <div>
              <div className="section-hdr">⚔ Round {round} · Initiative</div>
              {initOrder.map((t,i)=>{
                const tok=tokens.find(x=>x.id===t.id);
                const hp=tok?.hp??t.hp; const hf=hp/t.maxHp; const isCur=i===turnIdx;
                return (
                  <div key={t.id} style={{display:"flex",alignItems:"center",gap:".5rem",padding:".45rem .5rem",background:isCur?(t.isPlayer?"rgba(91,155,213,.14)":"rgba(239,68,68,.12)"):"rgba(255,255,255,.02)",border:`1px solid ${isCur?(TOKEN_RING[t.cls]||"#888"):"transparent"}`,marginBottom:".28rem",transition:"all .25s",animation:isCur?"initGlow 2s infinite":"none"}}>
                    <div style={{width:22,height:22,borderRadius:"50%",background:TOKEN_RING[t.cls]||"#888",display:"flex",alignItems:"center",justifyContent:"center",fontSize:".58rem",fontWeight:700,color:"#050508",flexShrink:0,opacity:hp<=0?.35:1}}>{t.init}</div>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:".7rem",color:hp<=0?"#5a5a6a":isCur?(TOKEN_RING[t.cls]||"var(--parchment)"):"var(--parchment)",fontFamily:"'Cinzel',serif",fontWeight:isCur?600:400,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{t.name}</div>
                      <div style={{height:3,background:"var(--slate)",marginTop:2,borderRadius:2}}>
                        <div style={{height:"100%",borderRadius:2,width:`${hf*100}%`,background:hf>.5?"#4caf7a":hf>.25?"#f0c55a":"#ef4444",transition:"width .4s"}}/>
                      </div>
                    </div>
                    <div style={{fontSize:".56rem",color:"var(--rune)",flexShrink:0}}>{t.isPlayer?"PC":"NPC"}</div>
                  </div>
                );
              })}
            </div>
          )}

          {rtab==="party" && (
            <div>
              <div className="section-hdr">⚔ Party</div>
              {partyMembers.map(m=>(
                <div key={m.name} style={{display:"flex",alignItems:"center",gap:".6rem",padding:".55rem",background:"var(--slate)",border:"1px solid var(--rune)",marginBottom:".4rem"}}>
                  <div style={{width:8,height:8,borderRadius:"50%",background:"#4caf7a",boxShadow:"0 0 5px #4caf7a",flexShrink:0}}/>
                  <div style={{width:28,height:28,background:"var(--ghost)",border:"1px solid var(--rune)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:".9rem",flexShrink:0}}>{m.emoji}</div>
                  <div style={{flex:1}}>
                    <div style={{fontFamily:"'Cinzel',serif",fontSize:".72rem",color:"var(--parchment)"}}>{m.name}</div>
                    <div style={{fontSize:".62rem",color:"var(--silver)"}}>{m.class}</div>
                  </div>
                  <div style={{fontSize:".85rem"}}>{m.flag}</div>
                </div>
              ))}
              <div className="gold-line"/>
              <div style={{fontSize:".68rem",color:"var(--silver)",lineHeight:1.6}}>🌍 Auto-translation active</div>
              <button onClick={()=>switchTab("chat")} style={{marginTop:".75rem",width:"100%",background:"rgba(91,155,213,.08)",border:"1px solid rgba(91,155,213,.25)",color:"#5b9bd5",fontFamily:"'Cinzel',serif",fontSize:".65rem",letterSpacing:".1em",padding:".45rem",cursor:"pointer",textTransform:"uppercase",transition:"all .2s"}}
                onMouseEnter={e=>e.currentTarget.style.background="rgba(91,155,213,.15)"}
                onMouseLeave={e=>e.currentTarget.style.background="rgba(91,155,213,.08)"}
              >💬 Open Party Chat</button>
            </div>
          )}

          {rtab==="rolls" && (
            <div>
              <div className="section-hdr">🎲 Roll History</div>
              {diceLog.length===0&&<div style={{fontSize:".7rem",color:"var(--rune)",fontStyle:"italic"}}>No rolls yet…</div>}
              {diceLog.map((d,i)=>(
                <div key={d.id||i} style={{display:"flex",justifyContent:"space-between",fontSize:".68rem",color:i===0?"var(--parchment)":"var(--silver)",padding:".25rem 0",borderBottom:"1px solid rgba(255,255,255,.04)"}}>
                  <span>{d.label}</span>
                  <span>d{d.sides}: <span style={{color:d.result===d.sides?"var(--gold-bright)":d.result===1?"var(--crimson-bright)":"inherit",fontWeight:600}}>{d.result}</span></span>
                </div>
              ))}
            </div>
          )}

          {rtab==="legend" && (
            <div>
              <div className="section-hdr">🗺 Map Legend</div>
              {[
                {col:"rgba(74,158,255,.5)",label:"Movement range"},
                {col:"#252020",label:"Wall / impassable"},
                {col:"#222215",label:"Difficult terrain (×2)"},
                {col:"rgba(0,0,0,.8)",label:"Fog of war"},
              ].map(l=>(
                <div key={l.label} style={{display:"flex",alignItems:"center",gap:".6rem",marginBottom:".5rem",fontSize:".7rem",color:"var(--silver)"}}>
                  <div style={{width:14,height:14,background:l.col,border:"1px solid var(--rune)",flexShrink:0}}/>{l.label}
                </div>
              ))}
              <div className="gold-line"/>
              <div style={{fontSize:".68rem",color:"var(--silver)",lineHeight:1.7}}>
                <div style={{color:"var(--gold)",fontFamily:"'Cinzel',serif",fontSize:".62rem",letterSpacing:".1em",marginBottom:".4rem"}}>CONTROLS</div>
                <div>• Click token → select + show range</div>
                <div>• Drag or click blue cell → move</div>
                <div>• One move per turn</div>
                <div>• End Turn → advance initiative</div>
              </div>
            </div>
          )}
        </div>
      )}

      {rtab === "chat" && (
        <PartyChatPanel chatMessages={chatMessages} sendChat={sendChat} character={character}/>
      )}
    </div>
  );
}

function BattleMapPanel({ onRoll, mapTokens, setMapTokens, mapState, setMapState }) {
  const canvasRef = useRef(null);
  const { selId, fog, range, moved, drag, dragXY, hoverCell } = mapState;

  const setField = useCallback((k,v) => setMapState(p=>({...p,[k]:v})), [setMapState]);

  useEffect(()=>{
    const cv=canvasRef.current; if(!cv)return;
    const ctx=cv.getContext("2d");
    ctx.clearRect(0,0,MAP_W,MAP_H);
    drawGrid(ctx);
    if(!moved) drawMoveRange(ctx,range,hoverCell);
    mapTokens.forEach(t=>{
      if(drag?.id===t.id)return;
      if(!t.isPlayer&&!fog.has(`${t.col},${t.row}`))return;
      if(!t.isPlayer) drawToken(ctx,t,t.col*CELL,t.row*CELL,selId===t.id,false);
    });
    drawFog(ctx,fog);
    mapTokens.forEach(t=>{
      if(drag?.id===t.id)return;
      if(t.isPlayer) drawToken(ctx,t,t.col*CELL,t.row*CELL,selId===t.id,false);
    });
    if(drag&&dragXY){
      const t=mapTokens.find(x=>x.id===drag.id);
      if(t) drawToken(ctx,t,dragXY.x-CELL/2,dragXY.y-CELL/2,true,true);
    }
  },[mapTokens,fog,range,moved,selId,drag,dragXY,hoverCell]);

  const getCell=useCallback((e)=>{
    const rect=canvasRef.current.getBoundingClientRect();
    const sx=MAP_W/rect.width, sy=MAP_H/rect.height;
    const x=(e.clientX-rect.left)*sx, y=(e.clientY-rect.top)*sy;
    return{col:Math.floor(x/CELL),row:Math.floor(y/CELL),x,y};
  },[]);

  const onDown=useCallback((e)=>{
    const{col,row,x,y}=getCell(e);
    const hit=mapTokens.find(t=>t.col===col&&t.row===row&&t.isPlayer);
    if(hit){
      setField("selId",hit.id);setField("range",computeRange(hit,mapTokens));
      setField("moved",false);setField("drag",{id:hit.id});setField("dragXY",{x,y});
      e.preventDefault();
    } else if(selId&&range.has(`${col},${row}`)&&!moved){
      setMapTokens(prev=>{const upd=prev.map(t=>t.id===selId?{...t,col,row}:t);setField("fog",computeFog(upd));return upd;});
      setField("range",new Set());setField("moved",true);
    } else { setField("selId",null);setField("range",new Set()); }
  },[mapTokens,selId,range,moved,getCell,setField,setMapTokens]);

  const onMove=useCallback((e)=>{
    const{col,row,x,y}=getCell(e);
    setField("hoverCell",{c:col,r:row});
    if(drag) setField("dragXY",{x,y});
  },[drag,getCell,setField]);

  const onUp=useCallback((e)=>{
    if(!drag)return;
    const{col,row}=getCell(e);
    if(range.has(`${col},${row}`)&&!moved){
      setMapTokens(prev=>{const upd=prev.map(t=>t.id===drag.id?{...t,col,row}:t);setField("fog",computeFog(upd));return upd;});
      setField("range",new Set());setField("moved",true);
    }
    setField("drag",null);setField("dragXY",null);
  },[drag,range,moved,getCell,setField,setMapTokens]);

  const selToken = mapTokens.find(t=>t.id===selId);

  return (
    <div style={{display:"flex",flexDirection:"column",overflow:"hidden",flex:1}}>
      <div className="map-wrap">
        <canvas ref={canvasRef} width={MAP_W} height={MAP_H}
          style={{display:"block",width:"100%",height:"100%",cursor:drag?"grabbing":"default"}}
          onMouseDown={onDown} onMouseMove={onMove} onMouseUp={onUp}
          onMouseLeave={()=>{setField("hoverCell",null);if(drag){setField("drag",null);setField("dragXY",null);}}}
        />
        {selToken&&(
          <div style={{position:"absolute",bottom:8,left:8,background:"rgba(5,5,15,.93)",border:`1px solid ${TOKEN_RING[selToken.cls]||"var(--gold-dim)"}`,padding:".55rem .8rem",minWidth:150,pointerEvents:"none"}}>
            <div style={{fontFamily:"'Cinzel',serif",fontSize:".75rem",color:TOKEN_RING[selToken.cls]||"var(--gold)",marginBottom:".3rem"}}>{selToken.name}</div>
            <div style={{fontSize:".65rem",color:"var(--silver)",display:"grid",gridTemplateColumns:"1fr 1fr",gap:".15rem .7rem"}}>
              <span>HP: <span style={{color:"#4caf7a"}}>{selToken.hp}/{selToken.maxHp}</span></span>
              <span>AC: {selToken.ac}</span>
              <span>SPD: {selToken.spd*5}ft</span>
              <span>INIT: {selToken.init}</span>
            </div>
            {!moved&&range.size>0&&<div style={{fontSize:".6rem",color:"var(--blue)",marginTop:".35rem"}}>◆ {range.size} cells reachable</div>}
            {moved&&<div style={{fontSize:".6rem",color:"var(--gold-dim)",marginTop:".35rem"}}>✓ Moved this turn</div>}
          </div>
        )}
        <div style={{position:"absolute",top:7,left:7,background:"rgba(5,5,15,.82)",border:"1px solid var(--rune)",padding:".35rem .5rem",fontSize:".56rem",color:"var(--silver)",letterSpacing:".07em",lineHeight:1.75,pointerEvents:"none"}}>
          <div style={{color:"var(--gold)",fontFamily:"'Cinzel',serif",marginBottom:".2rem",fontSize:".6rem"}}>LEGEND</div>
          <div><span style={{color:"rgba(74,158,255,.6)"}}>▪</span> Move range</div>
          <div><span style={{color:"#252020"}}>▪</span> Wall</div>
          <div><span style={{color:"#1c1c12"}}>▪</span> Difficult</div>
          <div><span style={{color:"rgba(0,0,0,.8)"}}>▪</span> Fog</div>
        </div>
      </div>
      <div className="dice-bar">
        <span style={{fontSize:".62rem",letterSpacing:".18em",color:"var(--gold-dim)",flexShrink:0,fontFamily:"'Cinzel',serif"}}>ROLL:</span>
        {[4,6,8,10,12,20,100].map(d=>(
          <button key={d} className="dice-btn" onClick={()=>onRoll(d,selToken)}>d{d}</button>
        ))}
        <div style={{flex:1}}/>
        <span style={{fontSize:".6rem",color:"var(--rune)",letterSpacing:".06em"}}>Click token → drag/click blue to move</span>
      </div>
    </div>
  );
}

function NarrativePanel({ gameMessages, isTyping, inputText, setInputText, sendMessage, scrollRef }) {
  const handleKey = (e) => { if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();sendMessage(inputText);} };

  const { listening, interim, toggle, supported } = useSpeech((text) => {
    setInputText(prev => (prev ? prev + " " + text : text));
  });

  return (
    <div className="narrative-col">
      <div className="narrative-scroll" ref={scrollRef}>
        {gameMessages.map(msg=>(
          <div key={msg.id} className={`msg ${msg.type}`}>
            {msg.type==="dm"&&<div className="msg-head">🎲 Dungeon Master</div>}
            {msg.type==="player"&&<div className="msg-head" style={{justifyContent:"flex-end"}}>You 🧝</div>}
            <div className="msg-bubble">{msg.text}</div>
          </div>
        ))}
        {isTyping&&(
          <div className="msg dm">
            <div className="msg-head">🎲 Dungeon Master</div>
            <div className="typing-ind"><div className="dot"/><div className="dot"/><div className="dot"/></div>
          </div>
        )}
      </div>
      <div className="input-area">
        <div style={{display:"flex",gap:".4rem",flexWrap:"wrap",marginBottom:".65rem"}}>
          {QUICK_ACTIONS.map(a=>(
            <button key={a} className="quick-btn" onClick={()=>sendMessage(a)} disabled={isTyping}>{a}</button>
          ))}
        </div>
        {listening && (
          <div className="mic-interim" style={{marginBottom:".5rem"}}>
            🎙 {interim || <span style={{color:"var(--rune)"}}>Listening…</span>}
          </div>
        )}
        <div style={{display:"flex",gap:".55rem",alignItems:"flex-end"}}>
          {supported && (
            <button className={`mic-btn ${listening?"active":""}`} onClick={toggle} disabled={isTyping}
              title={listening?"Stop recording":"Speak your action"} style={{height:56,width:46,borderRadius:4}}>
              {listening ? "⏹" : "🎙"}
            </button>
          )}
          <textarea className="game-input" value={inputText} onChange={e=>setInputText(e.target.value)}
            onKeyDown={handleKey}
            placeholder={listening ? "Listening… speak your action" : "Describe your action… (Enter to send)"}
            disabled={isTyping} style={{flex:1}}/>
          <button className="send-btn" onClick={()=>sendMessage(inputText)} disabled={isTyping||!inputText.trim()}>
            {isTyping?"…":"Declare →"}
          </button>
        </div>
        {!supported && (
          <div style={{fontSize:".62rem",color:"var(--rune)",marginTop:".35rem",fontStyle:"italic"}}>
            Voice input requires Chrome or Edge
          </div>
        )}
      </div>
    </div>
  );
}

function GameView({ character, session, gameMessages, isTyping, inputText, setInputText, sendMessage, scrollRef, onLeave }) {
  const [gameTab, setGameTab] = useState("narrative");
  const [mapTokens, setMapTokens] = useState(INIT_TOKENS);
  const [mapState, setMapState]   = useState({selId:null,fog:computeFog(INIT_TOKENS),range:new Set(),moved:false,drag:null,dragXY:null,hoverCell:null});
  const [turnIdx,   setTurnIdx]   = useState(0);
  const [round,     setRound]     = useState(1);
  const [diceLog,   setDiceLog]   = useState([]);
  const [diceAnims, setDiceAnims] = useState([]);
  const [chatMessages, setChatMessages] = useState([
    { id:1, type:"system", text:"Party chat is private — only your group sees this", time:"" },
    { id:2, sender:"Valdris", flag:"🇺🇸", text:"Ready when you are. I'll take point.", time:"now", type:"msg" },
    { id:3, sender:"Aelindra", flag:"🇯🇵", text:"保護呪文を準備しました！ (Protection spells ready!)", time:"now", type:"msg" },
  ]);
  const [chatUnread, setChatUnread] = useState(2);

  const sendChat = useCallback((text) => {
    const now = new Date().toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"});
    setChatMessages(p=>[...p, {id:Date.now(), sender:character.name||"You", flag:"🇺🇸", text, time:now, type:"msg"}]);
    if (Math.random() < 0.4) {
      const replies = [
        {sender:"Valdris", flag:"🇺🇸", text:"Got it. Covering you."},
        {sender:"Torrog",  flag:"🇧🇷", text:"TORROG SMASH!"},
        {sender:"Aelindra",flag:"🇯🇵", text:"Understood. I'll cast from range."},
      ];
      const r = replies[Math.floor(Math.random()*replies.length)];
      setTimeout(()=>{
        setChatMessages(p=>[...p, {id:Date.now()+1, ...r, time:now, type:"msg"}]);
        setChatUnread(n=>n+1);
      }, 1200 + Math.random()*1800);
    }
  }, [character.name]);

  const clearChatUnread = useCallback(() => setChatUnread(0), []);
  const initOrder = [...INIT_TOKENS].sort((a,b)=>b.init-a.init);
  const curActor  = initOrder[turnIdx];

  const handleRoll = useCallback((sides, actorToken) => {
    const result = Math.floor(Math.random()*sides)+1;
    const actor  = actorToken || mapTokens.find(t=>t.id===curActor?.id);
    const label  = actor?.name || character.name || "Unknown";
    const entry  = { id:Date.now(), sides, result, label,
      x: actor ? actor.col*CELL+CELL/2 : MAP_W/2,
      y: actor ? actor.row*CELL-10     : MAP_H/2 };
    setDiceLog(p=>[entry,...p].slice(0,12));
    setDiceAnims(p=>[...p,entry]);
    setTimeout(()=>setDiceAnims(p=>p.filter(a=>a.id!==entry.id)),2600);
    sendMessage && sendMessage(`[DICE] ${label} rolled d${sides}: ${result}${result===sides?" — NATURAL MAX! ✨":result===1?" — CRITICAL FAIL! 💀":""}`, true);
  },[mapTokens, curActor, character.name, sendMessage]);

  const endTurn = () => {
    setMapState(p=>({...p,moved:false,selId:null,range:new Set()}));
    const next=(turnIdx+1)%initOrder.length;
    setTurnIdx(next);
    if(next===0) setRound(r=>r+1);
  };

  const partyWithPlayer = [
    {name:character.name||"You",class:`${character.charClass} Lv.${character.level}`,flag:"🇺🇸",emoji:CLASSES.find(c=>c.name===character.charClass)?.emoji||"⚔️"},
    ...PARTY_MEMBERS,
  ];

  return (
    <div className="game-shell">
      <div className="game-topbar">
        <div style={{display:"flex",alignItems:"center",gap:"1.2rem"}}>
          <span style={{fontFamily:"'Cinzel Decorative',serif",fontSize:".95rem",color:"var(--gold)"}}>⚔ {session?.title||"The Adventure"}</span>
          <div className="view-tabs">
            <button className={`view-tab ${gameTab==="narrative"?"active":""}`} onClick={()=>setGameTab("narrative")}>📜 Narrative</button>
            <button className={`view-tab ${gameTab==="battle"?"active":""}`} onClick={()=>setGameTab("battle")}>⚔️ Battle Map</button>
          </div>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:".9rem"}}>
          {gameTab==="battle"&&(
            <>
              <span style={{fontSize:".7rem",color:"var(--silver)",fontFamily:"'Cinzel',serif",letterSpacing:".1em"}}>Round {round}</span>
              <span style={{fontFamily:"'Cinzel',serif",fontSize:".72rem",color:curActor?.isPlayer?"var(--blue)":"var(--crimson-bright)",padding:".22rem .7rem",border:`1px solid ${curActor?.isPlayer?"rgba(91,155,213,.4)":"rgba(192,57,43,.4)"}`,background:curActor?.isPlayer?"rgba(91,155,213,.1)":"rgba(192,57,43,.1)"}}>{curActor?.name}</span>
              <button onClick={endTurn} style={{background:"linear-gradient(135deg,var(--gold-dim),var(--gold))",border:"none",color:"var(--void)",fontFamily:"'Cinzel',serif",fontSize:".65rem",letterSpacing:".1em",padding:".38rem .85rem",cursor:"pointer",fontWeight:700}}
                onMouseEnter={e=>e.target.style.filter="brightness(1.2)"}
                onMouseLeave={e=>e.target.style.filter=""}>END TURN ▶</button>
            </>
          )}
          <div style={{display:"flex",alignItems:"center",gap:".4rem"}}>
            <span style={{width:7,height:7,borderRadius:"50%",background:"#4caf7a",boxShadow:"0 0 5px #4caf7a",display:"inline-block",animation:"pulseGlow 2s infinite"}}/>
            <span style={{fontSize:".65rem",color:"#4caf7a",fontFamily:"'Cinzel',serif",letterSpacing:".1em"}}>LIVE</span>
          </div>
          <button className="btn btn-ghost" style={{padding:".35rem .8rem",fontSize:".62rem"}} onClick={onLeave}>← Leave</button>
        </div>
      </div>

      <CharPanel character={character} classes={CLASSES}/>

      {gameTab==="narrative"
        ? <NarrativePanel gameMessages={gameMessages} isTyping={isTyping} inputText={inputText}
            setInputText={setInputText} sendMessage={sendMessage} scrollRef={scrollRef}/>
        : <div style={{position:"relative",display:"flex",flexDirection:"column",overflow:"hidden"}}>
            <BattleMapPanel onRoll={handleRoll} mapTokens={mapTokens} setMapTokens={setMapTokens}
              mapState={mapState} setMapState={setMapState}/>
            {diceAnims.map(a=>{
              const nat=a.result===a.sides?"#f0c55a":a.result===1?"#ef4444":"var(--parchment)";
              const brd=a.result===a.sides?"2px solid #f0c55a":a.result===1?"2px solid #ef4444":"1px solid var(--gold-dim)";
              return (
                <div key={a.id} style={{position:"absolute",left:`calc(${(a.x/MAP_W)*100}%)`,top:`calc(${(a.y/MAP_H)*100}%)`,transform:"translate(-50%,-100%)",pointerEvents:"none",animation:"floatUp 2.6s ease-out forwards",display:"flex",flexDirection:"column",alignItems:"center",gap:2,zIndex:50}}>
                  <div style={{background:"rgba(5,5,15,.92)",border:brd,padding:".28rem .55rem",textAlign:"center"}}>
                    <div style={{fontFamily:"'Cinzel Decorative',serif",fontSize:"1.4rem",color:nat,lineHeight:1}}>{a.result}</div>
                    <div style={{fontSize:".56rem",color:"var(--silver)",letterSpacing:".1em"}}>d{a.sides}</div>
                  </div>
                  {(a.result===a.sides||a.result===1)&&(
                    <div style={{fontSize:".58rem",color:nat,letterSpacing:".1em",fontFamily:"'Cinzel',serif"}}>
                      {a.result===a.sides?"NAT MAX!":"CRIT FAIL"}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
      }

      <RightPanel gameTab={gameTab} tokens={mapTokens} turnIdx={turnIdx}
        initOrder={initOrder} diceLog={diceLog} partyMembers={partyWithPlayer} round={round}
        chatMessages={chatMessages} sendChat={sendChat} character={character}
        unread={chatUnread} clearUnread={clearChatUnread}/>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CHARACTER CREATION
// ─────────────────────────────────────────────────────────────────────────────
const STAT_KEYS = ["str","dex","con","int","wis","cha"];
const STAT_LABELS = {str:"Strength",dex:"Dexterity",con:"Constitution",int:"Intelligence",wis:"Wisdom",cha:"Charisma"};

function CharacterView({ character, setCharacter, onContinue }) {
  const [step, setStep] = useState(0);
  const [assignments, setAssignments] = useState({str:null,dex:null,con:null,int:null,wis:null,cha:null});
  const [pending, setPending] = useState(null);
  const [flexChoices, setFlexChoices] = useState([]);

  const set = (f,v) => setCharacter(p=>({...p,[f]:v}));
  const raceData = RACES_DATA[character.race] || RACES_DATA.Human;
  const classData = CLASSES_DATA[character.charClass] || CLASSES_DATA.Fighter;

  const usedValues = Object.values(assignments).filter(v=>v!==null);
  const assignedCounts = {};
  usedValues.forEach(v=>{ assignedCounts[v]=(assignedCounts[v]||0)+1; });
  const poolWithState = STANDARD_ARRAY.map((v,i)=>{
    assignedCounts[v] = assignedCounts[v]||0;
    const used = assignedCounts[v] > 0;
    if (used) assignedCounts[v]--;
    return {v,i,used};
  });
  const allAssigned = STAT_KEYS.every(k=>assignments[k]!==null);

  function getFinalStats() {
    const base = {};
    STAT_KEYS.forEach(k => base[k] = assignments[k] || 10);
    const rb = raceData.abilityBonuses || {};
    Object.entries(rb).forEach(([k,v])=>{ base[k]=(base[k]||0)+v; });
    flexChoices.forEach(k=>{ if(k && k!=="cha") base[k]=(base[k]||0)+1; });
    if (character.subrace) {
      const sub = raceData.subraces?.find(s=>s.name===character.subrace);
      if (sub?.bonuses) Object.entries(sub.bonuses).forEach(([k,v])=>{ base[k]=(base[k]||0)+v; });
    }
    return base;
  }

  const finalStats = getFinalStats();

  const confirmStats = () => {
    const fs = getFinalStats();
    setCharacter(p=>({...p, stats:fs,
      hp: Math.max(1, classData.hitDie === "d12" ? 12 : classData.hitDie === "d10" ? 10 : classData.hitDie === "d8" ? 8 : 6) + Math.floor((fs.con-10)/2),
      maxHp: Math.max(1, classData.hitDie === "d12" ? 12 : classData.hitDie === "d10" ? 10 : classData.hitDie === "d8" ? 8 : 6) + Math.floor((fs.con-10)/2),
    }));
    onContinue();
  };

  const STEPS = ["Identity","Race","Class","Abilities"];

  const card = (children, extra={}) => (
    <div style={{background:"var(--coal)",border:"1px solid var(--gold-dim)",padding:"1.75rem",...extra}}>{children}</div>
  );

  const StepHeader = () => (
    <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:0,marginBottom:"2rem"}}>
      {STEPS.map((s,i)=>(
        <div key={s} style={{display:"flex",alignItems:"center"}}>
          <div onClick={()=>i<step&&setStep(i)} style={{display:"flex",alignItems:"center",gap:".5rem",padding:".4rem .9rem",background:i===step?"rgba(201,168,76,.15)":"transparent",border:i===step?"1px solid var(--gold)":i<step?"1px solid var(--gold-dim)":"1px solid var(--rune)",cursor:i<step?"pointer":"default",transition:"all .2s"}}>
            <div style={{width:20,height:20,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",background:i<step?"var(--gold)":i===step?"var(--gold-dim)":"var(--rune)",color:i<step?"var(--void)":"var(--silver)",fontSize:".65rem",fontFamily:"'Cinzel',serif",fontWeight:700,flexShrink:0}}>{i<step?"✓":i+1}</div>
            <span style={{fontFamily:"'Cinzel',serif",fontSize:".68rem",letterSpacing:".1em",color:i===step?"var(--gold)":i<step?"var(--parchment-dim)":"var(--rune)",textTransform:"uppercase"}}>{s}</span>
          </div>
          {i<STEPS.length-1&&<div style={{width:24,height:1,background:i<step?"var(--gold-dim)":"var(--rune)"}}/>}
        </div>
      ))}
    </div>
  );

  const PreviewStrip = () => {
    const cls = CLASSES.find(c=>c.name===character.charClass)||CLASSES[0];
    return (
      <div style={{background:"var(--void)",border:"1px solid var(--gold-dim)",padding:"1rem 1.5rem",display:"flex",alignItems:"center",gap:"1.25rem",marginBottom:"1.5rem"}}>
        <div style={{fontSize:"2rem",width:48,height:48,display:"flex",alignItems:"center",justifyContent:"center",background:"var(--slate)",border:"1px solid var(--rune)",flexShrink:0}}>{cls.emoji}</div>
        <div style={{flex:1}}>
          <div style={{fontFamily:"'Cinzel',serif",fontSize:"1rem",color:"var(--gold)"}}>{character.name||<span style={{color:"var(--rune)",fontStyle:"italic"}}>Unnamed Hero</span>}</div>
          <div style={{fontSize:".78rem",color:"var(--silver)",marginTop:".2rem",fontStyle:"italic"}}>{character.race}{character.subrace?` (${character.subrace})`:""} {character.charClass} · Lv.{character.level} · {character.alignment}</div>
        </div>
        {allAssigned && (
          <div style={{display:"flex",gap:".6rem",flexWrap:"wrap"}}>
            {STAT_KEYS.map(k=>(
              <div key={k} style={{textAlign:"center"}}>
                <div style={{fontFamily:"'Cinzel',serif",fontSize:".55rem",color:"var(--silver)",letterSpacing:".1em",textTransform:"uppercase"}}>{k}</div>
                <div style={{fontFamily:"'Cinzel',serif",fontSize:".85rem",color:"var(--gold)",fontWeight:600}}>{finalStats[k]}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const StepIdentity = () => (
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"1.25rem"}}>
      {[["name","Character Name","text",null],["background","Background","sel",BACKGROUNDS],["alignment","Alignment","sel",ALIGNMENTS],["level","Level","sel",null]].map(([f,lbl,type,opts])=>(
        <div key={f} style={{display:"flex",flexDirection:"column",gap:".4rem"}}>
          <label className="field-label">{lbl}</label>
          {type==="text" && <input className="field-input" value={character[f]} onChange={e=>set(f,e.target.value)} placeholder="Enter name…"/>}
          {type==="sel" && f!=="level" && <select className="field-input" value={character[f]} onChange={e=>set(f,e.target.value)}>{(opts||[]).map(o=><option key={o}>{o}</option>)}</select>}
          {f==="level" && <select className="field-input" value={character.level} onChange={e=>set("level",parseInt(e.target.value))}>{[...Array(20)].map((_,i)=><option key={i+1} value={i+1}>Level {i+1}</option>)}</select>}
        </div>
      ))}
      <div style={{gridColumn:"1/-1",display:"flex",flexDirection:"column",gap:".4rem"}}>
        <label className="field-label">Backstory</label>
        <textarea className="field-input" style={{height:80,resize:"vertical"}} value={character.backstory} onChange={e=>set("backstory",e.target.value)} placeholder="Tell the DM your history, motivations, secrets…"/>
      </div>
    </div>
  );

  const StepRace = () => {
    const rd = RACES_DATA[character.race]||RACES_DATA.Human;
    return (
      <div style={{display:"grid",gridTemplateColumns:"220px 1fr",gap:"1.5rem"}}>
        <div style={{display:"flex",flexDirection:"column",gap:".35rem"}}>
          <div className="field-label" style={{marginBottom:".5rem"}}>Choose Race</div>
          {Object.entries(RACES_DATA).map(([name,d])=>(
            <button key={name} onClick={()=>{set("race",name);set("subrace",d.subraces?.[0]?.name||"");}}
              style={{background:character.race===name?"rgba(201,168,76,.12)":"transparent",border:character.race===name?"1px solid var(--gold)":"1px solid var(--rune)",color:character.race===name?"var(--gold)":"var(--silver)",fontFamily:"'Cinzel',serif",fontSize:".75rem",letterSpacing:".08em",padding:".55rem .75rem",cursor:"pointer",textAlign:"left",display:"flex",alignItems:"center",gap:".6rem",transition:"all .18s"}}>
              <span>{d.emoji}</span><span>{name}</span>
              <span style={{marginLeft:"auto",fontSize:".6rem",color:"var(--rune)"}}>{Object.entries(d.abilityBonuses||{}).map(([k,v])=>`${k.toUpperCase()}+${v}`).join(" ")}</span>
            </button>
          ))}
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:"1rem"}}>
          <div style={{background:"var(--void)",border:`1px solid ${rd.color}40`,padding:"1.25rem"}}>
            <div style={{display:"flex",alignItems:"center",gap:".75rem",marginBottom:".75rem"}}>
              <span style={{fontSize:"2rem"}}>{rd.emoji}</span>
              <div>
                <div style={{fontFamily:"'Cinzel',serif",fontSize:"1.1rem",color:rd.color}}>{character.race}</div>
                <div style={{fontSize:".72rem",color:"var(--silver)",marginTop:".15rem"}}>Speed {rd.speed} ft · {rd.size}</div>
              </div>
              <div style={{marginLeft:"auto",display:"flex",gap:".4rem",flexWrap:"wrap",justifyContent:"flex-end"}}>
                {Object.entries(rd.abilityBonuses||{}).map(([k,v])=>(
                  <span key={k} style={{fontFamily:"'Cinzel',serif",fontSize:".65rem",padding:".2rem .5rem",background:"rgba(201,168,76,.1)",border:"1px solid var(--gold-dim)",color:"var(--gold)"}}>{k.toUpperCase()} +{v}</span>
                ))}
              </div>
            </div>
            <div style={{fontSize:".8rem",color:"var(--parchment-dim)",fontStyle:"italic",lineHeight:1.6,marginBottom:".9rem"}}>{rd.description}</div>
            {rd.traits.map(t=>(
              <div key={t.name} style={{padding:".4rem 0",borderTop:"1px solid var(--rune)"}}>
                <span style={{fontFamily:"'Cinzel',serif",fontSize:".68rem",color:"var(--gold)",letterSpacing:".05em"}}>{t.name}.</span>{" "}
                <span style={{fontSize:".78rem",color:"var(--silver)",lineHeight:1.55}}>{t.desc}</span>
              </div>
            ))}
          </div>
          {rd.subraces?.length>0 && (
            <div>
              <div className="field-label" style={{marginBottom:".6rem"}}>Subrace</div>
              <div style={{display:"flex",gap:".6rem",flexWrap:"wrap"}}>
                {rd.subraces.map(s=>(
                  <button key={s.name} onClick={()=>set("subrace",s.name)}
                    style={{background:character.subrace===s.name?"rgba(201,168,76,.12)":"transparent",border:character.subrace===s.name?"1px solid var(--gold)":"1px solid var(--rune)",color:character.subrace===s.name?"var(--gold)":"var(--silver)",fontFamily:"'Cinzel',serif",fontSize:".72rem",padding:".4rem .85rem",cursor:"pointer",transition:"all .18s"}}>{s.name}</button>
                ))}
              </div>
              {character.subrace && (() => {
                const sub = rd.subraces.find(s=>s.name===character.subrace);
                return sub ? (
                  <div style={{marginTop:".75rem",background:"var(--void)",border:"1px solid var(--rune)",padding:"1rem"}}>
                    <div style={{fontFamily:"'Cinzel',serif",fontSize:".72rem",color:"var(--gold)",marginBottom:".5rem"}}>{sub.name} Traits</div>
                    {sub.traits.map(t=>(
                      <div key={t.name} style={{padding:".3rem 0",borderTop:"1px solid var(--rune)"}}>
                        <span style={{fontFamily:"'Cinzel',serif",fontSize:".66rem",color:"var(--gold-dim)"}}>{t.name}.</span>{" "}
                        <span style={{fontSize:".76rem",color:"var(--silver)"}}>{t.desc}</span>
                      </div>
                    ))}
                  </div>
                ) : null;
              })()}
            </div>
          )}
          {character.race==="Half-Elf" && (
            <div>
              <div className="field-label" style={{marginBottom:".5rem"}}>Choose 2 additional ability scores to increase by +1 (not Charisma)</div>
              <div style={{display:"flex",gap:".5rem",flexWrap:"wrap"}}>
                {STAT_KEYS.filter(k=>k!=="cha").map(k=>{
                  const chosen = flexChoices.includes(k);
                  const disabled = !chosen && flexChoices.length >= 2;
                  return (
                    <button key={k} disabled={disabled}
                      onClick={()=>setFlexChoices(p=>p.includes(k)?p.filter(x=>x!==k):[...p,k])}
                      style={{background:chosen?"rgba(201,168,76,.15)":"transparent",border:chosen?"1px solid var(--gold)":"1px solid var(--rune)",color:chosen?"var(--gold)":disabled?"var(--rune)":"var(--silver)",fontFamily:"'Cinzel',serif",fontSize:".7rem",padding:".35rem .7rem",cursor:disabled?"not-allowed":"pointer",transition:"all .18s",textTransform:"uppercase"}}
                    >{k.toUpperCase()}</button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  const StepClass = () => {
    const cd = CLASSES_DATA[character.charClass]||CLASSES_DATA.Fighter;
    return (
      <div style={{display:"grid",gridTemplateColumns:"220px 1fr",gap:"1.5rem"}}>
        <div style={{display:"flex",flexDirection:"column",gap:".35rem"}}>
          <div className="field-label" style={{marginBottom:".5rem"}}>Choose Class</div>
          {Object.entries(CLASSES_DATA).map(([name,d])=>(
            <button key={name} onClick={()=>set("charClass",name)}
              style={{background:character.charClass===name?"rgba(201,168,76,.12)":"transparent",border:character.charClass===name?`1px solid ${d.color}`:"1px solid var(--rune)",color:character.charClass===name?d.color:"var(--silver)",fontFamily:"'Cinzel',serif",fontSize:".75rem",letterSpacing:".08em",padding:".55rem .75rem",cursor:"pointer",textAlign:"left",display:"flex",alignItems:"center",gap:".6rem",transition:"all .18s"}}>
              <span>{d.emoji}</span><span>{name}</span>
              <span style={{marginLeft:"auto",fontSize:".58rem",color:"var(--rune)"}}>{d.hitDie}</span>
            </button>
          ))}
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:"1rem"}}>
          <div style={{background:"var(--void)",border:`1px solid ${cd.color}40`,padding:"1.25rem"}}>
            <div style={{display:"flex",alignItems:"center",gap:".75rem",marginBottom:".75rem"}}>
              <span style={{fontSize:"2rem"}}>{cd.emoji}</span>
              <div>
                <div style={{fontFamily:"'Cinzel',serif",fontSize:"1.1rem",color:cd.color}}>{character.charClass}</div>
                <div style={{fontSize:".72rem",color:"var(--silver)",marginTop:".15rem"}}>Hit Die: {cd.hitDie} · Primary: {cd.primaryAbility}</div>
              </div>
            </div>
            <div style={{fontSize:".8rem",color:"var(--parchment-dim)",fontStyle:"italic",lineHeight:1.6,marginBottom:".9rem"}}>{cd.description}</div>
            {[["Saving Throws",cd.savingThrows.join(", ")],["Armor",cd.armorProf],["Weapons",cd.weaponProf]].map(([label,val])=>(
              <div key={label} style={{display:"flex",gap:".5rem",padding:".35rem 0",borderTop:"1px solid var(--rune)"}}>
                <span style={{fontFamily:"'Cinzel',serif",fontSize:".66rem",color:"var(--gold-dim)",minWidth:90,flexShrink:0}}>{label}</span>
                <span style={{fontSize:".75rem",color:"var(--silver)",lineHeight:1.5}}>{val}</span>
              </div>
            ))}
          </div>
          <div>
            <div className="field-label" style={{marginBottom:".7rem"}}>1st Level Features</div>
            {cd.features.map(f=>(
              <div key={f.name} style={{background:"var(--void)",border:"1px solid var(--rune)",padding:".9rem 1rem",marginBottom:".5rem"}}>
                <div style={{fontFamily:"'Cinzel',serif",fontSize:".72rem",color:cd.color,marginBottom:".35rem"}}>{f.name}</div>
                <div style={{fontSize:".78rem",color:"var(--silver)",lineHeight:1.6}}>{f.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const StepAbilities = () => {
    const handlePoolClick = (val, poolIdx) => {
      if (pending?.val===val && pending?.idx===poolIdx) { setPending(null); return; }
      setPending({val, idx:poolIdx});
    };
    const handleStatClick = (statKey) => {
      if (!pending) { if (assignments[statKey]!==null) { setAssignments(p=>({...p,[statKey]:null})); } return; }
      setAssignments(p=>({...p,[statKey]:pending.val}));
      setPending(null);
    };

    return (
      <div>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"1.25rem",flexWrap:"wrap",gap:".75rem"}}>
          <div>
            <div className="field-label" style={{marginBottom:".25rem"}}>Standard Array Assignment</div>
            <div style={{fontSize:".75rem",color:"var(--silver)",fontStyle:"italic"}}>Click a value from the pool, then click an ability score to assign it.</div>
          </div>
          <button onClick={()=>setAssignments({str:null,dex:null,con:null,int:null,wis:null,cha:null})}
            style={{background:"transparent",border:"1px solid var(--rune)",color:"var(--silver)",fontFamily:"'Cinzel',serif",fontSize:".65rem",letterSpacing:".1em",padding:".35rem .75rem",cursor:"pointer",textTransform:"uppercase",transition:"all .2s"}}
            onMouseEnter={e=>{e.target.style.borderColor="var(--gold-dim)";e.target.style.color="var(--gold)";}}
            onMouseLeave={e=>{e.target.style.borderColor="var(--rune)";e.target.style.color="var(--silver)";}}
          >Reset</button>
        </div>
        <div style={{marginBottom:"1.5rem"}}>
          <div className="field-label" style={{marginBottom:".6rem"}}>Available Values</div>
          <div style={{display:"flex",gap:".6rem",flexWrap:"wrap"}}>
            {poolWithState.map(({v,i,used})=>{
              const isPicked = pending?.val===v && pending?.idx===i;
              return (
                <button key={i} disabled={used} onClick={()=>!used&&handlePoolClick(v,i)}
                  style={{width:52,height:52,background:used?"var(--void)":isPicked?"rgba(201,168,76,.25)":"var(--slate)",border:used?"1px dashed var(--rune)":isPicked?"2px solid var(--gold)":"1px solid var(--rune)",color:used?"var(--rune)":isPicked?"var(--gold)":"var(--parchment)",fontFamily:"'Cinzel Decorative',serif",fontSize:"1.3rem",cursor:used?"default":"pointer",transition:"all .18s",opacity:used?0.4:1,position:"relative"}}>
                  {v}
                  {isPicked&&<div style={{position:"absolute",top:-6,right:-6,width:12,height:12,borderRadius:"50%",background:"var(--gold)",fontSize:".5rem",display:"flex",alignItems:"center",justifyContent:"center",color:"var(--void)",fontWeight:700}}>✓</div>}
                </button>
              );
            })}
          </div>
          {pending && <div style={{marginTop:".5rem",fontSize:".72rem",color:"var(--gold)",fontFamily:"'Cinzel',serif",letterSpacing:".08em"}}>◆ {pending.val} selected — click an ability score to assign it</div>}
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(6,1fr)",gap:".85rem",marginBottom:"1.25rem"}}>
          {STAT_KEYS.map(k=>{
            const base = assignments[k];
            const rb = (raceData.abilityBonuses||{})[k]||0;
            const subBonus = (() => { if (character.subrace) { const sub = raceData.subraces?.find(s=>s.name===character.subrace); return (sub?.bonuses||{})[k]||0; } return 0; })();
            const flexBonus = flexChoices.includes(k)?1:0;
            const total = (base||0)+rb+subBonus+flexBonus;
            const isActive = pending!==null && base===null;
            const hasValue = base!==null;
            return (
              <div key={k} onClick={()=>handleStatClick(k)}
                style={{background:isActive?"rgba(74,158,255,.08)":hasValue?"var(--slate)":"var(--void)",border:isActive?"1px solid rgba(74,158,255,.5)":hasValue?"1px solid var(--gold-dim)":"1px dashed var(--rune)",padding:"1rem .5rem",textAlign:"center",cursor:pending||hasValue?"pointer":"default",transition:"all .18s",position:"relative"}}>
                <div style={{fontFamily:"'Cinzel',serif",fontSize:".6rem",letterSpacing:".15em",color:"var(--silver)",textTransform:"uppercase",marginBottom:".35rem"}}>{k}</div>
                {hasValue ? (
                  <>
                    <div style={{fontFamily:"'Cinzel Decorative',serif",fontSize:"1.9rem",color:"var(--gold)",lineHeight:1}}>{total}</div>
                    <div style={{fontSize:".68rem",color:"var(--silver)",margin:".2rem 0"}}>{modStr(total)}</div>
                    {(rb+subBonus+flexBonus)>0&&<div style={{fontSize:".58rem",color:"var(--gold-dim)"}}>{base} + {rb+subBonus+flexBonus}</div>}
                    <div style={{fontSize:".55rem",color:"var(--rune)",marginTop:".3rem"}}>click to unassign</div>
                  </>
                ) : (
                  <div style={{color:"var(--rune)",fontSize:"1.5rem",lineHeight:1.2,padding:".3rem 0"}}>—</div>
                )}
                {isActive&&<div style={{position:"absolute",inset:0,border:"2px solid rgba(74,158,255,.4)",pointerEvents:"none"}}/>}
              </div>
            );
          })}
        </div>
        <div style={{background:"var(--void)",border:"1px solid var(--rune)",padding:".9rem 1.1rem"}}>
          <div style={{fontFamily:"'Cinzel',serif",fontSize:".65rem",letterSpacing:".15em",color:"var(--gold-dim)",marginBottom:".5rem"}}>RACIAL BONUSES APPLIED — {character.race}{character.subrace?` / ${character.subrace}`:""}</div>
          <div style={{display:"flex",gap:".8rem",flexWrap:"wrap"}}>
            {STAT_KEYS.map(k=>{
              const rb=(raceData.abilityBonuses||{})[k]||0;
              const sub=raceData.subraces?.find(s=>s.name===character.subrace);
              const sb=(sub?.bonuses||{})[k]||0;
              const fb=flexChoices.includes(k)?1:0;
              const total=rb+sb+fb;
              if(total===0) return null;
              return <span key={k} style={{fontFamily:"'Cinzel',serif",fontSize:".7rem",color:"var(--gold)",padding:".2rem .5rem",background:"rgba(201,168,76,.08)",border:"1px solid var(--gold-dim)"}}>{k.toUpperCase()} +{total}</span>;
            })}
            {STAT_KEYS.every(k=>{const rb=(raceData.abilityBonuses||{})[k]||0;const sub=raceData.subraces?.find(s=>s.name===character.subrace);const sb=(sub?.bonuses||{})[k]||0;const fb=flexChoices.includes(k)?1:0;return rb+sb+fb===0;})&&(
              <span style={{fontSize:".75rem",color:"var(--rune)",fontStyle:"italic"}}>No racial bonuses yet</span>
            )}
          </div>
        </div>
        {!allAssigned&&(
          <div style={{marginTop:".9rem",fontSize:".75rem",color:"var(--crimson-bright)",fontFamily:"'Cinzel',serif",letterSpacing:".08em"}}>
            ⚠ Assign all 6 values before continuing ({STAT_KEYS.filter(k=>assignments[k]===null).length} remaining)
          </div>
        )}
      </div>
    );
  };

  const canAdvance = () => {
    if(step===0) return !!character.name;
    if(step===1) return true;
    if(step===2) return true;
    if(step===3) return allAssigned && (character.race!=="Half-Elf" || flexChoices.length===2);
    return false;
  };

  return (
    <div style={{maxWidth:980,margin:"0 auto",padding:"80px 2rem 3rem",display:"flex",flexDirection:"column",gap:"1.25rem"}}>
      <div style={{textAlign:"center",paddingTop:".75rem",marginBottom:".5rem"}}>
        <h1 style={{fontFamily:"'Cinzel Decorative',serif",fontSize:"2rem",color:"var(--gold)",marginBottom:".4rem"}}>Forge Your Legend</h1>
        <p style={{color:"var(--silver)",fontStyle:"italic"}}>Build your hero using the SRD 5.1.1 rules</p>
      </div>
      <StepHeader/>
      <PreviewStrip/>
      {card(<>{step===0&&<StepIdentity/>}{step===1&&<StepRace/>}{step===2&&<StepClass/>}{step===3&&<StepAbilities/>}</>)}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <button className="btn btn-ghost" style={{padding:".55rem 1.25rem",fontSize:".68rem",visibility:step===0?"hidden":"visible"}} onClick={()=>setStep(s=>s-1)}>← Back</button>
        <div style={{fontSize:".68rem",color:"var(--rune)",fontFamily:"'Cinzel',serif",letterSpacing:".1em"}}>Step {step+1} of {STEPS.length}</div>
        {step<STEPS.length-1
          ? <button className="btn btn-gold" style={{padding:".55rem 1.25rem",fontSize:".7rem"}} onClick={()=>setStep(s=>s+1)} disabled={!canAdvance()}>{canAdvance()?`Next: ${STEPS[step+1]} →`:"Complete this step first"}</button>
          : <button className="btn btn-gold" style={{padding:".55rem 1.25rem",fontSize:".7rem"}} onClick={confirmStats} disabled={!canAdvance()}>{canAdvance()?"Enter the Tavern →":"Assign all stats first"}</button>
        }
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// LOBBY
// ─────────────────────────────────────────────────────────────────────────────
function LobbyView({ sessions, selectedSession, setSelectedSession, character, onJoin, onCreateChar }) {
  return (
    <div style={{maxWidth:1080,margin:"0 auto",padding:"80px 2rem 3rem"}}>
      <div style={{textAlign:"center",paddingBottom:"2rem"}}>
        <h1 style={{fontFamily:"'Cinzel Decorative',serif",fontSize:"2rem",color:"var(--gold)",marginBottom:".4rem"}}>The Tavern Board</h1>
        <p style={{color:"var(--silver)",fontStyle:"italic"}}>Choose your adventure — sessions start every 2 hours</p>
      </div>
      {!character.name&&(
        <div style={{background:"rgba(139,26,26,.15)",border:"1px solid var(--crimson)",padding:"1rem 1.5rem",marginBottom:"1.5rem",display:"flex",alignItems:"center",justifyContent:"space-between",gap:"1rem"}}>
          <span style={{fontFamily:"'Cinzel',serif",fontSize:".8rem"}}>⚠️ Create a character before joining</span>
          <button className="btn btn-crimson" style={{padding:".45rem .9rem",fontSize:".65rem"}} onClick={onCreateChar}>Create Character</button>
        </div>
      )}
      <div style={{display:"grid",gridTemplateColumns:"1fr 300px",gap:"1.75rem",alignItems:"start"}}>
        <div style={{display:"flex",flexDirection:"column",gap:"1rem"}}>
          {sessions.map(s=>(
            <div key={s.id} className={`session-card ${selectedSession?.id===s.id?"active":""}`} onClick={()=>setSelectedSession(s)}>
              <div>
                <div style={{fontFamily:"'Cinzel',serif",fontSize:".95rem",color:"var(--parchment)",marginBottom:".3rem"}}>{s.title}</div>
                <div style={{fontSize:".78rem",color:"var(--silver)",display:"flex",gap:"1rem",marginBottom:".55rem"}}>
                  <span>⚔️ {s.system}</span><span>👥 {s.players}/{s.maxPlayers}</span><span>🎯 Lv.{s.level}</span><span>{s.type}</span>
                </div>
                <div style={{display:"flex",gap:".4rem",flexWrap:"wrap"}}>
                  {s.tags.map(t=><span key={t} className="session-tag">{t}</span>)}
                  {s.available&&<span className="session-tag open">Open</span>}
                </div>
              </div>
              <div style={{textAlign:"right"}}>
                <div style={{fontFamily:"'Cinzel Decorative',serif",fontSize:"1.2rem",color:"var(--gold)"}}>{s.startIn}</div>
                <div style={{fontSize:".65rem",color:"var(--silver)",fontFamily:"'Cinzel',serif",letterSpacing:".1em"}}>until start</div>
              </div>
            </div>
          ))}
          {selectedSession&&(
            <div style={{display:"flex",gap:".9rem",marginTop:".5rem"}}>
              <button className="btn btn-gold" disabled={!character.name||!selectedSession.available} onClick={onJoin}>
                {!character.name?"Create Character First":!selectedSession.available?"Session Full":`Join ${selectedSession.title}`}
              </button>
              <button className="btn btn-ghost" onClick={onJoin} disabled={!character.name}>Quick Demo</button>
            </div>
          )}
        </div>
        <div style={{background:"var(--coal)",border:"1px solid var(--gold-dim)",padding:"1.4rem",position:"sticky",top:"5rem"}}>
          <div style={{fontFamily:"'Cinzel',serif",fontSize:".72rem",letterSpacing:".2em",color:"var(--gold)",marginBottom:"1.1rem"}}>⚔️ FORMING PARTY</div>
          {character.name&&(
            <div style={{display:"flex",alignItems:"center",gap:".6rem",padding:".6rem",background:"var(--slate)",border:"1px solid var(--gold-dim)",marginBottom:".4rem"}}>
              <div style={{width:32,height:32,background:"var(--ghost)",border:"1px solid var(--rune)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:".95rem"}}>{CLASSES.find(c=>c.name===character.charClass)?.emoji||"⚔️"}</div>
              <div><div style={{fontFamily:"'Cinzel',serif",fontSize:".75rem",color:"var(--parchment)"}}>{character.name} (You)</div><div style={{fontSize:".65rem",color:"var(--silver)"}}>{character.charClass} Lv.{character.level}</div></div>
            </div>
          )}
          {PARTY_MEMBERS.slice(0,selectedSession?2:0).map(m=>(
            <div key={m.name} style={{display:"flex",alignItems:"center",gap:".6rem",padding:".6rem",background:"var(--slate)",border:"1px solid var(--rune)",marginBottom:".4rem"}}>
              <div style={{width:32,height:32,background:"var(--ghost)",border:"1px solid var(--rune)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:".95rem"}}>{m.emoji}</div>
              <div style={{flex:1}}><div style={{fontFamily:"'Cinzel',serif",fontSize:".75rem",color:"var(--parchment)"}}>{m.name}</div><div style={{fontSize:".65rem",color:"var(--silver)"}}>{m.class}</div></div>
              <div style={{fontSize:".85rem"}}>{m.flag}</div>
            </div>
          ))}
          <div className="gold-line"/>
          <div style={{fontSize:".72rem",color:"var(--silver)",lineHeight:1.6}}>🌍 Auto-translation active for all players</div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// LANDING  ← EDIT 1: added onDemo prop + wired Watch Demo button
// ─────────────────────────────────────────────────────────────────────────────
function LandingView({ onPlay, onDemo }) {
  return (
    <div style={{paddingTop:60}}>
      <div className="hero">
        <p className="hero-eyebrow">✦ Powered by SRD 5.1 Creative Commons ✦</p>
        <div className="hero-sigil">⚔️</div>
        <h1 className="hero-title">TavernAI</h1>
        <h2 className="hero-sub">The World's First AI Dungeon Master</h2>
        <p className="hero-tag">Join adventurers from every corner of the globe. Your AI DM speaks every language, remembers every deed, and spins legendary tales — with a full battle map at the click of a button.</p>
        <div style={{display:"flex",gap:"1rem",flexWrap:"wrap",justifyContent:"center",marginBottom:"2.5rem"}}>
          <button className="btn btn-gold" onClick={onPlay}>Begin Your Adventure</button>
          {/* ← EDIT 2: Watch Demo now calls onDemo */}
          <button className="btn btn-ghost" onClick={onDemo}>Watch Demo</button>
        </div>
        <div style={{display:"flex",gap:"1.5rem",flexWrap:"wrap",justifyContent:"center"}}>
          {["🌍 Global Multiplayer","🗣️ Instant Translation","🎲 True 5e SRD","⏱️ Games Every 2 Hours","🗺️ Live Battle Maps","🧠 AI Dungeon Master"].map(b=>(
            <span key={b} style={{fontFamily:"'Cinzel',serif",fontSize:".65rem",letterSpacing:".15em",color:"var(--silver)",display:"flex",alignItems:"center",gap:".4rem"}}>{b}</span>
          ))}
        </div>
      </div>
      <div style={{padding:"4.5rem 2rem",maxWidth:1060,margin:"0 auto"}}>
        <div style={{textAlign:"center",marginBottom:"2.5rem"}}>
          <h2 style={{fontFamily:"'Cinzel Decorative',serif",fontSize:"1.8rem",color:"var(--gold)",marginBottom:".4rem"}}>How It Works</h2>
          <p style={{color:"var(--silver)",fontStyle:"italic"}}>Forge your legend in four steps</p>
        </div>
        <div className="feature-grid">
          {[
            {icon:"🧝",t:"Create Your Character",d:"Build a persistent 5e SRD character. Level up across any game, worldwide."},
            {icon:"🌐",t:"Join in Your Language",d:"Players speak and type in their native tongue. AI DM translates seamlessly."},
            {icon:"🎲",t:"AI DM Runs the Game",d:"Claude-powered DM manages narrative, rules, NPC voices, and world-building."},
            {icon:"🗺️",t:"Battle Map on Demand",d:"Switch to the full grid battle map mid-session. Fog of war, token movement, initiative tracker."},
            {icon:"⏱️",t:"Sessions Every 2 Hours",d:"Scheduled one-shots or long campaigns. Pick your slot, adventure whenever."},
            {icon:"⚖️",t:"100% Copyright Safe",d:"Built on SRD 5.1 under Creative Commons CC BY 4.0 — permanently open."},
          ].map(f=>(
            <div key={f.t} className="fcard">
              <div style={{fontSize:"1.9rem",marginBottom:".8rem"}}>{f.icon}</div>
              <div style={{fontFamily:"'Cinzel',serif",fontSize:".88rem",color:"var(--gold)",marginBottom:".65rem"}}>{f.t}</div>
              <div style={{color:"var(--silver)",fontSize:".86rem",lineHeight:1.65}}>{f.d}</div>
            </div>
          ))}
        </div>
      </div>
      <div style={{padding:"4.5rem 2rem",background:"var(--void)"}}>
        <div style={{textAlign:"center",marginBottom:"2.5rem"}}>
          <h2 style={{fontFamily:"'Cinzel Decorative',serif",fontSize:"1.8rem",color:"var(--gold)",marginBottom:".4rem"}}>Choose Your Path</h2>
          <p style={{color:"var(--silver)",fontStyle:"italic"}}>All tiers built on the free SRD 5.1 ruleset</p>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(210px,1fr))",gap:"1.4rem",maxWidth:980,margin:"0 auto"}}>
          {[
            {tier:"Adventurer",price:"Free",period:"forever",features:["2 sessions/month","1 character slot","Standard AI DM","Text only"],featured:false},
            {tier:"Hero",price:"$9.99",period:"per month",features:["Unlimited one-shots","3 character slots","Voice interaction","All languages","Battle maps"],featured:true},
            {tier:"Legend",price:"$19.99",period:"per month",features:["Unlimited everything","Long campaigns","Priority scheduling","Premium DM personas","Campaign archives"],featured:false},
            {tier:"Guild",price:"$49.99",period:"per month",features:["Party of up to 6","Shared campaigns","Custom DM persona","Homebrew marketplace","API access"],featured:false},
          ].map(p=>(
            <div key={p.tier} className={`price-card ${p.featured?"featured":""}`}>
              <div style={{fontFamily:"'Cinzel',serif",fontSize:".72rem",letterSpacing:".2em",color:"var(--gold)",textTransform:"uppercase",marginBottom:".4rem"}}>{p.tier}</div>
              <div style={{fontFamily:"'Cinzel Decorative',serif",fontSize:"2.3rem",color:"var(--parchment)",marginBottom:".2rem"}}>{p.price}</div>
              <div style={{fontSize:".78rem",color:"var(--silver)",marginBottom:"1.25rem"}}>{p.period}</div>
              <div className="gold-line"/>
              <ul className="price-features">{p.features.map(f=><li key={f}>{f}</li>)}</ul>
              <button className={`btn ${p.featured?"btn-gold":"btn-ghost"}`} style={{width:"100%",padding:".6rem"}}>{p.price==="Free"?"Start Free":"Subscribe"}</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ROOT APP
// ─────────────────────────────────────────────────────────────────────────────
export default function App() {
  const [view,            setView]            = useState("landing");
  const [lang,            setLang]            = useState("en");
  const [character,       setCharacter]       = useState({
    name:"", race:"Human", charClass:"Fighter", background:"Soldier",
    alignment:"Neutral Good", level:1, backstory:"", subrace:"",
    stats:{str:10,dex:10,con:10,int:10,wis:10,cha:10}, hp:12, maxHp:12,
  });
  const [selectedSession, setSelectedSession] = useState(null);
  const [gameMessages,    setGameMessages]    = useState([]);
  const [inputText,       setInputText]       = useState("");
  const [isTyping,        setIsTyping]        = useState(false);
  const [apiHistory,      setApiHistory]      = useState([]);
  const scrollRef = useRef(null);

  useEffect(()=>{
    if(scrollRef.current) scrollRef.current.scrollTop=scrollRef.current.scrollHeight;
  },[gameMessages,isTyping]);

  const startGame = useCallback(async()=>{
    const session=selectedSession||SESSIONS[0];
    setView("game");
    setGameMessages([{id:Date.now(),type:"system",text:`⚔️  Session Begin: ${session.title}  ⚔️`}]);
    setIsTyping(true);
    const opening=[{role:"user",content:"Begin the adventure. Set the scene with a compelling opening."}];
    setApiHistory(opening);
    try {
      const dm=await callDM(opening,character,session.title);
      setApiHistory([...opening,{role:"assistant",content:dm}]);
      setGameMessages(p=>[...p,{id:Date.now()+1,type:"dm",text:dm}]);
    } catch {
      setGameMessages(p=>[...p,{id:Date.now()+1,type:"dm",text:"The torchlight flickers as you gather at the entrance. Your adventure begins. What do you do?"}]);
    }
    setIsTyping(false);
  },[selectedSession,character]);

  // ← EDIT 3: startDemo — skips character creation, loads pre-built hero, jumps straight to game
  const startDemo = useCallback(async () => {
    const demoChar = DEMO_CHARACTER;
    const session  = SESSIONS[0];
    setCharacter(demoChar);
    setSelectedSession(session);
    setView("game");
    setGameMessages([{id:Date.now(),type:"system",text:`⚔️  Demo: ${session.title}  ⚔️`}]);
    setIsTyping(true);
    const opening=[{role:"user",content:"Begin the adventure. Set the scene with a compelling opening."}];
    setApiHistory(opening);
    try {
      const dm = await callDM(opening, demoChar, session.title);
      setApiHistory([...opening,{role:"assistant",content:dm}]);
      setGameMessages(p=>[...p,{id:Date.now()+1,type:"dm",text:dm}]);
    } catch {
      setGameMessages(p=>[...p,{id:Date.now()+1,type:"dm",text:"Torchlight flickers as you descend into the Sunken Citadel. Ancient stone walls loom around you, damp with centuries of darkness. Somewhere ahead, you hear the skittering of small claws on stone. What do you do?"}]);
    }
    setIsTyping(false);
  }, []);

  const sendMessage = useCallback(async(text, isDiceRoll=false)=>{
    if(!text?.trim()) return;
    if(isDiceRoll){
      setGameMessages(p=>[...p,{id:Date.now(),type:"system",text}]);
      return;
    }
    if(isTyping) return;
    setGameMessages(p=>[...p,{id:Date.now(),type:"player",text}]);
    setInputText("");
    setIsTyping(true);
    const hist=[...apiHistory,{role:"user",content:text}];
    setApiHistory(hist);
    try {
      const dm=await callDM(hist,character,selectedSession?.title||"The Adventure");
      setApiHistory([...hist,{role:"assistant",content:dm}]);
      setGameMessages(p=>[...p,{id:Date.now()+1,type:"dm",text:dm}]);
    } catch {
      setGameMessages(p=>[...p,{id:Date.now()+1,type:"dm",text:"The fates are momentarily silent… try again, brave adventurer."}]);
    }
    setIsTyping(false);
  },[isTyping,apiHistory,character,selectedSession]);

  if(view==="game") return (
    <>
      <style>{STYLES}</style>
      <GameView
        character={character} session={selectedSession||SESSIONS[0]}
        gameMessages={gameMessages} isTyping={isTyping}
        inputText={inputText} setInputText={setInputText}
        sendMessage={sendMessage} scrollRef={scrollRef}
        onLeave={()=>setView("lobby")}
      />
    </>
  );

  return (
    <div className="app">
      <style>{STYLES}</style>
      <nav className="top-nav">
        <div className="nav-logo" onClick={()=>setView("landing")}>⚔️ TavernAI</div>
        <div style={{display:"flex",alignItems:"center",gap:"1.25rem"}}>
          <select className="lang-sel" value={lang} onChange={e=>setLang(e.target.value)}>
            {LANGUAGES.map(l=><option key={l.code} value={l.code}>{l.flag} {l.name}</option>)}
          </select>
          {view!=="landing"&&<button className="nav-link" onClick={()=>setView("landing")}>Home</button>}
          {view!=="character"&&<button className="nav-link" onClick={()=>setView("character")}>Character</button>}
          {character.name&&view!=="lobby"&&<button className="nav-link" onClick={()=>setView("lobby")}>Sessions</button>}
          <button className="btn btn-gold" style={{padding:".45rem 1rem",fontSize:".65rem"}} onClick={()=>setView("character")}>
            {character.name?`${CLASSES.find(c=>c.name===character.charClass)?.emoji} ${character.name}`:"Create Character"}
          </button>
        </div>
      </nav>
      {view==="landing"&&<LandingView onPlay={()=>setView("character")} onDemo={startDemo}/>}
      {view==="character"&&<CharacterView character={character} setCharacter={setCharacter} onContinue={()=>setView("lobby")}/>}
      {view==="lobby"&&<LobbyView sessions={SESSIONS} selectedSession={selectedSession} setSelectedSession={setSelectedSession} character={character} onJoin={startGame} onCreateChar={()=>setView("character")}/>}
    </div>
  );
}
