var	r = require('rethinkdb'),
	table = r.table("images"),
	connection;
	
r.connect({
    host: 'db',
    port: 28015,
    db: "pxscale_data"
}, function (err, conn) {
	connection = conn;	
});
	
module.exports = {
	getImageData: function (data, cb) {
	    table.filter(data).coerceTo('array').run(connection, function (err, result) {
	        var obj = result[0];
			cb(null, obj || {});
	    });	
	}, 
	
	updateImageData: function (data, newData, cb) {
		table.filter(data).update(newData).run(connection, function (err, result) {
			console.log(result)	
			cb(null, result);
		});
	},
	
	setImageData: function (data, cb) {
	    table.insert(data).coerceTo('object').run(connection, function (err, result) {
	       table.get(result.generated_keys[0]).run(connection, function (err, result) {
	          cb(null, result);
	       });
	    });
	}
};