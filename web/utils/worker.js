var	socket = require('./socket'),
	secrets = require('./secrets'),
	config = require(['.', 'config', process.argv[2]].join('/')),
	Firebase = require('firebase'),
	colors = require('colors'),
	utils = require('./utils');
	
var Worker = function (profession) {
	var	self = this,
		rootRef = new Firebase('bucket.firebaseio.com/pxScale'),
		statusRef = rootRef.child('status/worker');
		
	self.profession = profession;
		
	rootRef.authWithCustomToken(secrets.FIREBASE_TOKEN, function (err) {
		if (err) throw err;
		
		statusRef.child(profession).set("online");
		statusRef.child(profession).onDisconnect().set("offline");
	
		self.initialize();
	});
}

Worker.prototype.initialize = function () {
	var self = this;
	
	if (typeof self.init == "function") self.init.call(self);
	
	socket.Client("127.0.0.1", config.work_port).then(function (socket) {
		self.boss = socket;
		self.boss.on('data', function(rData) {
			var data = JSON.parse(rData);
			
			if (data.type == 'handshake') {
				self.boss.say({
					profession: self.profession
				});
				console.log("Worker ready!".rainbow);
			} else if (data.type == 'job') {
				self.work.call(self, data, function (err) {
					var results = Array.prototype.slice.call(arguments, 1);

					if (err) {
						self.boss.say({
							id: data.id,
							status: 'error',
							error: err
						});	
						
						if (err.files)
							utils.cleanUp(err.files);
					} else {
			    		self.boss.say({
			    			id: data.id, 
			    			status: "complete", 
			    			results: results
			    		});
					}
				});
			}
		});
	});
}

exports.Worker = Worker;