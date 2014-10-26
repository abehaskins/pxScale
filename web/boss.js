var utils = require('./utils'),
	socket = require('./socket'),
	secrets = require("./secrets"),
	colors = require('colors'),
	copy = require('copy'),
	config = require(['.', 'config', process.argv[2]].join('/'));
	
var Boss = function () {
	var self = this;
	self.workers = {},
	self.pendingJobs = {},
	self.server = socket.Server("127.0.0.1", config.work_port);
	self.callbacks = {};
	
	// Watch for new worker connections
	self.server.on("connection", function (socket) {
		var worker = socket;
	
		worker.id = utils.getUniqueID();
		
		worker.say = (function (obj) {
			this.write(JSON.stringify(obj));
		}).bind(worker);
		
		worker.say({
			type: 'handshake',
			id: worker.id
		});
		
		worker.once("data", function (rData) {
			var data = JSON.parse(rData);
			
			(self.workers[data.profession] || (self.workers[data.profession] = []))
				.push(worker);
			
			worker.on("data", function () {	
				self.processIncoming.apply(self, Array.prototype.slice.call(arguments));
			});
		});
	});	
}

Boss.prototype.processIncoming = function (rData) {
	var self = this,
		jobResults = JSON.parse(rData),
		jobInfo = this.pendingJobs[jobResults.id],
		jobProfession = jobInfo.profession;
		
	delete jobInfo.profession;
	delete jobInfo.type;
	delete jobInfo.id;
	
	if (!self.pendingJobs[jobResults.id]) return;
	delete self.pendingJobs[jobResults.id];
	
	if (jobResults.status == "complete") {
		console.log(["Job ID /", jobProfession, ":", jobResults.id, "-", jobResults.status].join(' ').green);
		
		self.callbacks[jobProfession].success(jobInfo, jobResults.id, jobResults.results);
	}
	
	if (jobResults.status == "error") {
		console.log(["Job ID /", jobProfession, ":", jobResults.id, "-", jobResults.status].join(' ').red);
		console.error(jobResults.error.red);
		
		self.callbacks[jobProfession].error(jobInfo, jobResults.id, jobResults.error);
	}
}

Boss.prototype.demand = function (profession, suppliedJob, suppliedJobID) {
	var self = this,
		job = copy(suppliedJob);
	
	if (!self.workers[profession] || !self.workers[profession].length) {
		console.log(("No workers of type '" + profession + "' known!").bgRed);
		return;
	}

	var	scaleWorkerId = Math.floor(self.workers[profession].length*Math.random()),
		jobId = suppliedJobID || utils.getUniqueID();
	
	job.type = "job";
	job.id = jobId;
	job.profession = profession;
	
	self.pendingJobs[jobId] = job;
	self.workers[profession][scaleWorkerId].say(job);
}

Boss.prototype.on = function (profession, successCb, errorCb) {
	var self = this;
	
	self.callbacks[profession] = {
		success: successCb,
		error: errorCb
	};
}

exports.Boss = Boss;