var http = require("https");
var drone_stream = require('dronestream');  
var Primus = require('primus')
var os = require('os');
var fs = require('fs');
var arDrone = require('ar-drone');
var crypto = require('crypto')

var port = 1313;
var options = {
  key: fs.readFileSync('./cert/key.pem'),
  cert: fs.readFileSync('./cert/cert.pem')
};

var imageSendingPaused = false;
var currentImg         = null;
var track_on           = false;
var track_color        = null;
var interfaces         = os.networkInterfaces();
var addresses           = [];
for (var k in interfaces) {
    for (var k2 in interfaces[k]) {
        var address = interfaces[k][k2];
        if (address.family === 'IPv4' && !address.internal) {
            addresses.push(address.address);
        }
    }
}

var server = http.createServer(options, function(req, res) {
  var url = req.url;
  var reg = /\/image\/.+/;
  switch (true) {
    case url=="/" :
      fs.createReadStream(__dirname + "/index2.html").pipe(res);
      break;
    case url=="/public/jquery-1.11.3.min.js" :
      fs.createReadStream(__dirname + "/public/jquery-1.11.3.min.js").pipe(res);
      break;
    case url=="/public/annyang.min.js" :
      fs.createReadStream(__dirname + "/public/annyang.min.js").pipe(res);
      break;
    case url=="/public/default.jpg" :
      fs.createReadStream(__dirname + "/public/default.jpg").pipe(res);
      break;
    case url=="/public/nodecopter-client.js" :
      fs.createReadStream(__dirname + "/public/nodecopter-client.js").pipe(res);
      break;
    case url=="/build/tracking-min.js" :
      fs.createReadStream(__dirname + "/build/tracking-min.js").pipe(res);
      break;
    case reg.test(url) :
      if (currentImg) {
        res.writeHead(200, {
          "Content-Type": "image/png"
        });
        res.end(currentImg, "binary");
      } else {
        fs.createReadStream(__dirname + "/public/default.jpg").pipe(res);
      }
      break;
    default : 
      break;
  }
  // fs.createReadStream(__dirname + "/index2.html").pipe(res);
});

//---------------------------------------------------------
var client = arDrone.createClient();
client.on('navdata', function(data) {
  for (var i = socket_list.length - 1; i >= 0; i--) {
    socket_list[i].write({
      "switch": 'nav_data',
      "data"  : data
    })
  };
});
client.getPngStream().on("data", function(frame) {
  currentImg = frame;
  if (imageSendingPaused)
    return;

  for (var i = socket_list.length - 1; i >= 0; i--) {
    socket_list[i].write({
      "switch": 'image',
      "data"  : "/image/" + ~~(Math.random()*10000)
    })
  };
  imageSendingPaused = true;
  setTimeout((function() {
    imageSendingPaused = false;
  }), 100);
});
//---------------------------------------------------------
var primus = new Primus(server, { transformer: 'socket.io' });
var socket_list = [];
var speed = 0.5;
var animate_duration = 500;
primus.on('connection', function(socket) {
  socket_list.push(socket);
  socket.on('data', function(data) {
    if (!data.switch)
      return
    if (data.switch == 'track') {
      if (!track_on || data.color != track_color)
        return
      magic_fly(data.x, data.y, data.square, client);      
      track_on = false
      return
    }
    switch (data.command) {
      case 'start' :
        client.takeoff();
        break;
      case 'stop' :
        client.stop();
        client.land();
        break;
      case 'reset' :
        client.disableEmergency();
        break;
      case 'left' :
        client.stop();
        client.left(speed);
        stop_after(data.options[0]);
        break;
      case 'right' :
        client.stop();
        client.right(speed);
        stop_after(data.options[0]);
        break;
      case 'down' :
        client.stop();
        client.down(speed);
        stop_after(data.options[0]);
        break;
      case 'up' :
        client.stop();
        client.up(speed);
        stop_after(data.options[0]);
        break;
      case 'front' :
        client.stop();
        client.front(speed);
        stop_after(data.options[0]);
        break;
      case 'back' :
        client.stop();
        client.back(speed);
        stop_after(data.options[0]);
        break;
      case 'rotate' :
        client.stop();
        client.clockwise(speed);
        stop_after(data.options[0]);
        break;
      case 'flip_left' :
        client.stop();
        client.animate('flipLeft', animate_duration);
        stop_after(1);
        break;
      case 'flip_right' :
        client.stop();
        client.animate('flipRight', animate_duration);
        stop_after(1);
        break;
      case 'flip_front' :
        client.stop();
        client.animate('flipAhead', animate_duration);
        stop_after(1);
        break;
      case 'flip_back' :
        client.stop();
        client.animate('flipBehind', animate_duration);
        stop_after(1);
        break;
      case 'dance' :
        client.stop();
        client.after(500, function(){
          this.stop();
          this.animate('turnaround', 1500);
        })
        .after(2000, function(){
          this.stop();    
          this.animate('turnaroundGodown', 1500);
        })
        .after(2000, function(){
          this.stop();    
          this.animate('yawShake', 1500);
        })
        .after(2000, function(){
          this.stop();    
          this.animate('yawDance', 1500);
        })
        .after(2000, function(){
          this.stop();    
          this.animate('phiDance', 1500);
        })
        .after(2000, function(){
          this.stop();    
          this.animate('thetaDance', 1500);
        })
        .after(2000, function(){
          this.stop();    
          this.animate('vzDance', 1500);
        })
        .after(2000, function(){
          this.stop();    
          this.animate('wave', 1500);
        })
        .after(2000, function(){
          this.stop();    
          this.animate('phiThetaMixed', 1500);
        })
        .after(1500, function() {
          this.stop()
        })
        break;
      case 'track_color' :
        console.log("##############################", data);
        client.stop();
        track_color = data.options[0];
        track_on = true
        break;
      default :
        console.log('##UPS',data);
        break;

    };
  });
});
timeout = null;
function stop_after(second) {
  if (timeout)
    clearTimeout(timeout)
  // console.log('timeout',second*1000);
  timeout = setTimeout(function() {
    timeout = null
    client.stop()
  }, second*1000);
};

