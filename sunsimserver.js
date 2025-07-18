/*
 Node.js Serial Port Data to Web
 From: earl@microcontrollerelectronics.com
 https://microcontrollerelectronics.com/connecting-a-serial-port-to-the-web-via-node-js/
*/

var serport      = "";
var rate         = 38400;
var serports     = [];
var fs           = require('fs');
const SerialPort = require('serialport');
var portToUse;

var express = require('express'),
    app    = express(),
    server = require('http').Server(app),
    io     = require('socket.io')(server),
    port   = 8888;

server.listen(port, () => console.log('Server Listening on port' + port))

//app.use(express.static(__dirname));

app.get('*', function(req, res){
	let fileName = req.url;
	let fileOption = 'utf8';
	if (fileName == '' || fileName == '/')
		fileName = '/index.html';
	console.log(__dirname + fileName);
	if (fileName.indexOf(".jpg") != -1)
		fileOption = null;
	if (fileName.indexOf("portlist") != -1){
//		serports = [];
//		refreshSerports();
		res.end(JSON.stringify(serports));
		return;
	}
	if (fileName.indexOf("connect") != -1){
//		serports = [];
//		refreshSerports();
		connectPort(fileName.split('?')[1]);
		var message = {};
		message.connected = fileName.split('?')[1];
		message.success = true;
		res.end(JSON.stringify(message));
		return;
	}
	fs.readFile(__dirname + fileName,fileOption, function (err, data) {
		if (err) {
		  res.writeHead(500);
		  return res.end('Error loading index.html');
		}
		if (fileName.indexOf(".jpg") != -1){
			res.writeHead(200, {'Content-Type' : "image/jpg"});
			res.end(data);
		}
		else if (fileName.indexOf(".png") != -1){
			res.writeHead(200, {'Content-Type' : "image/png"});
			res.end(data);
		}
		else if (fileName.indexOf(".css") != -1){
			res.writeHead(200, {'Content-Type' : "text/html; charset=utf-8"});
			res.end(data);
		}
		else if (fileName.indexOf(".woff") != -1){
			res.writeHead(200, {'Content-Type' : "application/octet-stream; charset=utf-8"});
			res.end(data);
		}
		else{
			res.writeHead(200, {'Content-Type' : "text/html; charset=utf-8"});
			var result = data.replace("Node Serial Connection","Node Serial Connection " + serports[0]);
			res.end(result);
		}
		});
});

io.on('connection', onConnection);

var connectedSocket = null;
function onConnection(socket) {  
  connectedSocket = socket;
  connectedSocket.on('send', function (data) {
	if (data.Data.indexOf("%WRITEPROTOCOL") != -1){
		try {
			data = data.Data.split("%WRITEPROTOCOL ")[1];
			console.log("catch" + data);
			console.log(process.env);
			console.log(process.argv);
			let protfilename = process.argv[1].split("sunsimserver.js")[0];
			console.log(protfilename);
			protfilename += "protocol\\" ;
			console.log(protfilename);
			let names=data.split(',');
			let name = names[0] + names[1];
			protfilename += name.replaceAll(".","-").replaceAll(":","-")   + ".csv";
			console.log(protfilename);
			const fs = require('node:fs/promises');
			fs.writeFile(protfilename, data, { flag: 'a+' });
			console.log(data);
		}
		catch(e){
			console.log("Error writing protocol");
		}
	}
	else{	
		console.log(data);
		if(serport) serport.write(data.Data);
	}
  });
 }

if (process.argv.length > 2) {
  console.log(process.argv);
  serports.push(process.argv[2]);
  if (process.argv.length > 3) rate = parseInt(process.argv[3]);
}

SerialPort.list().then(ports => {
  ports.forEach(function(port) {
    if (typeof port['manufacturer'] !== 'undefined') {
      serports.push({"port":port.path, "manufacturer":port.manufacturer});
	  if ((port.manufacturer == 'Prolific') || (port.vendorId == '2341')
		  || (port.manufacturer == 'FTDI') ||  (port.vendorId == '0403'))
		  portToUse = port.path;
      console.log(port);
    }
  });
  if (serports.length == 0) {
    console.log("No serial ports found!");
//    process.exit();
  }
  if (true && portToUse != undefined){
	  connectPort(portToUse);
  }
});

function connectPort(portToUse){
  console.log('Connecting to: ', portToUse)
  serport = new SerialPort(/*serports[0]*/ portToUse, {  baudRate: rate })
  serport.on('error', function(err) {
    console.log('Error: ', err.message)
  })
  serport.on('data', function (data) {
    console.log(data.toString('utf8'));
    io.emit('data', { data: data.toString('utf8') });
  })
}