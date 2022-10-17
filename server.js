require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const bodyParser = require('body-parser');
const expect = require('chai');
const socket = require('socket.io');
const cors = require('cors');

const fccTestingRoutes = require('./routes/fcctesting.js');
const runner = require('./test-runner.js');

const app = express();

app.use('/public', express.static(process.cwd() + '/public'));
app.use('/assets', express.static(process.cwd() + '/assets'));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// helmet security
app.use(helmet.noSniff());
app.use(helmet.xssFilter());
app.use(helmet.noCache());
app.use(helmet.hidePoweredBy({ setTo: "PHP 7.4.3" }))

// Index page (static HTML)
app.route('/')
  .get(function (req, res) {
    res.sendFile(process.cwd() + '/views/index.html');
  }); 

//For FCC testing purposes
app.use(cors({origin: '*'}));
fccTestingRoutes(app);
    
// 404 Not Found Middleware
app.use(function(req, res, next) {
  res.status(404)
    .type('text')
    .send('Not Found');
});

const portNum = process.env.PORT || 3000;

// Set up server and tests
const server = app.listen(portNum, () => {
  console.log(`Listening on port ${portNum}`);
  if (process.env.NODE_ENV==='test') {
    console.log('Running Tests...');
    setTimeout(function () {
      try {
        runner.run();
      } catch (error) {
        console.log('Tests are not valid:');
        console.error(error);
      }
    }, 1500);
  }
});

// Socket.io Setup:
const Player = require('./public/Player');
const Collectible = require('./public/Collectible');
const {dimension} = require('./public/dimension');

const random = (max, min) => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

const getRandomPosition = () => {
  let x = random(dimension.minX + 50, dimension.maxX - 50);
  let y = random(dimension.minY + 50, dimension.maxY - 50);
  x = Math.floor(x/10) * 10;
  y = Math.floor(y/10) * 10;

  return [x, y]; 
}

let playersList = [];
let [cheeseX, cheeseY] = getRandomPosition();
let cheese = new Collectible({x:cheeseX, y:cheeseY,value:1, id:Date.now()});
let [catX,catY] = getRandomPosition();
let cat = new Player({x:catX,y:catY,value:1, id:Date.now()});
let connections = [];


const io = socket(server);
io.sockets.on('connection', socket => {
  console.log(`New connection ${socket.id}`);
  connections.push(socket);
  console.log('Connected: %s sockets connected.',connections.length);

  let [positionX,positionY] = getRandomPosition();
  let player = new Player({x:positionX,y:positionY,score:0,id:socket.id});

  playersList.push(player)

  socket.emit('init', {id: socket.id, players: playersList, cheese: cheese, cat:cat});
  
  //socket.broadcast.emit('new-player', new Plaobj);
  

  socket.on('update', (updatedUser) => {
      playersList.forEach(user => {
          if(user.id === socket.id){
              user.x = updatedUser.x;
              user.y = updatedUser.y;
              user.score = updatedUser.score;
              user.radius = updatedUser.radius;
          }
      });
      io.emit('update', {players: playersList,cat:cat,cheese:cheese,player: null});
  });


  

  socket.on('disconnect', () => {
    console.log(`deconnection ${socket.id}`);
    socket.broadcast.emit('remove-player', socket.id);
    connections.splice(connections.indexOf(socket), 1);
    playersList = playersList.filter(player => player.id !== socket.id);
    console.log('Disconnected: %s sockets connected.', connections.length);
  });
});

setInterval(tick, 1000/50); 
let vx = 2;
let vy = 2;
function tick() {
    // move the cat
    if(cat.x+ cat.radius > dimension.maxX) vx = -vx;
    if(cat.y+ cat.radius > dimension.maxY) vy = -vy;
    if(cat.x-cat.radius <= dimension.minX) vx = -vx;
    if(cat.y-cat.radius <= dimension.minY) vy = -vy;
    cat.x += vx;
    cat.y += vy;
    let playerUpdate = null;

    playersList.forEach(player => {
      if(cat.collision(player)) {
        let [positionX,positionY] = getRandomPosition();
        player.x = positionX;
        player.y = positionY;
        player.score = 0;
        player.radius = 30
        playerUpdate = player;

      }
      let p = new Player(player);
      if (p.collision(cheese)) {
        player.score += 1;
        player.radius +=10 
        let [cheeseX,cheeseY] = getRandomPosition();
        cheese = new Collectible({x:cheeseX,y:cheeseY,value:1, id:Date.now()})
        playerUpdate = player;

      }
    });


    io.emit('update', {
      players: playersList,
      cat:cat,
      cheese: cheese,
      player: playerUpdate
    });


}



module.exports = app; // For testing