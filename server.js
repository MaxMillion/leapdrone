(function() {
  var express, path, drone, server, app, faye, client;

  express = require("express");
  path = require("path");
  faye = require('faye');
  drone = require("ar-drone").createClient();
  app = express();
  app.configure(function() {
  	app.set('port', process.env.PORT || 3001); // process.env.PORT adjusts PORT to accept environmental parameter (ie deploying to Heroku)
  	app.use(app.router);  // optimizes performance when put before static, but isn't necessary as express will implicity add.  Putting before static prevents accidentally-named static files from overwriting routes
    app.use(express.static(__dirname + '/public'));  // serves static files from disk
    return app.use("/bower_components", express.static(path.join(__dirname, 'bower_components'))); // adds in jQuery
  });

  server = require('http').createServer(app);

  var bayeux = new faye.NodeAdapter({  // central messaging server for clients to communicate with one another; Can also add 'engine' property, which controls backend of the server (ie faye-redis) and 'ping' property, which is how often, in seconds, to send keep-alive ping messages over WebSocket and EventSource connections. Used if Faye server will be accessed through a proxy that kills idle connections.
    mount: '/faye', // path on the host at which the Faye service is available (ie http://localhost:3001/faye).
    timeout: 45  // maximum time to hold connection open before returning response. Given in seconds and must be smaller than timeout on frontend webserver. 
  }); 

  bayeux.attach(server); // attached to server; will handle all requests to paths matching the mount path and delegate all other requests to handlers.

  client = new faye.Client("http://localhost:" + (app.get("port")) + "/faye", {}); // sets up new client at environmental port that accesses the server at the /faye mount 

  client.subscribe("/drone/move", function(d) {
    console.log(d)
    return drone[d.action](d.speed);
  });

  client.subscribe("/drone/drone", function(d) {
    console.log(d)
    if (typeof d.action === 'function') { // handles takeoff and landing
      return drone[d.action](d.speed);
    } else {
      return void 0; // takeoff and landing are not functions, so need to return undefined.  Void 0 ensures that returns as undefined, as undefined can be accidentally changed
    }
  });

  server.listen(app.get('port'), function() {
  	return console.log("Express server listening on port" + app.get("port"));
  })

}).call(this);
