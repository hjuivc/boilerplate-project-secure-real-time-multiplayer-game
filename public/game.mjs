import Player from './Player.mjs';
import Collectible from './Collectible.mjs';
import { dimension } from './dimension.mjs';

const socket = io();


let tick;
let playersList = [];
let cheeseEntity;
let playerEntity;
let catEntity;


const canvas = document.getElementById('game-window');
const context = canvas.getContext('2d');


let meImage = new Image();
let otherImage = new Image();
let cheeseImage = new Image();
let catImage = new Image();

const init = () => {
  // get images
  meImage.src = 'public/img/mouse.png';
  otherImage.src = 'public/img/white.png';
  cheeseImage.src = 'public/img/cheese.jpg';
  catImage.src = 'public/img/cat.png';
  
  // create user
  socket.on('init', ({ id, players, cheese, cat }) => {
    console.log(id, players,cheese,cat);
    cheeseEntity = new Collectible(cheese);
    playerEntity = players.filter(x => x.id === id)[0];
    playerEntity = new Player(playerEntity);
    catEntity = new Player(cat);
  
    playersList = players


    document.onkeydown = e => {
      let  dir = null
      switch(e.keyCode) {
        case 87:
        case 38:
           dir = 'up';
           break;
        case 83:
        case 40:
           dir = 'down';
           break;
        case 65:
        case 37:
           dir = 'left';
           break;
        case 68:
        case 39:
           dir = 'right';
           break;   
      }
      if (dir) {
        playerEntity.movePlayer(dir, 10);
        socket.emit('update', playerEntity);
      }
    }
  
    // update
    socket.on('update', ({players:players,cat:cat,cheese:cheese,player:player}) => {
      catEntity = new Player(cat)
      playersList = players;
      cheeseEntity = new Collectible(cheese)
      if (player) {
        if (player.id === playerEntity.id) {
          playerEntity= new Player(player);
        }
      }
      
    });
  
  });
  
  window.requestAnimationFrame(update); 
}

const update = () => {

  context.clearRect(0, 0, canvas.width, canvas.height);

  // Set background color
  context.fillStyle = '#FFFFFF';
  context.fillRect(0, 0, canvas.width, canvas.height);

  // Create border for play field
  context.strokeStyle = '#000000';
  context.strokeRect(dimension.minX, dimension.minY, dimension.arenaSizeX, dimension.arenaSizeY);

  // Game title
  context.fillStyle = '#000000';
  context.font = `40px 'Modak'`;
  context.fillText('Escape the cat & get fat', 30, 40);

  if (playerEntity) {
    playerEntity.draw(context,meImage);
    context.font = `26px 'Modak'`;
    context.fillText(playerEntity.calculateRank(playersList), 500, 40);
    playersList.forEach((player) => {
       if (player.id !== playerEntity.id) {
         let p = new Player(player);
         p.draw(context, otherImage);
       }
    });
    if (cheeseEntity) {
      cheeseEntity.draw(context,cheeseImage);
    }
    if (catEntity) {
      catEntity.draw(context,catImage);
    }
  }

 
  tick = requestAnimationFrame(update);
}

init();