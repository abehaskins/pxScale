var utils = require('./utils'),
	socket = require('./socket'),
	secrets = require("../config/secrets"),
	colors = require('colors'),
	copy = require('copy'),
	_ = require('lodash');
	
var Boss = function (config) {
	var self = this;
	self.workers = {},
	self.pendingJobs = {},
	self.server = socket.Server("127.0.0.1", config.work_port);
	self.callbacks = {};
	
	// Watch for new worker connections
	self.server.on("connection", function (socket) {
		var workerData, worker = socket;
	
		worker.id = utils.getUniqueID();
		
		worker.say = (function (obj) {
			this.write(JSON.stringify(obj));
		}).bind(worker);
		
		worker.say({
			type: 'handshake',
			id: worker.id
		});
		
		worker.on("close", function () {
			console.log("Worker died!".bgRed);
			delete self.workers[workerData.profession][worker.id];
		});
		
		worker.once("data", function (rData) {
			workerData = JSON.parse(rData);
			console.log("Worker born!".bgGreen);
			
			(self.workers[workerData.profession] || (self.workers[workerData.profession] = {}))
				[worker.id] = worker;
			
			worker.on("data", function () {	
				self.processIncoming.apply(self, Array.prototype.slice.call(arguments));
			});
		});
	});	
}

Boss.prototype.processIncoming = function (rData) {
	var self = this,
		jobResults = JSON.parse(rData),
		jobInfo = this.pendingJobs[jobResults.id];
		console.log(jobInfo)
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
		job = copy(suppliedJob),
		jobId = suppliedJobID || utils.getUniqueID(),
		worker = _(this.workers[profession]).sample(1).value()[0];
	
	job.type = "job";
	job.id = jobId;
	job.profession = profession;
	
	if (!worker) {
		console.log(("No workers of type '" + profession + "' known!").bgRed);
		self.callbacks[profession].error(job, job.id, "download_failed");
		return;
	}
	
	self.pendingJobs[jobId] = job;
	worker.say(job);
}

Boss.prototype.on = function (profession, successCb, errorCb) {
	var self = this;
	
	self.callbacks[profession] = {
		success: successCb,
		error: errorCb
	};
}

exports.Boss = Boss;