var	r = require('rethinkdb');

exports.Db = function (config) {
	var table,
		connection;

	r.connect({
	    host: config.rethink_host,
	    port: 28015,
	    db: "pxscale_data"
	}, function (err, conn) {
		connection = conn;	
	});
	
	return {
		setTable: function (tableName) {
			table = r.table(tableName);
		},
		
		getImageData: function (data, cb) {
		    table
		    	.filter(data)
		    	.coerceTo('array').
		    	run(connection, function (err, result) {
			    	if (err) throw err;
			    	
			        var obj = result[0];
					cb(null, obj || {});
			    });	
		}, 
		
		updateImageData: function (data, newData, cb) {
			table
				.filter(data)
				.update(newData)
				.run(connection, function (err, result) {
					if (err) throw err;
					cb(null, result);
				});
		},
		
		setImageData: function (data, cb) {
		    table
		    	.insert(data, {returnChanges: true})
		    	.coerceTo('object')
		    	.run(connection, function (err, result) {
					if (err) throw err;
					cb(null, result.changes[0].new_val);
			    });
		}
	};
};