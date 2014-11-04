var r = require('rethinkdb');

r.connect({
        host: 'localhost',
        port: 28015
}, function (err, conn) {
    r.dbCreate('pxscale_data')
        .run(conn, function (err) {
            var redirects, colors;
            
            conn.use("pxscale_data");
            
            r.tableCreate("redirects").run(conn, function (err, conn) {
                redirects = true;
                finish(redirects, colors);              
            });
            
            r.tableCreate("colors").run(conn, function (err, conn) {
                colors = true;
                finish(redirects, colors);
            });
        })
});

function finish() {
    var done = true;
    for (var argI in arguments) {
        var arg = arguments[argI];
        done = arg && done;
    }
    
    if (done) {
        console.log("Rethink is set up!")
        process.exit(0);
    }
}