// SOMETHING ELSE
var is_magic = false;
function magic_fly(center_x, center_y, square, drone) {
  console.log('--###', center_x, center_y, square, is_magic)
  if (is_magic)
    return
  drone.stop();
  setTimeout(function(){
    is_magic = true;
    // drone.front(0.5);
    console.log('wave')
    // drone.animate('wave', 2000);
    drone.clockwise(0.8)
    setTimeout(function(){
      drone.stop();
    }, 2500)
    // stop_after(1);
    is_magic = false;
    // actionEvent(center_x, center_y, square, drone);
  }, 500)
}


function actionEvent(x1, y1, size1, drone){
  var count = 1;
  var xCoordinate = 640;
  var yCoordinate = 360;
  var size = 1;
  var error = 0.1;
  var xMax = 320;
  var yMax = 240;
  var zMax = 500;
  var sizeMax = yMax * xMax / 1e4;

  console.log(sizeMax);

  var reader = {xCenter:0, yCenter:0, sizeImage:100};
  reader.xCenter = x1;
  reader.yCenter = y1;
  reader.sizeImage = size1;

  console.log(arguments);
  console.log("start");

  var action = {x:0, y:0, z:0, size:0};

  var dx = reader.xCenter - xCoordinate;
  var dy = reader.yCenter - yCoordinate;
  var dSize = Math.sqrt(Math.abs(reader.sizeImage - size));

  if(((dx)/xMax > error) || (((-dx)/xMax > error))){
      action.x = dx;
  }

  if(((dy)/yMax > error) || (((-dy)/yMax > error))){
      action.y = dy;
  }

  if(((dSize)/sizeMax > error) || (((-dSize)/sizeMax > error))){
    action.size = dSize;
  }

  //if(action.size !== 0.0){
    action.z = Math.round((Math.sqrt(reader.sizeImage)/2 - Math.sqrt(size)/2)) ;
  //}

    drone.actions = [];
    command = {
      time : 300,
      action : function() {
        this.stop();
        console.log("stop");
      } 
    };
      drone.actions.push(command);
    
  if(action.x < 0){
    command = {
      time : 300,
      action : function() {
        this.up(0.1);
        console.log("up");
      } 
    };
    drone.actions.push(command);
    command = {
      time : Math.round(Math.abs(action.x/xMax)*1000*count),
      action : function() {
        this.stop();
        console.log("stop");
      } 
    };
      drone.actions.push(command);
   }else if(action.x > 0){
    command = {
      time : 300,
      action : function() {
        this.down(0.1);
        console.log("down");
      } 
    };
    drone.actions.push(command);
    command = {
      time : Math.round(Math.abs(action.x/xMax)*2500*count),
      action : function() {
        this.stop();
        console.log("stop");
      } 
    };
      drone.actions.push(command);
   } 

   
  //console.log(action.z + "z");
   if(action.z < 0){  
    command = {
      time : 300,
      action : function() {
        
        //this.front(0.1);
        console.log("back");
        this.back(0.1);
      } 
    };
    drone.actions.push(command);
    command = {
      time : Math.round(Math.abs(action.z/zMax)*500000*count),
      action : function() {
        this.stop();
        console.log("stop");
      } 
    };
    
    drone.actions.push(command);
   }else if(action.z > 0){
     command = {
      time : 300,
      action : function() {
        //this.back(0.1);
        console.log("front");
        this.front(0.1);
      } 
    };
    
    drone.actions.push(command);
    command = {
      time : Math.round(Math.abs(action.z/zMax)*1000000*count),
      action : function() {
        this.stop();
        console.log("stop");
      } 
    };
    
    drone.actions.push(command);
    //console.log("asdasdasd" + Math.round(Math.abs(action.z/zMax)*1000000));
  }
   

  if(action.y < 0){
    command = {
      time : 300,
      action : function() {
        this.left(0.1);
        console.log("left");
      } 
    };
    drone.actions.push(command);
    command = {
      time : Math.round(Math.abs(action.y/yMax)*500*count),
      action : function() {
        this.stop();
        console.log("stop");
      } 
    };
      drone.actions.push(command);
  }else if(action.y > 0){
    command = {
      time : 300,
      action : function() {
        this.right(0.1);
        console.log("right");
      } 
    };
    drone.actions.push(command);
    command = {
      time : Math.round(Math.abs(action.y/yMax)*10000*count),
      action : function() {
        this.stop();
        console.log("stop");
      } 
    };
      drone.actions.push(command);
  }
   command = {
      time : 1000*count,
      action : function() {
        this.land();
        console.log("land");
      } 
    };
    
    drone.actions.push(command);
    drone.actions.push(command);
  console.log(action);

  var prevCom;
  prevCom = drone.actions[0].action.bind(client);
  var startDate = Date.now();
  var executeSeq = function() {
    var curCom;
    if (curCom = drone.actions.shift()) {
      prevCom();
      console.log("Time glob: " + (Date.now() - startDate));
      prevCom = curCom.action.bind(client);
      setTimeout(executeSeq, curCom.time);
    }
    return;
  }
  executeSeq();
    
  console.log("finish");
}
// drone_stream.listen(server);
server.listen(port);
console.log("Server run", addresses, port)